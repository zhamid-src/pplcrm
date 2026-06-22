import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMP WITH TIME ZONE`.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`ALTER TABLE tenants DROP COLUMN IF EXISTS suspended_at`.execute(db);
}
