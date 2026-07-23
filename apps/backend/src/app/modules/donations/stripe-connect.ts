import type { StripeConnectCountry } from '../../../../../../libs/common/src/lib/schemas/donations.schema';
import { env } from '../../../env';
import { PreconditionFailedError } from '../../errors/app-errors';
import { getStripe, isMockMode } from '../../lib/stripe-platform-client';
import { logger } from '../../logger';
import { assertNotDemoMode } from '../demo/demo-guard';
import { SettingsRepo } from '../settings/repositories/settings.repo';

/** Settings keys for the tenant's Stripe Connect state. Written ONLY by this module (backend),
 * never by the generic frontend settings save — the frontend has no secret to enter anymore. */
export const STRIPE_ACCOUNT_ID_KEY = 'donations.stripe_account_id';
export const STRIPE_ACCOUNT_STATUS_KEY = 'donations.stripe_account_status';

export interface StripeConnectStatus {
  connected: boolean;
  accountId: string | null;
  detailsSubmitted: boolean;
  chargesEnabled: boolean;
  requirementsDue: string[];
  isMockMode: boolean;
}

interface CachedAccountStatus {
  detailsSubmitted: boolean;
  chargesEnabled: boolean;
}

const settingsRepo = new SettingsRepo();

const NOT_CONNECTED_MESSAGE =
  'Connect your Stripe account under Workspace → Donations before accepting card donations.';

/** Settings values may come back as a raw JSON string or already parsed (jsonb), same as the
 * billing settings reads — normalize both. */
function parseSettingValue(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

async function readSetting(tenantId: string, key: string): Promise<unknown> {
  const row = await settingsRepo.getByKey({ tenant_id: tenantId, key });
  return parseSettingValue(row?.value);
}

function asCachedStatus(value: unknown): CachedAccountStatus {
  if (value && typeof value === 'object') {
    const v = value as Record<string, unknown>;
    return {
      detailsSubmitted: v['detailsSubmitted'] === true,
      chargesEnabled: v['chargesEnabled'] === true,
    };
  }
  return { detailsSubmitted: false, chargesEnabled: false };
}

/** The tenant's connected account id, or undefined when Stripe isn't connected. */
export async function getConnectedAccountId(tenantId: string): Promise<string | undefined> {
  const value = await readSetting(tenantId, STRIPE_ACCOUNT_ID_KEY);
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

/** Fast checkout-path gate: cached status only, no Stripe round-trip. Mock mode always passes so
 * local dev works without keys. */
export async function getCachedConnectState(
  tenantId: string,
): Promise<{ accountId: string | undefined; chargesEnabled: boolean }> {
  if (isMockMode) {
    return { accountId: undefined, chargesEnabled: true };
  }
  const accountId = await getConnectedAccountId(tenantId);
  if (!accountId) {
    return { accountId: undefined, chargesEnabled: false };
  }
  const cached = asCachedStatus(await readSetting(tenantId, STRIPE_ACCOUNT_STATUS_KEY));
  return { accountId, chargesEnabled: cached.chargesEnabled };
}

/** Throws the fail-closed "connect Stripe first" error unless the tenant has a connected account
 * with charges enabled (or we're in platform mock mode). Returns the account id for `{stripeAccount}`
 * request options (undefined only in mock mode). */
export async function assertStripeConnectReady(tenantId: string): Promise<string | undefined> {
  const state = await getCachedConnectState(tenantId);
  if (isMockMode) return undefined;
  if (!state.accountId || !state.chargesEnabled) {
    throw new PreconditionFailedError(NOT_CONNECTED_MESSAGE);
  }
  return state.accountId;
}

export async function updateCachedAccountStatus(
  tenantId: string,
  userId: string,
  status: CachedAccountStatus,
): Promise<void> {
  await settingsRepo.upsertMany({
    tenant_id: tenantId,
    user_id: userId,
    entries: [{ key: STRIPE_ACCOUNT_STATUS_KEY, value: status }],
  });
}

/** Live status for the settings page: retrieves the account from Stripe and refreshes the cache;
 * falls back to the cache if the retrieve fails. */
export async function getConnectStatus(tenantId: string, userId: string): Promise<StripeConnectStatus> {
  if (isMockMode) {
    return {
      connected: true,
      accountId: 'acct_mock_platform',
      detailsSubmitted: true,
      chargesEnabled: true,
      requirementsDue: [],
      isMockMode: true,
    };
  }

  const accountId = await getConnectedAccountId(tenantId);
  if (!accountId) {
    return {
      connected: false,
      accountId: null,
      detailsSubmitted: false,
      chargesEnabled: false,
      requirementsDue: [],
      isMockMode: false,
    };
  }

  try {
    const account = await getStripe().accounts.retrieve(accountId);
    const status: CachedAccountStatus = {
      detailsSubmitted: account.details_submitted === true,
      chargesEnabled: account.charges_enabled === true,
    };
    await updateCachedAccountStatus(tenantId, userId, status);
    return {
      connected: true,
      accountId,
      detailsSubmitted: status.detailsSubmitted,
      chargesEnabled: status.chargesEnabled,
      requirementsDue: account.requirements?.currently_due ?? [],
      isMockMode: false,
    };
  } catch (err) {
    logger.error({ err }, `[StripeConnect] accounts.retrieve failed for tenant ${tenantId} — using cached status`);
    const cached = asCachedStatus(await readSetting(tenantId, STRIPE_ACCOUNT_STATUS_KEY));
    return {
      connected: true,
      accountId,
      detailsSubmitted: cached.detailsSubmitted,
      chargesEnabled: cached.chargesEnabled,
      requirementsDue: [],
      isMockMode: false,
    };
  }
}

/**
 * Create the connected account on first call and return a Stripe-hosted onboarding URL.
 *
 * Account shape (verified against stripe-node v22 typings + current Connect docs): the legacy
 * `type: 'express'` param is deprecated — controller properties express the decided configuration:
 * Express dashboard UX, Stripe owns loss liability, and the campaign pays Stripe's processing fees
 * directly (`fees.payer: 'account'`), which keeps the platform's application fee (env
 * DONATIONS_PLATFORM_FEE_PERCENT) as clean margin.
 */
export async function startOnboarding(
  tenantId: string,
  userId: string,
  country: StripeConnectCountry,
): Promise<{ url: string }> {
  // Connecting a real Stripe account is outward-facing setup — locked during the demo.
  await assertNotDemoMode(settingsRepo.db, tenantId);
  if (isMockMode) {
    await settingsRepo.upsertMany({
      tenant_id: tenantId,
      user_id: userId,
      entries: [
        { key: STRIPE_ACCOUNT_ID_KEY, value: `acct_mock_${tenantId}` },
        { key: STRIPE_ACCOUNT_STATUS_KEY, value: { detailsSubmitted: true, chargesEnabled: true } },
      ],
    });
    return { url: `${env.appUrl}/workspace/donations?stripe_connected=true&mock=true` };
  }

  const stripe = getStripe();
  let accountId = await getConnectedAccountId(tenantId);

  if (!accountId || accountId.startsWith('acct_mock_')) {
    const account = await stripe.accounts.create({
      country,
      controller: {
        fees: { payer: 'account' },
        losses: { payments: 'stripe' },
        requirement_collection: 'stripe',
        stripe_dashboard: { type: 'express' },
      },
      capabilities: { card_payments: { requested: true } },
      metadata: { tenantId },
    });
    accountId = account.id;
    await settingsRepo.upsertMany({
      tenant_id: tenantId,
      user_id: userId,
      entries: [
        { key: STRIPE_ACCOUNT_ID_KEY, value: accountId },
        { key: STRIPE_ACCOUNT_STATUS_KEY, value: { detailsSubmitted: false, chargesEnabled: false } },
      ],
    });
  }

  const link = await stripe.accountLinks.create({
    account: accountId,
    type: 'account_onboarding',
    refresh_url: `${env.appUrl}/workspace/donations?stripe_refresh=true`,
    return_url: `${env.appUrl}/workspace/donations?stripe_connected=true`,
  });

  return { url: link.url };
}

/** Express-dashboard login link for the "Open Stripe dashboard" button. */
export async function createDashboardLoginLink(tenantId: string): Promise<{ url: string }> {
  await assertNotDemoMode(settingsRepo.db, tenantId);
  if (isMockMode) {
    return { url: `${env.appUrl}/workspace/donations?mock_stripe_dashboard=true` };
  }
  const accountId = await getConnectedAccountId(tenantId);
  if (!accountId) {
    throw new PreconditionFailedError(NOT_CONNECTED_MESSAGE);
  }
  const link = await getStripe().accounts.createLoginLink(accountId);
  return { url: link.url };
}

/** Forget the connection (frees the processor choice). The Stripe account itself belongs to the
 * campaign — we never delete it; reconnecting later creates a fresh account. */
export async function disconnect(tenantId: string): Promise<void> {
  await assertNotDemoMode(settingsRepo.db, tenantId);
  await settingsRepo.db
    .deleteFrom('settings')
    .where('tenant_id', '=', tenantId)
    .where('key', 'in', [STRIPE_ACCOUNT_ID_KEY, STRIPE_ACCOUNT_STATUS_KEY])
    .execute();
}
