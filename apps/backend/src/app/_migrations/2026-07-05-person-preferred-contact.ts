import type { Kysely } from 'kysely';
import { sql } from 'kysely';

/**
 * Adds a `preferred_contact` column to persons — the channel this person prefers to be reached on
 * ('email' | 'mobile' | 'home_phone'). NULL means no preference has been recorded.
 */
export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    ALTER TABLE public.persons
      ADD COLUMN IF NOT EXISTS preferred_contact text
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`
    ALTER TABLE public.persons
      DROP COLUMN IF EXISTS preferred_contact
  `.execute(db);
}
