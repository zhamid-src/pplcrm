import type { Kysely } from 'kysely';
import { sql } from 'kysely';

// Donations §12 — "Record donation" dialog (offline gifts: cash, check, bank transfer, or a card
// swipe not run through the public Stripe checkout). Every donation row up to this migration was
// written by the Stripe checkout path (`recordSuccessfulDonation`), so `method` backfills to
// 'card' for existing rows and `receipt_sent` backfills to true (a receipt was already implied by
// a completed Stripe charge). New manual entries pass an explicit method.
export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    ALTER TABLE public.donations
      ADD COLUMN IF NOT EXISTS method text NOT NULL DEFAULT 'card',
      ADD COLUMN IF NOT EXISTS receipt_sent boolean NOT NULL DEFAULT true
  `.execute(db);

  await sql`
    ALTER TABLE public.donations
      ADD CONSTRAINT chk_donations_method CHECK (method = ANY (ARRAY['card'::text, 'check'::text, 'cash'::text, 'bank_transfer'::text]))
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`ALTER TABLE public.donations DROP CONSTRAINT IF EXISTS chk_donations_method`.execute(db);
  await sql`
    ALTER TABLE public.donations
      DROP COLUMN IF EXISTS method,
      DROP COLUMN IF EXISTS receipt_sent
  `.execute(db);
}
