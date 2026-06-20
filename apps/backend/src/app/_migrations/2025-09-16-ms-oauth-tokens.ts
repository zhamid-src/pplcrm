import { Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('ms_oauth_tokens')
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(db.fn('gen_random_uuid', [])))
    .addColumn('tenant_id', 'text', (col) => col.notNull())
    .addColumn('user_id', 'text', (col) => col.notNull().unique())
    .addColumn('access_token', 'text', (col) => col.notNull())
    .addColumn('refresh_token', 'text', (col) => col.notNull())
    .addColumn('expires_at', 'timestamptz', (col) => col.notNull())
    .addColumn('ms_email', 'text')
    .addColumn('delta_link', 'text')
    .addColumn('synced_at', 'timestamptz')
    .addColumn('created_at', 'timestamptz', (col) => col.defaultTo(db.fn('now', [])))
    .addColumn('updated_at', 'timestamptz', (col) => col.defaultTo(db.fn('now', [])))
    .execute();

  await db.schema
    .createIndex('ms_oauth_tokens_tenant_user_idx')
    .on('ms_oauth_tokens')
    .columns(['tenant_id', 'user_id'])
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropIndex('ms_oauth_tokens_tenant_user_idx').execute();
  await db.schema.dropTable('ms_oauth_tokens').execute();
}
