import type { Kysely } from 'kysely';
import { sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // For each table, keep only the most recently updated row per tenant before enforcing uniqueness
  await sql`
    DELETE FROM google_oauth_tokens
    WHERE id NOT IN (
      SELECT DISTINCT ON (tenant_id) id
      FROM google_oauth_tokens
      ORDER BY tenant_id, updated_at DESC NULLS LAST
    )
  `.execute(db);

  await sql`
    DELETE FROM ms_oauth_tokens
    WHERE id NOT IN (
      SELECT DISTINCT ON (tenant_id) id
      FROM ms_oauth_tokens
      ORDER BY tenant_id, updated_at DESC NULLS LAST
    )
  `.execute(db);

  // google_oauth_tokens: drop old user_id unique constraint + index, add tenant_id unique
  await sql`ALTER TABLE google_oauth_tokens DROP CONSTRAINT IF EXISTS google_oauth_tokens_user_id_key`.execute(db);
  await sql`DROP INDEX IF EXISTS google_oauth_tokens_tenant_user_idx`.execute(db);
  await sql`ALTER TABLE google_oauth_tokens ALTER COLUMN user_id DROP NOT NULL`.execute(db);
  await sql`ALTER TABLE google_oauth_tokens ADD CONSTRAINT google_oauth_tokens_tenant_id_key UNIQUE (tenant_id)`.execute(
    db,
  );
  await sql`CREATE INDEX google_oauth_tokens_tenant_idx ON google_oauth_tokens (tenant_id)`.execute(db);

  // ms_oauth_tokens: same
  await sql`ALTER TABLE ms_oauth_tokens DROP CONSTRAINT IF EXISTS ms_oauth_tokens_user_id_key`.execute(db);
  await sql`DROP INDEX IF EXISTS ms_oauth_tokens_tenant_user_idx`.execute(db);
  await sql`ALTER TABLE ms_oauth_tokens ALTER COLUMN user_id DROP NOT NULL`.execute(db);
  await sql`ALTER TABLE ms_oauth_tokens ADD CONSTRAINT ms_oauth_tokens_tenant_id_key UNIQUE (tenant_id)`.execute(db);
  await sql`CREATE INDEX ms_oauth_tokens_tenant_idx ON ms_oauth_tokens (tenant_id)`.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`ALTER TABLE google_oauth_tokens DROP CONSTRAINT IF EXISTS google_oauth_tokens_tenant_id_key`.execute(db);
  await sql`DROP INDEX IF EXISTS google_oauth_tokens_tenant_idx`.execute(db);
  await sql`ALTER TABLE google_oauth_tokens ALTER COLUMN user_id SET NOT NULL`.execute(db);
  await sql`ALTER TABLE google_oauth_tokens ADD CONSTRAINT google_oauth_tokens_user_id_key UNIQUE (user_id)`.execute(
    db,
  );
  await sql`CREATE INDEX google_oauth_tokens_tenant_user_idx ON google_oauth_tokens (tenant_id, user_id)`.execute(db);

  await sql`ALTER TABLE ms_oauth_tokens DROP CONSTRAINT IF EXISTS ms_oauth_tokens_tenant_id_key`.execute(db);
  await sql`DROP INDEX IF EXISTS ms_oauth_tokens_tenant_idx`.execute(db);
  await sql`ALTER TABLE ms_oauth_tokens ALTER COLUMN user_id SET NOT NULL`.execute(db);
  await sql`ALTER TABLE ms_oauth_tokens ADD CONSTRAINT ms_oauth_tokens_user_id_key UNIQUE (user_id)`.execute(db);
  await sql`CREATE INDEX ms_oauth_tokens_tenant_user_idx ON ms_oauth_tokens (tenant_id, user_id)`.execute(db);
}
