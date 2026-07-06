import crypto from 'crypto';
import Stripe from 'stripe';
import { TRPCError } from '@trpc/server';
import { env } from '../../../env';
import { BaseController } from '../../lib/base.controller';
import { DonationsRepo } from './repositories/donations.repo';
import { DonationPeriodsRepo } from './repositories/periods.repo';
import { DonationPledgesRepo } from './repositories/pledges.repo';
import { SettingsRepo } from '../settings/repositories/settings.repo';
import { hashToken } from '../../lib/token-hash';
import type { Models } from '../../../../../../libs/common/src/lib/kysely.models';
import { WorkflowsController } from '../workflows/controller';
import type { Selectable } from 'kysely';
import { logger } from '../../logger';

// The webhook token routes an inbound Stripe webhook to the right tenant. It is stored hashed and
// shown to the user only once, at generation (SECURITY-REVIEW.md 2.4) — same posture as the Zapier
// API key. (Stripe's signature is the primary authenticator; this token is the tenant selector.)
const WEBHOOK_TOKEN_KEY = 'donations.webhook_token';

export class DonationsController extends BaseController<'donations', DonationsRepo> {
  private settingsRepo = new SettingsRepo();
  private periodsRepo = new DonationPeriodsRepo();
  private pledgesRepo = new DonationPledgesRepo();

  constructor() {
    super(new DonationsRepo());
  }

  /** Whether a webhook token has been generated for this tenant. The token itself is never
   * returned after creation — only its hash is stored (SECURITY-REVIEW.md 2.4). */
  public async getWebhookTokenStatus(tenantId: string): Promise<{ configured: boolean }> {
    const row = await this.settingsRepo.getByKey({ tenant_id: tenantId, key: WEBHOOK_TOKEN_KEY });
    return { configured: !!row?.value };
  }

  /** Generate a new webhook token, persist ONLY its hash, and return the plaintext once so the
   * caller can show the user the webhook URL to paste into Stripe. Any previous token is invalidated. */
  public async regenerateWebhookToken(tenantId: string, userId: string): Promise<{ token: string }> {
    const token = 'wt_' + crypto.randomBytes(24).toString('hex');
    // upsertMany JSON.stringifies the value, so the stored column becomes JSON.stringify(hash) —
    // exactly what the webhook route below looks up by.
    await this.settingsRepo.upsertMany({
      tenant_id: tenantId,
      user_id: userId,
      entries: [{ key: WEBHOOK_TOKEN_KEY, value: hashToken(token) }],
    });
    return { token };
  }

  public async getPersonDonationsList(tenantId: string, personId: string) {
    return this.getRepo().getPersonDonationsList(tenantId, personId);
  }

  public async getPersonCumulativeDonations(tenantId: string, personId: string, year: number): Promise<number> {
    return this.getRepo().getPersonCumulativeDonations(tenantId, personId, year);
  }

  public async getTenantDonationsList(tenantId: string) {
    return this.getRepo().getTenantDonationsList(tenantId);
  }

  // ── Donation Periods ────────────────────────────────────────────────────────

  public async getDonationPeriods(tenantId: string) {
    return this.periodsRepo.getAllForTenant(tenantId);
  }

  public async createDonationPeriod(
    tenantId: string,
    userId: string,
    payload: { name: string; start_date: string; end_date?: string | null; limit_amount: number },
  ) {
    return this.periodsRepo.db
      .insertInto('donation_periods')
      .values({
        tenant_id: tenantId,
        name: payload.name,
        start_date: payload.start_date,
        end_date: payload.end_date ? (payload.end_date as any) : null,
        limit_amount: payload.limit_amount,
        is_active: true,
        createdby_id: userId,
        updatedby_id: userId,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  public async updateDonationPeriod(
    tenantId: string,
    userId: string,
    id: string,
    payload: {
      name?: string;
      start_date?: string;
      end_date?: string | null;
      limit_amount?: number;
      is_active?: boolean;
    },
  ) {
    const set: any = { updatedby_id: userId, updated_at: new Date() };
    if (payload.name !== undefined) set.name = payload.name;
    if (payload.start_date !== undefined) set.start_date = payload.start_date;
    if ('end_date' in payload) set.end_date = payload.end_date ?? null;
    if (payload.limit_amount !== undefined) set.limit_amount = payload.limit_amount;
    if (payload.is_active !== undefined) set.is_active = payload.is_active;

    return this.periodsRepo.db
      .updateTable('donation_periods')
      .set(set)
      .where('id', '=', id)
      .where('tenant_id', '=', tenantId)
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  public async deleteDonationPeriod(tenantId: string, id: string) {
    await this.periodsRepo.db
      .deleteFrom('donation_periods')
      .where('id', '=', id)
      .where('tenant_id', '=', tenantId)
      .execute();
  }

  // ── Pledges ─────────────────────────────────────────────────────────────────

  public async getTenantPledgesList(tenantId: string) {
    return this.pledgesRepo.getAllForTenant(tenantId);
  }

  public async getPersonPledges(tenantId: string, personId: string) {
    return this.pledgesRepo.getForPerson(tenantId, personId);
  }

  public async cancelPledge(tenantId: string, pledgeId: string, userId: string) {
    const pledge = await this.pledgesRepo.db
      .selectFrom('donation_pledges')
      .selectAll()
      .where('id', '=', pledgeId)
      .where('tenant_id', '=', tenantId)
      .executeTakeFirst();

    if (!pledge) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Pledge not found.' });
    }

    // Cancel in Stripe if there's a real subscription
    if (pledge.stripe_subscription_id && !pledge.stripe_subscription_id.startsWith('sub_mock_')) {
      const tenantStripeKey =
        (await this.getSettingVal(tenantId, 'donations.stripe_secret_key')) || env.stripeSecretKey;
      if (tenantStripeKey) {
        const stripe = new Stripe(tenantStripeKey);
        try {
          await stripe.subscriptions.cancel(pledge.stripe_subscription_id);
        } catch (err) {
          logger.error({ err }, 'Stripe subscription cancel failed');
        }
      }
    }

    return this.pledgesRepo.db
      .updateTable('donation_pledges')
      .set({
        status: 'cancelled',
        cancelled_at: new Date(),
        updatedby_id: userId,
        updated_at: new Date(),
      })
      .where('id', '=', pledgeId)
      .where('tenant_id', '=', tenantId)
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private async getSettingVal(tenantId: string, key: string): Promise<any> {
    const row = await this.settingsRepo.getByKey({ tenant_id: tenantId, key });
    return row?.value;
  }

  public calculateTaxCredit(
    amountCents: number,
    cumulativeBeforeCents: number,
    tiers: Array<{ limit: number; rate: number }>,
  ): number {
    if (!tiers || tiers.length === 0) return 0;

    const sortedTiers = [...tiers].sort((a, b) => a.limit - b.limit);
    let creditCents = 0;
    let remainingAmount = amountCents;
    let currentCumulative = cumulativeBeforeCents;

    for (const tier of sortedTiers) {
      const tierLimitCents = tier.limit * 100;

      if (currentCumulative < tierLimitCents && remainingAmount > 0) {
        const availableInTier = tierLimitCents - currentCumulative;
        const amountInTier = Math.min(remainingAmount, availableInTier);

        creditCents += amountInTier * tier.rate;
        remainingAmount -= amountInTier;
        currentCumulative += amountInTier;
      }
    }

    return Math.round(creditCents);
  }

  /**
   * Resolve the active limit window for the tenant.
   * Returns { limitCents, cumulative } using the donation_period if one is active,
   * or falling back to the legacy calendar-year setting.
   */
  private async resolveLimitWindow(
    tenantId: string,
    personId: string,
  ): Promise<{ limitCents: number; cumulative: number; periodName: string | null }> {
    const activePeriod = await this.periodsRepo.getActivePeriodForToday(tenantId);

    if (activePeriod) {
      const cumulative = await this.getRepo().getPersonCumulativeDonationsForPeriod(
        tenantId,
        personId,
        new Date(activePeriod.start_date),
        activePeriod.end_date ? new Date(activePeriod.end_date) : null,
      );
      return {
        limitCents: Number(activePeriod.limit_amount),
        cumulative,
        periodName: activePeriod.name,
      };
    }

    // Fallback: calendar year + legacy settings
    const limitVal = await this.getSettingVal(tenantId, 'donations.limit');
    const limitSetting = limitVal !== undefined && limitVal !== null ? Number(limitVal) : 1000;
    const currentYear = new Date().getFullYear();
    const cumulative = await this.getRepo().getPersonCumulativeDonations(tenantId, personId, currentYear);
    return { limitCents: limitSetting * 100, cumulative, periodName: null };
  }

  /**
   * Perform eligibility checks based on limit and residency restrictions.
   * For recurring donations, pass monthlyAmountCents and remainingMonths to enforce
   * the total commitment against the period limit.
   */
  public async checkEligibility(
    tenantId: string,
    personId: string,
    amountCents: number,
    address: { country?: string; state?: string },
    options?: { isRecurring?: boolean; remainingMonths?: number },
  ) {
    const { limitCents, cumulative, periodName } = await this.resolveLimitWindow(tenantId, personId);

    // For recurring: check total commitment (monthly × remaining months) against limit
    const effectiveAmount =
      options?.isRecurring && options?.remainingMonths ? amountCents * options.remainingMonths : amountCents;

    if (cumulative + effectiveAmount > limitCents) {
      const allowedAmount = Math.max(0, limitCents - cumulative) / 100;
      const periodLabel = periodName ? `during the "${periodName}" period` : 'this year';
      const limitLabel = limitCents / 100;
      return {
        eligible: false,
        reason: `Donation exceeds the maximum limit of $${limitLabel} ${periodLabel}. Already donated: $${cumulative / 100}. Maximum additional allowed: $${allowedAmount}.`,
      };
    }

    // Residency check
    const restrictResidency = (await this.getSettingVal(tenantId, 'donations.restrict_residency')) === true;
    const allowedCountries = String((await this.getSettingVal(tenantId, 'donations.allowed_countries')) || '').trim();
    const allowedRegions = String((await this.getSettingVal(tenantId, 'donations.allowed_regions')) || '').trim();

    if (restrictResidency) {
      const country = (address.country || '').trim().toUpperCase();
      const state = (address.state || '').trim().toUpperCase();

      if (allowedCountries) {
        const countriesList = allowedCountries.split(',').map((c) => c.trim().toUpperCase());
        if (!country || !countriesList.includes(country)) {
          return {
            eligible: false,
            reason: `Donor must reside in one of the allowed countries: ${allowedCountries}.`,
          };
        }
      }

      if (allowedRegions) {
        const regionsList = allowedRegions.split(',').map((r) => r.trim().toUpperCase());
        if (!state || !regionsList.includes(state)) {
          return {
            eligible: false,
            reason: `Donor must reside in one of the allowed provinces/states: ${allowedRegions}.`,
          };
        }
      }
    }

    return { eligible: true };
  }

  /**
   * Get donation stats for a person relative to the active limit window.
   */
  public async getDonationStats(tenantId: string, personId: string) {
    const { limitCents, cumulative, periodName } = await this.resolveLimitWindow(tenantId, personId);
    return {
      cumulativeAmount: cumulative / 100,
      limitAmount: limitCents / 100,
      remainingAmount: Math.max(0, limitCents / 100 - cumulative / 100),
      periodName,
    };
  }

  // ── One-time Checkout ────────────────────────────────────────────────────────

  public async createCheckoutSession(
    auth: { tenant_id: string; user_id: string },
    personId: string,
    amountCents: number,
    address: { country?: string; state?: string },
    customUrls?: { successUrl?: string; cancelUrl?: string },
  ) {
    const eligibility = await this.checkEligibility(auth.tenant_id, personId, amountCents, address);
    if (!eligibility.eligible) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: eligibility.reason });
    }

    const tenantStripeKey =
      (await this.getSettingVal(auth.tenant_id, 'donations.stripe_secret_key')) || env.stripeSecretKey;
    const isMock = !tenantStripeKey || tenantStripeKey.includes('MockKey') || tenantStripeKey === '';

    if (isMock) {
      const mockSessionId = 'cs_mock_' + Math.random().toString(36).substring(7);
      let redirectBase = customUrls?.successUrl
        ? customUrls.successUrl.replace('{CHECKOUT_SESSION_ID}', mockSessionId)
        : `${env.appUrl}/people/${personId}?mock_donation_success=true&amount=${amountCents / 100}&session_id=${mockSessionId}&province=${address.state || ''}&country=${address.country || ''}`;

      if (customUrls?.successUrl) {
        const separator = redirectBase.includes('?') ? '&' : '?';
        redirectBase += `${separator}is_mock=true&person_id=${personId}&amount_cents=${amountCents}&province=${encodeURIComponent(address.state || '')}&country=${encodeURIComponent(address.country || '')}&tenant_id=${auth.tenant_id}&user_id=${auth.user_id}`;
      }

      return { url: redirectBase };
    }

    const stripe = new Stripe(tenantStripeKey);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'cad',
            product_data: { name: 'Campaign Donation' },
            unit_amount: amountCents,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url:
        customUrls?.successUrl ||
        `${env.appUrl}/people/${personId}?checkout_success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: customUrls?.cancelUrl || `${env.appUrl}/people/${personId}?checkout_cancel=true`,
      metadata: {
        tenantId: auth.tenant_id,
        personId,
        amount: String(amountCents),
        residencyProvince: address.state || '',
        residencyCountry: address.country || '',
        createdBy: auth.user_id,
      },
    });

    return { url: session.url };
  }

  // ── Recurring Subscription Checkout ─────────────────────────────────────────

  /**
   * Calculate remaining months in the active donation period from today.
   * Returns null if the period is open-ended.
   */
  private getRemainingMonths(endDate: Date | null): number | null {
    if (!endDate) return null;
    const now = new Date();
    const diffMs = endDate.getTime() - now.getTime();
    if (diffMs <= 0) return 0;
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24 * 30));
  }

  public async createRecurringCheckoutSession(
    auth: { tenant_id: string; user_id: string },
    personId: string,
    monthlyAmountCents: number,
    address: { country?: string; state?: string },
    customUrls?: { successUrl?: string; cancelUrl?: string },
  ) {
    // Determine remaining months for limit enforcement
    const activePeriod = await this.periodsRepo.getActivePeriodForToday(auth.tenant_id);
    const remainingMonths = activePeriod?.end_date ? this.getRemainingMonths(new Date(activePeriod.end_date)) : null;

    const eligibility = await this.checkEligibility(auth.tenant_id, personId, monthlyAmountCents, address, {
      isRecurring: true,
      remainingMonths: remainingMonths ?? 12,
    });
    if (!eligibility.eligible) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: eligibility.reason });
    }

    const tenantStripeKey =
      (await this.getSettingVal(auth.tenant_id, 'donations.stripe_secret_key')) || env.stripeSecretKey;
    const isMock = !tenantStripeKey || tenantStripeKey.includes('MockKey') || tenantStripeKey === '';

    if (isMock) {
      const mockSubId = 'sub_mock_' + Math.random().toString(36).substring(7);
      const mockSessionId = 'cs_mock_rec_' + Math.random().toString(36).substring(7);

      let successUrl = customUrls?.successUrl
        ? customUrls.successUrl.replace('{CHECKOUT_SESSION_ID}', mockSessionId)
        : `${env.appUrl}/people/${personId}?mock_pledge_success=true&monthly_amount=${monthlyAmountCents / 100}&session_id=${mockSessionId}`;

      if (customUrls?.successUrl) {
        const sep = successUrl.includes('?') ? '&' : '?';
        successUrl += `${sep}is_mock=true&person_id=${personId}&monthly_amount_cents=${monthlyAmountCents}&province=${encodeURIComponent(address.state || '')}&country=${encodeURIComponent(address.country || '')}&tenant_id=${auth.tenant_id}&user_id=${auth.user_id}&mock_sub_id=${mockSubId}`;
      }

      return { url: successUrl, mock: true };
    }

    const stripe = new Stripe(tenantStripeKey);

    // Create a one-off price for this amount (monthly)
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'cad',
            product_data: { name: 'Monthly Campaign Donation' },
            unit_amount: monthlyAmountCents,
            recurring: { interval: 'month' },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url:
        customUrls?.successUrl ||
        `${env.appUrl}/people/${personId}?checkout_success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: customUrls?.cancelUrl || `${env.appUrl}/people/${personId}?checkout_cancel=true`,
      subscription_data: {
        metadata: {
          tenantId: auth.tenant_id,
          personId,
          monthlyAmount: String(monthlyAmountCents),
          residencyProvince: address.state || '',
          residencyCountry: address.country || '',
          createdBy: auth.user_id,
        },
      },
      metadata: {
        tenantId: auth.tenant_id,
        personId,
        monthlyAmount: String(monthlyAmountCents),
        residencyProvince: address.state || '',
        residencyCountry: address.country || '',
        createdBy: auth.user_id,
        isRecurring: 'true',
      },
    });

    return { url: session.url };
  }

  // ── Confirm Flows ────────────────────────────────────────────────────────────

  public async confirmDonation(tenantId: string, userId: string, sessionId: string) {
    const existing = await this.getRepo()
      .db.selectFrom('donations')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('stripe_session_id', '=', sessionId)
      .executeTakeFirst();

    if (existing) {
      return { success: true, donation: existing };
    }

    if (sessionId.startsWith('cs_mock_')) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Mock sessions must be confirmed via the confirmMockDonation endpoint.',
      });
    }

    const tenantStripeKey = (await this.getSettingVal(tenantId, 'donations.stripe_secret_key')) || env.stripeSecretKey;
    if (!tenantStripeKey) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Stripe is not configured for this tenant.' });
    }
    const stripe = new Stripe(tenantStripeKey);

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== 'paid') {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Session has not been paid.' });
    }

    const personId = String(session.metadata?.['personId']);
    const amountCents = Number(session.metadata?.['amount']);
    const province = String(session.metadata?.['residencyProvince'] || '');
    const country = String(session.metadata?.['residencyCountry'] || '');

    const record = await this.recordSuccessfulDonation(
      tenantId,
      personId,
      amountCents,
      sessionId,
      province,
      country,
      userId,
    );
    return { success: true, donation: record };
  }

  public async confirmMockDonation(
    tenantId: string,
    userId: string,
    personId: string,
    amountCents: number,
    sessionId: string,
    province: string,
    country: string,
  ) {
    const existing = await this.getRepo()
      .db.selectFrom('donations')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('stripe_session_id', '=', sessionId)
      .executeTakeFirst();

    if (existing) {
      return { success: true, donation: existing };
    }

    const record = await this.recordSuccessfulDonation(
      tenantId,
      personId,
      amountCents,
      sessionId,
      province,
      country,
      userId,
    );
    return { success: true, donation: record };
  }

  /**
   * Confirm a mock recurring pledge from the frontend (no real Stripe).
   */
  public async confirmMockPledge(
    tenantId: string,
    userId: string,
    personId: string,
    monthlyAmountCents: number,
    mockSubId: string,
    province: string,
    country: string,
  ) {
    return this.recordNewPledge(tenantId, personId, monthlyAmountCents, mockSubId, null, province, country, userId);
  }

  // ── Internal Write Helpers ───────────────────────────────────────────────────

  public async recordNewPledge(
    tenantId: string,
    personId: string,
    monthlyAmountCents: number,
    stripeSubscriptionId: string,
    stripeCustomerId: string | null,
    province: string,
    country: string,
    userId: string,
  ): Promise<Selectable<Models['donation_pledges']>> {
    const existing = await this.pledgesRepo.db
      .selectFrom('donation_pledges')
      .selectAll()
      .where('stripe_subscription_id', '=', stripeSubscriptionId)
      .executeTakeFirst();

    if (existing) return existing;

    const person = await this.pledgesRepo.db
      .selectFrom('persons')
      .select(['first_name', 'last_name', 'email'])
      .where('id', '=', personId)
      .where('tenant_id', '=', tenantId)
      .executeTakeFirst();

    const pledge = await this.pledgesRepo.db.transaction().execute(async (trx) => {
      const inserted = (await trx
        .insertInto('donation_pledges')
        .values({
          tenant_id: tenantId,
          person_id: personId,
          stripe_subscription_id: stripeSubscriptionId,
          stripe_customer_id: stripeCustomerId,
          monthly_amount: monthlyAmountCents,
          status: 'active',
          first_name: person?.first_name ?? null,
          last_name: person?.last_name ?? null,
          email: person?.email ?? null,
          state: province || null,
          country: country || null,
          createdby_id: userId,
          updatedby_id: userId,
        })
        .returningAll()
        .executeTakeFirstOrThrow()) as Selectable<Models['donation_pledges']>;

      // Ensure 'donor' tag
      const tagName = 'donor';
      let tag = await trx
        .selectFrom('tags')
        .select('id')
        .where('tenant_id', '=', tenantId)
        .where('name', '=', tagName)
        .where('type', '=', 'tag')
        .executeTakeFirst();

      if (!tag) {
        const insertTagRes = await trx
          .insertInto('tags')
          .values({
            tenant_id: tenantId,
            name: tagName,
            type: 'tag',
            deletable: true,
            createdby_id: userId,
            updatedby_id: userId,
          })
          .returning('id')
          .executeTakeFirstOrThrow();
        tag = { id: insertTagRes.id };
      }

      const mapExists = await trx
        .selectFrom('map_peoples_tags')
        .select('person_id')
        .where('tenant_id', '=', tenantId)
        .where('person_id', '=', personId)
        .where('tag_id', '=', tag.id)
        .executeTakeFirst();

      if (!mapExists) {
        await trx
          .insertInto('map_peoples_tags')
          .values({
            tenant_id: tenantId,
            person_id: personId,
            tag_id: tag.id,
            createdby_id: userId,
            updatedby_id: userId,
          })
          .execute();
        try {
          const wc = new WorkflowsController();
          await wc.triggerTagAdded(tenantId, personId, String(tag.id), tagName, trx);
        } catch (err) {
          logger.error({ err }, 'Failed to trigger tag_added on pledge');
        }
      }

      await trx
        .insertInto('user_activity')
        .values({
          tenant_id: tenantId,
          user_id: userId,
          activity: `Started a monthly pledge of $${monthlyAmountCents / 100}/month`,
          entity: 'persons',
          entity_id: personId,
          quantity: 1,
          createdby_id: userId,
          updatedby_id: userId,
        })
        .execute();

      return inserted;
    });

    return pledge;
  }

  public async recordSuccessfulDonation(
    tenantId: string,
    personId: string,
    amountCents: number,
    sessionId: string,
    province: string,
    country: string,
    userId: string,
    pledgeId?: string,
  ): Promise<Selectable<Models['donations']>> {
    const person = await this.getRepo()
      .db.selectFrom('persons')
      .select(['first_name', 'last_name', 'email'])
      .where('id', '=', personId)
      .where('tenant_id', '=', tenantId)
      .executeTakeFirst();

    const record = await this.getRepo()
      .db.transaction()
      .execute(async (trx) => {
        const inserted = (await trx
          .insertInto('donations')
          .values({
            tenant_id: tenantId,
            person_id: personId,
            first_name: person?.first_name ?? null,
            last_name: person?.last_name ?? null,
            email: person?.email ?? null,
            amount: amountCents,
            status: 'succeeded',
            stripe_session_id: sessionId,
            state: province || null,
            country: country || null,
            pledge_id: pledgeId ? pledgeId : null,
          })
          .returningAll()
          .executeTakeFirstOrThrow()) as Selectable<Models['donations']>;

        const tagName = 'donor';
        let tag = await trx
          .selectFrom('tags')
          .select('id')
          .where('tenant_id', '=', tenantId)
          .where('name', '=', tagName)
          .where('type', '=', 'tag')
          .executeTakeFirst();

        if (!tag) {
          const insertTagRes = await trx
            .insertInto('tags')
            .values({
              tenant_id: tenantId,
              name: tagName,
              type: 'tag',
              deletable: true,
              createdby_id: userId,
              updatedby_id: userId,
            })
            .returning('id')
            .executeTakeFirstOrThrow();
          tag = { id: insertTagRes.id };
        }

        const mapExists = await trx
          .selectFrom('map_peoples_tags')
          .select('person_id')
          .where('tenant_id', '=', tenantId)
          .where('person_id', '=', personId)
          .where('tag_id', '=', tag.id)
          .executeTakeFirst();

        if (!mapExists) {
          await trx
            .insertInto('map_peoples_tags')
            .values({
              tenant_id: tenantId,
              person_id: personId,
              tag_id: tag.id,
              createdby_id: userId,
              updatedby_id: userId,
            })
            .execute();

          try {
            const workflowsController = new WorkflowsController();
            await workflowsController.triggerTagAdded(tenantId, personId, String(tag.id), tagName, trx);
          } catch (err) {
            logger.error({ err }, 'Failed to trigger tag_added workflow in DonationsController');
          }
        }

        try {
          await trx
            .insertInto('user_activity')
            .values({
              tenant_id: tenantId,
              user_id: userId,
              activity: `Collected a donation of $${amountCents / 100}`,
              entity: 'persons',
              entity_id: personId,
              quantity: 1,
              createdby_id: userId,
              updatedby_id: userId,
            })
            .execute();
        } catch (err) {
          logger.error({ err }, 'Failed to write audit activity log for donation');
        }

        return inserted;
      });

    try {
      const workflowsController = new WorkflowsController();
      await workflowsController.triggerWorkflow(tenantId, personId, 'donation_received', String(amountCents / 100));
    } catch (workflowErr) {
      logger.error({ err: workflowErr }, 'Failed to trigger workflow on donation_received');
    }

    return record;
  }
}
