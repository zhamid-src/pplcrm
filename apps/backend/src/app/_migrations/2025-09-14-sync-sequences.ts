import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await sql`SELECT setval('campaigns_id_seq', COALESCE(max(id), 1)) FROM campaigns`.execute(db);
  await sql`SELECT setval('authusers_id_seq', COALESCE(max(id), 1)) FROM authusers`.execute(db);
  await sql`SELECT setval('profiles_id_seq', COALESCE(max(id), 1)) FROM profiles`.execute(db);
  await sql`SELECT setval('households_id_seq', COALESCE(max(id), 1)) FROM households`.execute(db);
  await sql`SELECT setval('persons_id_seq', COALESCE(max(id), 1)) FROM persons`.execute(db);
  await sql`SELECT setval('email_folders_id_seq', COALESCE(max(id), 1)) FROM email_folders`.execute(db);
  await sql`SELECT setval('emails_id_seq', COALESCE(max(id), 1)) FROM emails`.execute(db);
  await sql`SELECT setval('email_comments_id_seq', COALESCE(max(id), 1)) FROM email_comments`.execute(db);
}

export async function down(_db: Kysely<any>): Promise<void> {}
