/**
 * Migration: security-and-ops-improvements
 *
 * 1. Session token hashing
 *    - Change sessions.session_id and sessions.refresh_token from uuid to text
 *      so they can store SHA-256 hex digests instead of raw UUIDs.
 *    - Existing sessions are invalidated (all rows deleted) — users will be
 *      prompted to re-authenticate once, which is the expected behaviour after
 *      a security upgrade.
 *
 * 2. data_exports: add partial index for pending-status queue polling.
 *
 * 3. GDPR / tenant hard-delete: expand the tenant cascade in the
 *    perform_scheduled_deletions job to cover all entity tables.
 *    (No schema change — this is handled in job-handlers.ts.)
 */
import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // ── #1a – authusers.password_reset_code: uuid → text ────────────────────
  // The column now stores SHA-256 hex digests instead of raw UUIDs.
  // Clear any existing codes first (they'll be invalidated anyway on deploy).
  await sql`UPDATE authusers SET password_reset_code = NULL, password_reset_code_created_at = NULL;`.execute(db);
  await sql`
    ALTER TABLE authusers
      ALTER COLUMN password_reset_code TYPE text USING password_reset_code::text;
  `.execute(db);

  // ── #1b – sessions: uuid → text for hashed token storage ─────────────────
  // Invalidate all existing sessions; users re-authenticate once after deploy.
  await sql`DELETE FROM sessions;`.execute(db);

  await sql`
    ALTER TABLE sessions
      ALTER COLUMN session_id   DROP DEFAULT,
      ALTER COLUMN refresh_token DROP DEFAULT;
  `.execute(db);

  await sql`
    ALTER TABLE sessions
      ALTER COLUMN session_id    TYPE text USING session_id::text,
      ALTER COLUMN refresh_token TYPE text USING refresh_token::text;
  `.execute(db);

  // ── #2 – data_exports: partial index for pending queue polling ───────────
  await sql`
    CREATE INDEX IF NOT EXISTS idx_data_exports_tenant_pending
      ON data_exports (tenant_id, created_at)
      WHERE status = 'pending';
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`DROP INDEX IF EXISTS idx_data_exports_tenant_pending;`.execute(db);

  // Re-add uuid defaults and re-cast (any existing hashed rows will be cleared first)
  await sql`DELETE FROM sessions;`.execute(db);
  await sql`
    ALTER TABLE sessions
      ALTER COLUMN session_id    TYPE uuid USING gen_random_uuid(),
      ALTER COLUMN refresh_token TYPE uuid USING gen_random_uuid();
  `.execute(db);
  await sql`
    ALTER TABLE sessions
      ALTER COLUMN session_id    SET DEFAULT gen_random_uuid(),
      ALTER COLUMN refresh_token SET DEFAULT gen_random_uuid();
  `.execute(db);

  // Revert password_reset_code to uuid
  await sql`UPDATE authusers SET password_reset_code = NULL, password_reset_code_created_at = NULL;`.execute(db);
  await sql`
    ALTER TABLE authusers
      ALTER COLUMN password_reset_code TYPE uuid USING NULL;
  `.execute(db);
}
