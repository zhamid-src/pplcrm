import type { Kysely } from 'kysely';
import { sql } from 'kysely';

/**
 * Annual billing (2026-07-18 — see libs/common/src/lib/billing/plans.ts for the decision log).
 *
 * Each purchasable tier gains a second Stripe price with interval = year at exactly 10× the
 * monthly unit amounts ("2 months free"). This column persists which interval the tenant's
 * live subscription is on so billing surfaces can label prices ("$X/month" vs "billed
 * annually") without a Stripe round-trip. Synced from the Stripe price on webhooks; every
 * existing subscription predates annual billing, so the 'month' default is a correct backfill.
 */
export async function up(db: Kysely<any>): Promise<void> {
  await sql`ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS subscription_interval text NOT NULL DEFAULT 'month'`.execute(
    db,
  );
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`ALTER TABLE public.tenants DROP COLUMN IF EXISTS subscription_interval`.execute(db);
}
