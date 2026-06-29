/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Kysely } from 'kysely';
import { sql } from 'kysely';

/**
 * Adds double opt-in tracking to persons. `opt_in_status` is NULL for records that never went through
 * the public web-form double opt-in flow (treated as already-consented), 'pending' while awaiting email
 * confirmation, and 'confirmed' once the subscriber clicks the confirmation link.
 */
export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    ALTER TABLE public.persons
      ADD COLUMN IF NOT EXISTS opt_in_status text,
      ADD COLUMN IF NOT EXISTS opt_in_confirmed_at timestamptz
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`
    ALTER TABLE public.persons
      DROP COLUMN IF EXISTS opt_in_status,
      DROP COLUMN IF EXISTS opt_in_confirmed_at
  `.execute(db);
}
