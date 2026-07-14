import type { Kysely } from 'kysely';
import { sql } from 'kysely';

/**
 * Pricing overhaul, Stage 1 (subscriber-bracket pricing — see
 * libs/common/src/lib/billing/plans.ts for the full decision log).
 *
 * Stripe never learns about subscriber counts, only a `quantity` — this column persists
 * "which bracket is this tenant currently billed at" so the app can compare it against the
 * live emailable-subscriber count without re-deriving it from Stripe on every check.
 *
 * Backfill: the 2026-07-14 overhaul retires the `representative` plan (its features split
 * between `grassroots` and `movement`, with `movement` the nearest fit) and renames the free
 * tier's internal key from `starter` to `free`. Any dev/demo tenant still carrying either
 * legacy value is remapped here so `subscription_plan` resolves without relying on
 * `LEGACY_PLAN_ALIASES` at read time.
 */
export async function up(db: Kysely<any>): Promise<void> {
  await sql`ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS subscription_quantity integer NOT NULL DEFAULT 1`.execute(
    db,
  );

  await sql`UPDATE public.tenants SET subscription_plan = 'movement' WHERE lower(subscription_plan) = 'representative'`.execute(
    db,
  );
  await sql`UPDATE public.tenants SET subscription_plan = 'free' WHERE lower(subscription_plan) = 'starter'`.execute(
    db,
  );
}

export async function down(db: Kysely<any>): Promise<void> {
  // The plan-name backfill above is intentionally left in place on rollback: it's lossy (we
  // can't recover which pre-migration tenants were 'representative' vs already 'movement',
  // or 'starter' vs already 'free') and reverting it risks silently mis-pricing a live tenant.
  // Only the added column is reverted.
  await sql`ALTER TABLE public.tenants DROP COLUMN IF EXISTS subscription_quantity`.execute(db);
}
