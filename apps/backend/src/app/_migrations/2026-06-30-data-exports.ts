import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('data_exports')
    .addColumn('id', 'bigserial', (col) => col.unique())
    .addColumn('tenant_id', 'bigint', (col) => col.notNull())
    .addColumn('user_id', 'bigint', (col) => col.notNull())
    .addColumn('entity', 'text', (col) => col.notNull())
    .addColumn('file_name', 'text', (col) => col.notNull())
    .addColumn('status', 'text', (col) => col.notNull().defaultTo('pending'))
    .addColumn('row_count', 'integer', (col) => col.defaultTo(0))
    .addColumn('storage_key', 'text')
    .addColumn('columns', 'jsonb')
    .addColumn('error', 'text')
    .addColumn('created_at', 'timestamp', (col) => col.defaultTo(sql`now()`).notNull())
    .addColumn('updated_at', 'timestamp', (col) => col.defaultTo(sql`now()`).notNull())
    .addForeignKeyConstraint('fk_data_exports_tenant', ['tenant_id'], 'tenants', ['id'])
    .addForeignKeyConstraint('fk_data_exports_user', ['user_id'], 'authusers', ['id'])
    .addPrimaryKeyConstraint('data_exports_pk', ['id', 'tenant_id'])
    .execute();

  await db.schema
    .createIndex('idx_data_exports_tenant_created')
    .on('data_exports')
    .columns(['tenant_id', 'created_at'])
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropIndex('idx_data_exports_tenant_created').ifExists().execute();
  await db.schema.dropTable('data_exports').ifExists().cascade().execute();
}
