import { describe, expect, it } from 'vitest';

import type { SettingsLookup } from '../donation-guards';
import { HelcimDonationProcessor } from './helcim-processor';
import { resolveDonationProcessor, resolveProcessorKind } from './resolver';
import { StripeDonationProcessor } from './stripe-processor';

function lookupFrom(settings: Record<string, unknown>): SettingsLookup {
  return (_tenantId: string, key: string) => Promise.resolve(settings[key]);
}

describe('resolveDonationProcessor', () => {
  it('defaults to Stripe when donations.processor is unset (existing tenants unchanged)', async () => {
    const resolved = await resolveDonationProcessor(lookupFrom({}), 't1');
    expect(resolved.processor).toBe('stripe');
    expect(resolved.adapter).toBeInstanceOf(StripeDonationProcessor);
    expect(await resolveProcessorKind(lookupFrom({}), 't1')).toBe('stripe');
  });

  it('uses the tenant Stripe key when set', async () => {
    const resolved = await resolveDonationProcessor(
      lookupFrom({ 'donations.stripe_secret_key': 'sk_tenant_123' }),
      't1',
    );
    expect(resolved.processor).toBe('stripe');
    if (resolved.processor === 'stripe') {
      expect(resolved.stripeKey).toBe('sk_tenant_123');
    }
  });

  it('resolves Helcim when donations.processor is "helcim"', async () => {
    const settings = { 'donations.processor': 'helcim', 'donations.helcim_api_token': 'helcim_tok_abc' };
    const resolved = await resolveDonationProcessor(lookupFrom(settings), 't1');
    expect(resolved.processor).toBe('helcim');
    expect(resolved.adapter).toBeInstanceOf(HelcimDonationProcessor);
    if (resolved.processor === 'helcim') {
      expect(resolved.apiToken).toBe('helcim_tok_abc');
    }
    expect(await resolveProcessorKind(lookupFrom(settings), 't1')).toBe('helcim');
  });

  it('falls back to Stripe for any unrecognized processor value', async () => {
    const resolved = await resolveDonationProcessor(lookupFrom({ 'donations.processor': 'paypal' }), 't1');
    expect(resolved.processor).toBe('stripe');
  });
});
