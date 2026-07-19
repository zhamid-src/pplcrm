import type { Kysely } from 'kysely';
import { sql } from 'kysely';

/**
 * Drop the seven dead `tenants.billing_*` address columns.
 *
 * Billing addresses are owned by Stripe (Customer billing details); these columns
 * were never read or written by any code path and carried no data worth preserving.
 */
export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    ALTER TABLE public.tenants
      DROP COLUMN IF EXISTS billing_street_num,
      DROP COLUMN IF EXISTS billing_street1,
      DROP COLUMN IF EXISTS billing_street2,
      DROP COLUMN IF EXISTS billing_city,
      DROP COLUMN IF EXISTS billing_state,
      DROP COLUMN IF EXISTS billing_zip,
      DROP COLUMN IF EXISTS billing_country
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`
    ALTER TABLE public.tenants
      ADD COLUMN IF NOT EXISTS billing_street_num text,
      ADD COLUMN IF NOT EXISTS billing_street1 text,
      ADD COLUMN IF NOT EXISTS billing_street2 text,
      ADD COLUMN IF NOT EXISTS billing_city text,
      ADD COLUMN IF NOT EXISTS billing_state text,
      ADD COLUMN IF NOT EXISTS billing_zip text,
      ADD COLUMN IF NOT EXISTS billing_country text
  `.execute(db);
}
