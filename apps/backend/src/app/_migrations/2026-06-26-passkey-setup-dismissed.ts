import type { Kysely } from 'kysely';
import { sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await sql`ALTER TABLE authusers ADD COLUMN IF NOT EXISTS passkey_setup_dismissed_at TIMESTAMP WITH TIME ZONE`.execute(
    db,
  );
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`ALTER TABLE authusers DROP COLUMN IF EXISTS passkey_setup_dismissed_at`.execute(db);
}
