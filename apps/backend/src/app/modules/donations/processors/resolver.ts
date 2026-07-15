import { env } from '../../../../env';
import type { SettingsLookup } from '../donation-guards';
import { HelcimDonationProcessor } from './helcim-processor';
import { StripeDonationProcessor } from './stripe-processor';

export type ProcessorKind = 'stripe' | 'helcim';

/** Resolved processor plus the credentials it was built from (exposed for the webhook path). */
export type ResolvedDonationProcessor =
  | { processor: 'stripe'; adapter: StripeDonationProcessor; stripeKey: string | undefined }
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
 * Build the one-time donation processor for a tenant from its settings. Stripe is the default; a
 * tenant opts into Helcim via `donations.processor = 'helcim'` and `donations.helcim_api_token`.
 * The Stripe key resolution preserves the original `tenant key || env fallback` behavior exactly.
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

  const stripeKey =
    asNonEmptyString(await settingsLookup(tenantId, 'donations.stripe_secret_key')) ?? env.stripeSecretKey;
  return { processor: 'stripe', adapter: new StripeDonationProcessor(stripeKey), stripeKey };
}
