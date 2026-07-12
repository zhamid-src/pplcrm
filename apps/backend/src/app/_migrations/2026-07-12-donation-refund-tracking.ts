import type { Kysely } from 'kysely';
import { sql } from 'kysely';

/**
 * Refund / chargeback tracking for donations.
 *
 * `stripe_payment_intent_id` lets an incoming `charge.refunded` / `charge.dispute.*` webhook
 * correlate back to the donation it reverses (a Charge carries the payment intent, not the
 * Checkout Session id we key one-time gifts on). `refunded_at` records when the reversal landed.
 * The `donations.status` column has no CHECK constraint, so the new 'refunded'/'disputed' states
 * need no constraint change — and the cumulative-total queries already filter `status='succeeded'`,
 * so a reversed gift drops out of contribution totals automatically once its status flips.
 */
export async function up(db: Kysely<any>): Promise<void> {
  await sql`ALTER TABLE public.donations ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text`.execute(db);
  await sql`ALTER TABLE public.donations ADD COLUMN IF NOT EXISTS refunded_at timestamp with time zone`.execute(db);
  // Partial index: refund lookups match on (tenant_id, payment_intent) and most rows are null.
  await sql`
    CREATE INDEX IF NOT EXISTS idx_donations_tenant_payment_intent
      ON public.donations (tenant_id, stripe_payment_intent_id)
      WHERE stripe_payment_intent_id IS NOT NULL
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`DROP INDEX IF EXISTS public.idx_donations_tenant_payment_intent`.execute(db);
  await sql`ALTER TABLE public.donations DROP COLUMN IF EXISTS refunded_at`.execute(db);
  await sql`ALTER TABLE public.donations DROP COLUMN IF EXISTS stripe_payment_intent_id`.execute(db);
}
