import type { Kysely } from 'kysely';
import { sql } from 'kysely';

/**
 * Admin deactivation for system users (§ Users).
 *
 * `deletion_scheduled_at` cannot double as a deactivation flag: the deletion
 * worker hard-deletes any authuser whose date has passed, and signIn/verify2FA
 * auto-clear it ("logging back in cancels deletion" is the self-service
 * contract). Admin deactivation needs the opposite semantics — indefinite,
 * blocks sign-in, and only an admin/owner can reverse it — so it gets its own
 * column. Nullable: NULL = active.
 */
export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    ALTER TABLE public.authusers
      ADD COLUMN IF NOT EXISTS deactivated_at timestamptz
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`
    ALTER TABLE public.authusers
      DROP COLUMN IF EXISTS deactivated_at
  `.execute(db);
}
