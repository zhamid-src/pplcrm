import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await sql`CREATE SEQUENCE IF NOT EXISTS tenants_id_seq`.execute(db);
  await sql`ALTER TABLE tenants ALTER COLUMN id SET DEFAULT nextval('tenants_id_seq')`.execute(db);
  await sql`ALTER SEQUENCE tenants_id_seq OWNED BY tenants.id`.execute(db);
  await sql`SELECT setval('tenants_id_seq', COALESCE(max(id), 1)) FROM tenants`.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`ALTER TABLE tenants ALTER COLUMN id DROP DEFAULT`.execute(db);
  await sql`DROP SEQUENCE IF EXISTS tenants_id_seq`.execute(db);
}
