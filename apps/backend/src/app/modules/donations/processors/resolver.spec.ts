import { beforeEach, describe, expect, it, vi } from 'vitest';

// The resolver's Stripe branch delegates the fail-closed Connect gate to stripe-connect; mock it
// so these tests stay DB-free and can flip between "ready" and "not connected".
const connectState = vi.hoisted(() => ({ assertReady: vi.fn() }));
vi.mock('../stripe-connect', () => ({
  assertStripeConnectReady: connectState.assertReady,
}));

import { PreconditionFailedError } from '../../../errors/app-errors';
import type { SettingsLookup } from '../donation-guards';
import { HelcimDonationProcessor } from './helcim-processor';
import { resolveDonationProcessor, resolveProcessorKind } from './resolver';
import { StripeDonationProcessor } from './stripe-processor';

function lookupFrom(settings: Record<string, unknown>): SettingsLookup {
  return (_tenantId: string, key: string) => Promise.resolve(settings[key]);
}

describe('resolveDonationProcessor', () => {
  beforeEach(() => {
    connectState.assertReady.mockReset();
    connectState.assertReady.mockResolvedValue('acct_ready_1');
  });

  it('defaults to Stripe when donations.processor is unset (existing tenants unchanged)', async () => {
    const resolved = await resolveDonationProcessor(lookupFrom({}), 't1');
    expect(resolved.processor).toBe('stripe');
    expect(resolved.adapter).toBeInstanceOf(StripeDonationProcessor);
    expect(await resolveProcessorKind(lookupFrom({}), 't1')).toBe('stripe');
  });

  it('carries the connected account id resolved by the Connect gate', async () => {
    const resolved = await resolveDonationProcessor(lookupFrom({}), 't1');
    expect(resolved.processor).toBe('stripe');
    if (resolved.processor === 'stripe') {
      expect(resolved.accountId).toBe('acct_ready_1');
    }
    expect(connectState.assertReady).toHaveBeenCalledWith('t1');
  });

  it('fails closed when the tenant has not completed Stripe Connect onboarding', async () => {
    connectState.assertReady.mockRejectedValue(new PreconditionFailedError('Connect your Stripe account first.'));
    await expect(resolveDonationProcessor(lookupFrom({}), 't1')).rejects.toBeInstanceOf(PreconditionFailedError);
  });

  it('resolves Helcim when donations.processor is "helcim" (no Connect gate involved)', async () => {
    const settings = { 'donations.processor': 'helcim', 'donations.helcim_api_token': 'helcim_tok_abc' };
    const resolved = await resolveDonationProcessor(lookupFrom(settings), 't1');
    expect(resolved.processor).toBe('helcim');
    expect(resolved.adapter).toBeInstanceOf(HelcimDonationProcessor);
    if (resolved.processor === 'helcim') {
      expect(resolved.apiToken).toBe('helcim_tok_abc');
    }
    expect(connectState.assertReady).not.toHaveBeenCalled();
    expect(await resolveProcessorKind(lookupFrom(settings), 't1')).toBe('helcim');
  });

  it('falls back to Stripe for any unrecognized processor value', async () => {
    const resolved = await resolveDonationProcessor(lookupFrom({ 'donations.processor': 'paypal' }), 't1');
    expect(resolved.processor).toBe('stripe');
  });
});
