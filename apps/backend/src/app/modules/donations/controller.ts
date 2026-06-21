import Stripe from 'stripe';
import { TRPCError } from '@trpc/server';
import { env } from '../../../env';
import { BaseController } from '../../lib/base.controller';
import { DonationsRepo } from './repositories/donations.repo';
import { SettingsRepo } from '../settings/repositories/settings.repo';
import { Models } from '../../../../../../libs/common/src/lib/kysely.models';
import { WorkflowsController } from '../workflows/controller';
import { Selectable } from 'kysely';

export class DonationsController extends BaseController<'donations', DonationsRepo> {
  private settingsRepo = new SettingsRepo();

  constructor() {
    super(new DonationsRepo());
  }

  /**
   * Public proxy to get person donations list
   */
  public async getPersonDonationsList(tenantId: string, personId: string): Promise<Selectable<Models['donations']>[]> {
    return this.getRepo().getPersonDonationsList(tenantId, personId);
  }

  /**
   * Public proxy to get person cumulative donations
   */
  public async getPersonCumulativeDonations(tenantId: string, personId: string, year: number): Promise<number> {
    return this.getRepo().getPersonCumulativeDonations(tenantId, personId, year);
  }

  /**
   * Public proxy to get tenant donations list (joined with donor details)
   */
  public async getTenantDonationsList(tenantId: string) {
    return this.getRepo().getTenantDonationsList(tenantId);
  }

  /**
   * Helper to retrieve settings
   */
  private async getSettingVal(tenantId: string, key: string): Promise<any> {
    const row = await this.settingsRepo.getByKey({ tenant_id: tenantId, key });
    return row?.value;
  }

  /**
   * Calculate progressive tax credit
   */
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
      const tierLimitCents = tier.limit * 100; // limit is in dollars in settings, convert to cents

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
   * Perform eligibility checks based on limit and residency restrictions
   */
  public async checkEligibility(
    tenantId: string,
    personId: string,
    amountCents: number,
    address: { country?: string; state?: string },
  ) {
    const limitVal = await this.getSettingVal(tenantId, 'donations.limit');
    const limitSetting = limitVal !== undefined && limitVal !== null ? Number(limitVal) : 1000;
    const limitCents = limitSetting * 100;

    const restrictResidency = (await this.getSettingVal(tenantId, 'donations.restrict_residency')) === true;
    const allowedCountries = String((await this.getSettingVal(tenantId, 'donations.allowed_countries')) || '').trim();
    const allowedRegions = String((await this.getSettingVal(tenantId, 'donations.allowed_regions')) || '').trim();

    // 1. Check cumulative donation limit for current calendar year
    const currentYear = new Date().getFullYear();
    const cumulative = await this.getRepo().getPersonCumulativeDonations(tenantId, personId, currentYear);

    if (cumulative + amountCents > limitCents) {
      const allowedAmount = Math.max(0, limitCents - cumulative) / 100;
      return {
        eligible: false,
        reason: `Donation exceeds maximum annual limit of $${limitSetting}. Person has already donated $${cumulative / 100} this year. Maximum additional allowed is $${allowedAmount}.`,
      };
    }

    // 2. Check residency
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
   * Create Stripe Checkout Session
   */
  public async createCheckoutSession(
    auth: { tenant_id: string; user_id: string },
    personId: string,
    amountCents: number,
    address: { country?: string; state?: string },
    customUrls?: { successUrl?: string; cancelUrl?: string },
  ) {
    // 1. Validate eligibility
    const eligibility = await this.checkEligibility(auth.tenant_id, personId, amountCents, address);
    if (!eligibility.eligible) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: eligibility.reason,
      });
    }

    const tenantStripeKey =
      (await this.getSettingVal(auth.tenant_id, 'donations.stripe_secret_key')) || env.stripeSecretKey;
    const isMock = !tenantStripeKey || tenantStripeKey.includes('MockKey') || tenantStripeKey === '';

    if (isMock) {
      // Return simulated local success redirect
      const mockSessionId = 'cs_mock_' + Math.random().toString(36).substring(7);
      let redirectBase = customUrls?.successUrl 
        ? customUrls.successUrl.replace('{CHECKOUT_SESSION_ID}', mockSessionId)
        : `${env.appUrl}/people/${personId}?mock_donation_success=true&amount=${amountCents / 100}&session_id=${mockSessionId}&province=${address.state || ''}&country=${address.country || ''}`;
      
      if (customUrls?.successUrl) {
        const separator = redirectBase.includes('?') ? '&' : '?';
        redirectBase += `${separator}is_mock=true&person_id=${personId}&amount_cents=${amountCents}&province=${encodeURIComponent(address.state || '')}&country=${encodeURIComponent(address.country || '')}&tenant_id=${auth.tenant_id}&user_id=${auth.user_id}`;
      }

      return {
        url: redirectBase,
      };
    }

    // Initialize Stripe
    const stripe = new Stripe(tenantStripeKey);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'cad', // Standardized currency
            product_data: {
              name: 'Campaign Donation',
            },
            unit_amount: amountCents,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: customUrls?.successUrl || `${env.appUrl}/people/${personId}?checkout_success=true&session_id={CHECKOUT_SESSION_ID}`,
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

  /**
   * Confirm/Verify session return to prevent missing donations
   */
  public async confirmDonation(
    tenantId: string,
    userId: string,
    sessionId: string,
    mockData?: { amount: number; province: string; country: string },
  ) {
    // Check if donation already recorded
    const existing = await this.getRepo()
      .db.selectFrom('donations')
      .selectAll()
      .where('tenant_id', '=', tenantId as any)
      .where('stripe_session_id', '=', sessionId)
      .executeTakeFirst();

    if (existing) {
      return { success: true, donation: existing };
    }

    let amountCents = 0;
    let province = '';
    let country = '';
    let personId = '';

    if (sessionId.startsWith('cs_mock_')) {
      if (!mockData) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Missing mock payload parameters.',
        });
      }
      amountCents = mockData.amount * 100;
      province = mockData.province;
      country = mockData.country;
      // Get the current path target from route
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Mock session confirm should specify personId.',
      });
    }

    const tenantStripeKey = (await this.getSettingVal(tenantId, 'donations.stripe_secret_key')) || env.stripeSecretKey;
    const stripe = new Stripe(tenantStripeKey!);

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== 'paid') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Session has not been paid.',
      });
    }

    personId = String(session.metadata?.['personId']);
    amountCents = Number(session.metadata?.['amount']);
    province = String(session.metadata?.['residencyProvince'] || '');
    country = String(session.metadata?.['residencyCountry'] || '');

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
   * Process Mock Donation from client directly in mock mode
   */
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
      .where('tenant_id', '=', tenantId as any)
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
   * Centralized successful donation business logic
   */
  public async recordSuccessfulDonation(
    tenantId: string,
    personId: string,
    amountCents: number,
    sessionId: string,
    province: string,
    country: string,
    userId: string,
  ): Promise<Selectable<Models['donations']>> {
    // 1. Get tax credit tiers
    const tiersRaw = await this.getSettingVal(tenantId, 'donations.tax_credit_tiers');
    let tiers: Array<{ limit: number; rate: number }> = [];
    if (typeof tiersRaw === 'string') {
      try {
        tiers = JSON.parse(tiersRaw);
      } catch (err) {
        console.error('Failed to parse tax credit tiers setting:', err);
      }
    } else if (Array.isArray(tiersRaw)) {
      tiers = tiersRaw;
    }

    // 2. Get cumulative amount before
    const currentYear = new Date().getFullYear();
    const cumulativeBefore = await this.getRepo().getPersonCumulativeDonations(tenantId, personId, currentYear);

    // 3. Calculate credit
    const taxCreditCents = this.calculateTaxCredit(amountCents, cumulativeBefore, tiers);

    let record: Selectable<Models['donations']>;

    // 4. Execute all writes transactionally
    await this.getRepo().db.transaction().execute(async (trx) => {
      record = (await trx
        .insertInto('donations' as any)
        .values({
          tenant_id: tenantId,
          person_id: personId,
          amount: amountCents,
          status: 'succeeded',
          stripe_session_id: sessionId,
          tax_credit_amount: taxCreditCents,
          residency_province: province || null,
          residency_country: country || null,
          createdby_id: userId,
          updatedby_id: userId,
        } as any)
        .returningAll()
        .executeTakeFirstOrThrow()) as Selectable<Models['donations']>;

      // Ensure 'donor' tag is resolved/created and applied to the donor
      const tagName = 'donor';
      let tag = await trx
        .selectFrom('tags')
        .select('id')
        .where('tenant_id', '=', tenantId as any)
        .where('name', '=', tagName)
        .where('type', '=', 'tag')
        .executeTakeFirst();

      if (!tag) {
        const insertTagRes = await trx
          .insertInto('tags')
          .values({
            tenant_id: tenantId as any,
            name: tagName,
            type: 'tag',
            deletable: true,
            createdby_id: userId as any,
            updatedby_id: userId as any,
          })
          .returning('id')
          .executeTakeFirstOrThrow();
        tag = { id: insertTagRes.id };
      }

      const mapExists = await trx
        .selectFrom('map_peoples_tags')
        .select('person_id')
        .where('tenant_id', '=', tenantId as any)
        .where('person_id', '=', personId as any)
        .where('tag_id', '=', tag.id as any)
        .executeTakeFirst();

      if (!mapExists) {
        await trx
          .insertInto('map_peoples_tags')
          .values({
            tenant_id: tenantId as any,
            person_id: personId as any,
            tag_id: tag.id as any,
            createdby_id: userId as any,
            updatedby_id: userId as any,
          })
          .execute();

        try {
          const workflowsController = new WorkflowsController();
          await workflowsController.triggerTagAdded(tenantId, personId, String(tag.id), tagName, trx);
        } catch (err) {
          console.error('Failed to trigger tag_added workflow in DonationsController:', err);
        }
      }

      // 5. Audit Log (User Activity)
      try {
        await trx
          .insertInto('user_activity' as any)
          .values({
            tenant_id: tenantId,
            user_id: userId,
            activity: `Collected a donation of $${amountCents / 100} (calculated tax credit: $${taxCreditCents / 100})`,
            entity: 'persons',
            entity_id: personId,
            quantity: 1,
            createdby_id: userId,
            updatedby_id: userId,
          } as any)
          .execute();
      } catch (err) {
        console.error('Failed to write audit activity log for donation:', err);
      }
    });

    // 6. Trigger donation workflow (if matches)
    try {
      const workflowsController = new WorkflowsController();
      await workflowsController.triggerWorkflow(tenantId, personId, 'donation_received', String(amountCents / 100));
    } catch (workflowErr) {
      console.error('Failed to trigger workflow on donation_received:', workflowErr);
    }

    return record!;
  }
}
