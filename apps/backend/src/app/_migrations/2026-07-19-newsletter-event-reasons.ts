import type { Kysely } from 'kysely';
import { sql } from 'kysely';

/**
 * Newsletter report — bounce diagnostics (§ Newsletters).
 *
 * SendGrid bounce/dropped events carry a human-readable `reason` ("Mailbox does
 * not exist") and bounce events a `type` ('bounce' = hard, 'blocked' = soft).
 * The webhook previously discarded both, so the report could not say WHY an
 * address bounced or whether it is permanent. Nullable — older rows and
 * non-bounce events simply have no diagnostics.
 */
export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    ALTER TABLE public.newsletter_events
      ADD COLUMN IF NOT EXISTS reason text,
      ADD COLUMN IF NOT EXISTS bounce_type text
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`
    ALTER TABLE public.newsletter_events
      DROP COLUMN IF EXISTS reason,
      DROP COLUMN IF EXISTS bounce_type
  `.execute(db);
}
