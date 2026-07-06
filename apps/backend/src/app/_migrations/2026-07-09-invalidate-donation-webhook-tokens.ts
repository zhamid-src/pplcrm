import type { Kysely } from 'kysely';
import { sql } from 'kysely';

// Donation webhook tokens are now stored hashed and looked up by hash (SECURITY-REVIEW.md 2.4).
// Any pre-existing plaintext token can no longer match, so remove those stale rows — tenants
// regenerate to get a fresh (hashed) token and re-paste the webhook URL into Stripe. This is the
// "force-regenerate" path, mirroring the Zapier key migration.
export async function up(db: Kysely<any>): Promise<void> {
  await sql`DELETE FROM settings WHERE key = 'donations.webhook_token'`.execute(db);
}

export async function down(): Promise<void> {
  // No-op: tokens are regenerated on demand; there is nothing to restore.
}
