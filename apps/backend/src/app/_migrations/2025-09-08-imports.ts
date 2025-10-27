import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('data_imports')
    .addColumn('id', 'bigserial', (col) => col.unique())
    .addColumn('tenant_id', 'bigint', (col) => col.notNull())
    .addColumn('createdby_id', 'bigint', (col) => col.notNull())
    .addColumn('updatedby_id', 'bigint', (col) => col.notNull())
    .addColumn('file_name', 'text', (col) => col.notNull())
    .addColumn('source', 'text', (col) => col.notNull().defaultTo('persons'))
    .addColumn('tag_name', 'text')
    .addColumn('tag_id', 'bigint')
    .addColumn('row_count', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('inserted_count', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('error_count', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('skipped_count', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('households_created', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('metadata', 'jsonb')
    .addColumn('processed_at', 'timestamp', (col) => col.defaultTo(sql`now()`).notNull())
    .addColumn('created_at', 'timestamp', (col) => col.defaultTo(sql`now()`).notNull())
    .addColumn('updated_at', 'timestamp', (col) => col.defaultTo(sql`now()`).notNull())
    .addForeignKeyConstraint('fk_data_imports_tenant', ['tenant_id'], 'tenants', ['id'])
    .addForeignKeyConstraint('fk_data_imports_createdby', ['createdby_id'], 'authusers', ['id'])
    .addForeignKeyConstraint('fk_data_imports_updatedby', ['updatedby_id'], 'authusers', ['id'])
    .addForeignKeyConstraint('fk_data_imports_tag', ['tag_id'], 'tags', ['id'])
    .addPrimaryKeyConstraint('data_imports_pk', ['id', 'tenant_id'])
    .execute();

  await db.schema
    .createIndex('idx_data_imports_tenant_processed')
    .on('data_imports')
    .columns(['tenant_id', 'processed_at'])
    .execute();

  await db.schema
    .createIndex('idx_data_imports_tag')
    .on('data_imports')
    .column('tag_id')
    .execute();

  await db.schema
    .createIndex('idx_persons_file_id')
    .on('persons')
    .column('file_id')
    .execute();

  await db.schema
    .createIndex('idx_households_file_id')
    .on('households')
    .column('file_id')
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropIndex('idx_households_file_id').ifExists().execute();
  await db.schema.dropIndex('idx_persons_file_id').ifExists().execute();
  await db.schema.dropIndex('idx_data_imports_tag').ifExists().execute();
  await db.schema.dropIndex('idx_data_imports_tenant_processed').ifExists().execute();
  await db.schema.dropTable('data_imports').ifExists().cascade().execute();
}
