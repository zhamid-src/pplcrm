import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    ALTER TABLE google_oauth_tokens
      ADD COLUMN IF NOT EXISTS last_sync_error text,
      ADD COLUMN IF NOT EXISTS last_sync_error_at timestamptz
  `.execute(db);

  await sql`
    ALTER TABLE ms_oauth_tokens
      ADD COLUMN IF NOT EXISTS last_sync_error text,
      ADD COLUMN IF NOT EXISTS last_sync_error_at timestamptz
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`
    ALTER TABLE google_oauth_tokens
      DROP COLUMN IF EXISTS last_sync_error,
      DROP COLUMN IF EXISTS last_sync_error_at
  `.execute(db);

  await sql`
    ALTER TABLE ms_oauth_tokens
      DROP COLUMN IF EXISTS last_sync_error,
      DROP COLUMN IF EXISTS last_sync_error_at
  `.execute(db);
}
