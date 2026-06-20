import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await sql`ALTER TABLE authusers ALTER COLUMN role TYPE text USING role::text`.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`ALTER TABLE authusers ALTER COLUMN role TYPE bigint USING (case when role ~ '^\\d+$' then role::bigint else null end)`.execute(
    db,
  );
}
