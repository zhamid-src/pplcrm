import type { Kysely } from 'kysely';
import { sql } from 'kysely';

/**
 * Geocoding is a Movement-only capability (cost control): households on lower tiers are never sent
 * to the Google Geocoding API. They need an honest terminal state that is neither "in progress"
 * (`pending` → the chip would spin forever) nor "broken" (`failed` → the address is fine), so add
 * `skipped` to the `households.geocoding_status` CHECK. The geocode-status chip renders it as a
 * muted "Not geocoded". See lib/gis/geocode-queue.ts (the enqueue gate) and the pplcrm-maps-geo
 * skill.
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`ALTER TABLE public.households DROP CONSTRAINT IF EXISTS chk_households_geocoding_status`.execute(db);
  await sql`
    ALTER TABLE public.households
      ADD CONSTRAINT chk_households_geocoding_status
      CHECK (
        geocoding_status IS NULL
        OR geocoding_status = ANY (ARRAY['pending'::text, 'success'::text, 'failed'::text, 'skipped'::text])
      )
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  // Rows in the new state would violate the old constraint — clear them first.
  await sql`UPDATE public.households SET geocoding_status = NULL WHERE geocoding_status = 'skipped'`.execute(db);
  await sql`ALTER TABLE public.households DROP CONSTRAINT IF EXISTS chk_households_geocoding_status`.execute(db);
  await sql`
    ALTER TABLE public.households
      ADD CONSTRAINT chk_households_geocoding_status
      CHECK (
        geocoding_status IS NULL
        OR geocoding_status = ANY (ARRAY['pending'::text, 'success'::text, 'failed'::text])
      )
  `.execute(db);
}
