import { Kysely, sql } from 'kysely';

/**
 * Alter authusers table role column to have type text instead of bigint,
 * allowing users to assign text-based roles like 'admin' or 'editor'
 * which is expected by the application schema and frontend inputs.
 */
export async function up(db: Kysely<any>): Promise<void> {
  await sql`ALTER TABLE authusers ALTER COLUMN role TYPE text USING role::text`.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`ALTER TABLE authusers ALTER COLUMN role TYPE bigint USING (case when role ~ '^\\d+$' then role::bigint else null end)`.execute(db);
}
