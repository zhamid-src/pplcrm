import type { Kysely } from 'kysely';
import { sql } from 'kysely';

// Zapier API keys are now stored hashed and looked up by hash (SECURITY-REVIEW.md 2.4).
// Any pre-existing plaintext key can no longer match, so remove those stale rows —
// tenants regenerate to get a fresh (hashed) key. This is the "force-regenerate" path.
export async function up(db: Kysely<any>): Promise<void> {
  await sql`DELETE FROM settings WHERE key = 'zapier.api_key'`.execute(db);
}

export async function down(): Promise<void> {
  // No-op: keys are regenerated on demand; there is nothing to restore.
}
