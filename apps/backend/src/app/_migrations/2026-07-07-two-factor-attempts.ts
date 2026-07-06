import type { Kysely } from 'kysely';
import { sql } from 'kysely';

// Per-account failed-2FA counter so an OTP can be invalidated after too many wrong
// guesses (SECURITY-REVIEW.md 2.5), rather than staying valid for its whole window.
export async function up(db: Kysely<any>): Promise<void> {
  await sql`ALTER TABLE authusers ADD COLUMN IF NOT EXISTS two_factor_attempts INTEGER NOT NULL DEFAULT 0`.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`ALTER TABLE authusers DROP COLUMN IF EXISTS two_factor_attempts`.execute(db);
}
