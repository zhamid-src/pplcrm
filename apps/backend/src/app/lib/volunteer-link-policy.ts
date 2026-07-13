import type { Kysely, Transaction } from 'kysely';

import type { Models } from '../../../../../libs/common/src/lib/kysely.models';

/** Workspace → App toggle (settings key). ON by default — expiry is the secure default. */
export const VOLUNTEER_LINKS_EXPIRE_SETTING_KEY = 'app.volunteer_links_expire';

/**
 * Does this tenant expire delivery-route volunteer links (30 days after minting)?
 *
 * The policy is evaluated LIVE at every enforcement point (never baked into the row):
 * `share_token_expires_at` is always stored at mint time as data, and this setting decides
 * whether it is enforced. That makes the toggle instant and reversible — turning expiry off
 * revives already-expired links, and turning it back on immediately re-applies the stored
 * dates (links minted more than 30 days ago stop working again).
 *
 * Enforced in DeliveriesController (mintShareLink active-check, isTokenUsable, sanitizeRoute)
 * and CompanionAccessController.resolveLink (the gate's route branch) — keep them in sync.
 */
export async function volunteerLinksExpire(
  db: Kysely<Models> | Transaction<Models>,
  tenantId: string,
): Promise<boolean> {
  const row = await db
    .selectFrom('settings')
    .select('value')
    .where('tenant_id', '=', tenantId)
    .where('key', '=', VOLUNTEER_LINKS_EXPIRE_SETTING_KEY)
    .executeTakeFirst();
  // Anything other than an explicit "off" means the secure default: links expire.
  return !(row?.value === false || row?.value === 'false');
}
