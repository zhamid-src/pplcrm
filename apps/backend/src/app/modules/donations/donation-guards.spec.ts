import { describe, expect, it } from 'vitest';

import { PreconditionFailedError } from '../../errors/app-errors';
import {
  DONATIONS_NOT_CONFIGURED_MESSAGE,
  assertTenantMayAcceptDonations,
  tenantMayAcceptDonations,
  type SettingsLookup,
} from './donation-guards';

/** A settings lookup backed by a plain map of `key -> value`. */
function lookupFrom(settings: Record<string, unknown>): SettingsLookup {
  return (_tenantId: string, key: string) => Promise.resolve(settings[key]);
}

describe('donation-guards (fail-closed residency gate)', () => {
  it('fails closed by default when residency is not acknowledged', async () => {
    const lookup = lookupFrom({});
    expect(await tenantMayAcceptDonations(lookup, 't1')).toBe(false);
    await expect(assertTenantMayAcceptDonations(lookup, 't1')).rejects.toBeInstanceOf(PreconditionFailedError);
    await expect(assertTenantMayAcceptDonations(lookup, 't1')).rejects.toThrow(DONATIONS_NOT_CONFIGURED_MESSAGE);
  });

  it('fails closed for non-true values (string "true", 1, null)', async () => {
    expect(await tenantMayAcceptDonations(lookupFrom({ 'donations.residency_acknowledged': 'true' }), 't1')).toBe(
      false,
    );
    expect(await tenantMayAcceptDonations(lookupFrom({ 'donations.residency_acknowledged': 1 }), 't1')).toBe(false);
    expect(await tenantMayAcceptDonations(lookupFrom({ 'donations.residency_acknowledged': null }), 't1')).toBe(false);
  });

  it('opens only once residency_acknowledged is exactly true', async () => {
    const lookup = lookupFrom({ 'donations.residency_acknowledged': true });
    expect(await tenantMayAcceptDonations(lookup, 't1')).toBe(true);
    await expect(assertTenantMayAcceptDonations(lookup, 't1')).resolves.toBeUndefined();
  });
});
