/* eslint-disable @typescript-eslint/no-explicit-any */
import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  console.log('======= Migrating up: web_forms ========');

  await db.schema
    .createTable('web_forms')
    .addColumn('id', 'uuid', (col) => col.defaultTo(sql`gen_random_uuid()`).unique())
    .addColumn('tenant_id', 'bigint', (col) => col.notNull())
    .addColumn('createdby_id', 'bigint', (col) => col.notNull())
    .addColumn('updatedby_id', 'bigint', (col) => col.notNull())
    .addColumn('name', 'text', (col) => col.notNull())
    .addColumn('description', 'text')
    .addColumn('redirect_url', 'text')
    .addColumn('target_tags', 'jsonb')
    .addColumn('target_lists', 'jsonb')
    .addColumn('status', 'text', (col) => col.defaultTo('active').notNull())
    .addColumn('created_at', 'timestamp', (col) => col.defaultTo(sql`now()`).notNull())
    .addColumn('updated_at', 'timestamp', (col) => col.defaultTo(sql`now()`).notNull())
    .addForeignKeyConstraint('fk_web_forms_tenant_id', ['tenant_id'], 'tenants', ['id'])
    .addForeignKeyConstraint('fk_web_forms_createdby_id', ['createdby_id'], 'authusers', ['id'])
    .addForeignKeyConstraint('fk_web_forms_updatedby_id', ['updatedby_id'], 'authusers', ['id'])
    .addPrimaryKeyConstraint('web_forms_id_tenantid', ['id', 'tenant_id'])
    .execute();

  await db.schema.createIndex('web_forms_tenant_index').on('web_forms').column('tenant_id').execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  console.log('====== Migrating down: web_forms =======');
  await db.schema.dropTable('web_forms').cascade().execute();
}
