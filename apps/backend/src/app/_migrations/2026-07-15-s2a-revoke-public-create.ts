import type { Kysely } from 'kysely';
import { sql } from 'kysely';

/**
 * S-2a: Revoke the default CREATE grant on schema public from PUBLIC (schema
 * review 2026-07-06, §6).
 *
 * On PostgreSQL 14 the public schema still grants CREATE to PUBLIC, letting any
 * connected role create objects and lay function-shadowing traps. PG15+ removes
 * this by default; do it explicitly now. USAGE on public is left intact so the
 * app role can still resolve objects.
 *
 * IMPORTANT — takes effect only when migrations run as the schema owner. A
 * REVOKE by a non-owner role raises a WARNING and is a no-op (it does NOT error),
 * so in the current dev setup — where the migrator connects as `zeehamid`, which
 * owns the tables but not schema `public` (owned by `zee`) and holds CREATE only
 * via this very PUBLIC grant — this migration intentionally does nothing. Do not
 * force it as the owner in that setup: it would strip the non-owner migrator's
 * CREATE and break every subsequent table-creating migration. It becomes
 * effective once the S-2 owner/app role split (Wave 3) makes migrations run as
 * the object owner, where CREATE is inherent.
 *
 * Idempotent: re-running REVOKE on an already-revoked privilege is a no-op.
 */
export async function up(db: Kysely<any>): Promise<void> {
  await sql`REVOKE CREATE ON SCHEMA public FROM PUBLIC;`.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`GRANT CREATE ON SCHEMA public TO PUBLIC;`.execute(db);
}
