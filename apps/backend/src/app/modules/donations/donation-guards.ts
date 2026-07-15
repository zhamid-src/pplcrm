import { PreconditionFailedError } from '../../errors/app-errors';

/**
 * Fail-closed donation gate (mirrors modules/newsletters/send-guards.ts). Accepting money on behalf
 * of an organization is a compliance act: campaign-finance residency rules must be deliberately
 * confirmed before any donation — online or offline — can be taken. So the gate defaults to CLOSED
 * and only opens once the tenant has explicitly acknowledged its residency settings in
 * Workspace → Donations (the `donations.residency_acknowledged` setting).
 */

/**
 * A read-only settings accessor: `(tenantId, key) => Promise<the setting's parsed value>`. Matches
 * DonationsController's private `getSettingVal`, so the controller passes a bound reference and the
 * guards/resolver stay decoupled from the settings repo. `unknown` because settings are dynamic JSON.
 */
export type SettingsLookup = (tenantId: string, key: string) => Promise<unknown>;

export const DONATIONS_NOT_CONFIGURED_MESSAGE =
  'This organization hasn’t finished setting up donations yet. (Residency settings must be confirmed in Workspace → Donations before donations can be accepted.)';

/** True only when the tenant has explicitly acknowledged its residency settings. Fails closed. */
export async function tenantMayAcceptDonations(settingsLookup: SettingsLookup, tenantId: string): Promise<boolean> {
  const acknowledged = await settingsLookup(tenantId, 'donations.residency_acknowledged');
  return acknowledged === true;
}

/** Throws a 412 with a Settings-pointing message when the tenant hasn't acknowledged residency. */
export async function assertTenantMayAcceptDonations(settingsLookup: SettingsLookup, tenantId: string): Promise<void> {
  if (!(await tenantMayAcceptDonations(settingsLookup, tenantId))) {
    throw new PreconditionFailedError(DONATIONS_NOT_CONFIGURED_MESSAGE);
  }
}
