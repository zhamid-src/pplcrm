/* eslint-disable @typescript-eslint/no-explicit-any */
import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  console.log('======= Migrating up: companies & notifications ========');

  // 1. Create companies table
  await db.schema
    .createTable('companies')
    .addColumn('id', 'bigserial', (col) => col.unique())
    .addColumn('tenant_id', 'bigint', (col) => col.notNull())
    .addColumn('createdby_id', 'bigint', (col) => col.notNull())
    .addColumn('updatedby_id', 'bigint', (col) => col.notNull())
    .addColumn('name', 'text', (col) => col.notNull())
    .addColumn('description', 'text')
    .addColumn('website', 'text')
    .addColumn('email', 'text')
    .addColumn('phone', 'text')
    .addColumn('industry', 'text')
    .addColumn('notes', 'text')
    .addColumn('json', 'jsonb')
    .addColumn('created_at', 'timestamp', (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn('updated_at', 'timestamp', (col) => col.notNull().defaultTo(sql`now()`))
    .addForeignKeyConstraint('fk_companies_tenant', ['tenant_id'], 'tenants', ['id'])
    .addForeignKeyConstraint('fk_companies_createdby', ['createdby_id'], 'authusers', ['id'])
    .addForeignKeyConstraint('fk_companies_updatedby', ['updatedby_id'], 'authusers', ['id'])
    .addPrimaryKeyConstraint('companies_pk', ['id', 'tenant_id'])
    .execute();

  await db.schema.createIndex('idx_companies_tenant').on('companies').column('tenant_id').execute();

  // 2. Add company_id to persons table
  await db.schema
    .alterTable('persons')
    .addColumn('company_id', 'bigint')
    .execute();

  await db.schema
    .alterTable('persons')
    .addForeignKeyConstraint('fk_persons_company', ['company_id'], 'companies', ['id'])
    .execute();

  await db.schema.createIndex('idx_persons_company_id').on('persons').column('company_id').execute();

  // 3. Create notifications table
  await db.schema
    .createTable('notifications')
    .addColumn('id', 'bigserial', (col) => col.unique())
    .addColumn('tenant_id', 'bigint', (col) => col.notNull())
    .addColumn('user_id', 'bigint', (col) => col.notNull())
    .addColumn('title', 'text', (col) => col.notNull())
    .addColumn('message', 'text', (col) => col.notNull())
    .addColumn('type', 'text', (col) => col.notNull().defaultTo('info'))
    .addColumn('read', 'boolean', (col) => col.notNull().defaultTo(false))
    .addColumn('link', 'text')
    .addColumn('created_at', 'timestamp', (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn('updated_at', 'timestamp', (col) => col.notNull().defaultTo(sql`now()`))
    .addForeignKeyConstraint('fk_notifications_tenant', ['tenant_id'], 'tenants', ['id'])
    .addForeignKeyConstraint('fk_notifications_user', ['user_id'], 'authusers', ['id'])
    .addPrimaryKeyConstraint('notifications_pk', ['id', 'tenant_id'])
    .execute();

  await db.schema.createIndex('idx_notifications_tenant_user').on('notifications').columns(['tenant_id', 'user_id']).execute();
  await db.schema.createIndex('idx_notifications_read').on('notifications').columns(['tenant_id', 'user_id', 'read']).execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  console.log('======= Migrating down: companies & notifications ========');

  await db.schema.dropTable('notifications').ifExists().cascade().execute();

  await db.schema.alterTable('persons').dropConstraint('fk_persons_company').execute();
  await db.schema.dropIndex('idx_persons_company_id').ifExists().execute();
  await db.schema.alterTable('persons').dropColumn('company_id').execute();

  await db.schema.dropTable('companies').ifExists().cascade().execute();
}
