import { env } from '../../../../env';
import type { SettingsLookup } from '../donation-guards';
import { assertStripeConnectReady } from '../stripe-connect';
import { HelcimDonationProcessor } from './helcim-processor';
import { StripeDonationProcessor } from './stripe-processor';

export type ProcessorKind = 'stripe' | 'helcim';

/** Resolved processor plus the credentials/account context it was built from. */
export type ResolvedDonationProcessor =
  | { processor: 'stripe'; adapter: StripeDonationProcessor; accountId: string | undefined }
  | { processor: 'helcim'; adapter: HelcimDonationProcessor; apiToken: string };

function asNonEmptyString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

/** Which processor a tenant selected. Stripe is the default so existing tenants are unchanged. */
export async function resolveProcessorKind(settingsLookup: SettingsLookup, tenantId: string): Promise<ProcessorKind> {
  const raw = await settingsLookup(tenantId, 'donations.processor');
  return raw === 'helcim' ? 'helcim' : 'stripe';
}

/**
 * Build the one-time donation processor for a tenant. Helcim keeps its per-tenant API token; the
 * Stripe branch is Connect: charges run on the platform key against the tenant's connected account
 * (direct charges — the campaign stays merchant of record), with the platform application fee from
 * `DONATIONS_PLATFORM_FEE_PERCENT`. Fails closed (`PreconditionFailedError`) when the tenant hasn't
 * completed Stripe onboarding — mirroring the residency gate; platform mock mode bypasses the gate.
 */
export async function resolveDonationProcessor(
  settingsLookup: SettingsLookup,
  tenantId: string,
): Promise<ResolvedDonationProcessor> {
  const kind = await resolveProcessorKind(settingsLookup, tenantId);

  if (kind === 'helcim') {
    const apiToken = asNonEmptyString(await settingsLookup(tenantId, 'donations.helcim_api_token')) ?? '';
    return { processor: 'helcim', adapter: new HelcimDonationProcessor(apiToken, 'CAD'), apiToken };
  }

  const accountId = await assertStripeConnectReady(tenantId);
  return {
    processor: 'stripe',
    adapter: new StripeDonationProcessor({ accountId, feePercent: env.donationsPlatformFeePercent }),
    accountId,
  };
}
