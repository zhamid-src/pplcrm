import type { Kysely, Transaction } from 'kysely';
import type { Models } from '../../../../../../libs/common/src/lib/kysely.models';
import { ForbiddenError } from '../../errors/app-errors';

/**
 * Demo mode is the pre-plan test drive: the tenant can explore and edit the
 * seeded data freely, but must not touch outward-facing configuration (sender
 * identities, domains, mailbox sync) or send email. Those unlock when they
 * subscribe and exit demo mode. Enforced server-side at the mutation entry
 * points — the UI copy is a courtesy, this guard is the contract.
 */
export const DEMO_MODE_BLOCKED_MESSAGE =
  'This is part of the demo. Choose a plan on the Billing page, then exit demo mode to unlock configuration and sending.';

export async function isDemoMode(db: Kysely<Models> | Transaction<Models>, tenant_id: string): Promise<boolean> {
  const tenant = await db.selectFrom('tenants').select('demo_mode_at').where('id', '=', tenant_id).executeTakeFirst();
  return tenant?.demo_mode_at != null;
}

/** Throws FORBIDDEN when the tenant is still in demo mode. */
export async function assertNotDemoMode(db: Kysely<Models> | Transaction<Models>, tenant_id: string): Promise<void> {
  if (await isDemoMode(db, tenant_id)) {
    throw new ForbiddenError(DEMO_MODE_BLOCKED_MESSAGE);
  }
}
