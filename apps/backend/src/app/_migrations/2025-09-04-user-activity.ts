/* eslint-disable @typescript-eslint/no-explicit-any */
import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  console.log('======= Migrating up: user_activity ========');

  await db.schema
    .createTable('user_activity')
    .addColumn('id', 'bigserial', (col) => col.unique())
    .addColumn('tenant_id', 'bigint', (col) => col.notNull())
    .addColumn('user_id', 'bigint', (col) => col.notNull())
    .addColumn('activity', 'text', (col) => col.notNull())
    .addColumn('entity', 'text', (col) => col.notNull())
    .addColumn('quantity', 'integer', (col) => col.defaultTo(0).notNull())
    .addColumn('metadata', 'jsonb')
    .addColumn('createdby_id', 'bigint', (col) => col.notNull())
    .addColumn('updatedby_id', 'bigint', (col) => col.notNull())
    .addColumn('created_at', 'timestamp', (col) => col.defaultTo(sql`now()`).notNull())
    .addColumn('updated_at', 'timestamp', (col) => col.defaultTo(sql`now()`).notNull())
    .addPrimaryKeyConstraint('user_activity_pk', ['id', 'tenant_id'])
    .addForeignKeyConstraint('fk_user_activity_tenant', ['tenant_id'], 'tenants', ['id'])
    .addForeignKeyConstraint('fk_user_activity_user', ['user_id'], 'authusers', ['id'])
    .addForeignKeyConstraint('fk_user_activity_createdby', ['createdby_id'], 'authusers', ['id'])
    .addForeignKeyConstraint('fk_user_activity_updatedby', ['updatedby_id'], 'authusers', ['id'])
    .execute();

  await db.schema.createIndex('idx_user_activity_user').on('user_activity').columns(['tenant_id', 'user_id']).execute();
  await db.schema.createIndex('idx_user_activity_activity').on('user_activity').columns(['activity']).execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  console.log('======= Migrating down: user_activity ========');
  await db.schema.dropIndex('idx_user_activity_activity').ifExists().execute();
  await db.schema.dropIndex('idx_user_activity_user').ifExists().execute();
  await db.schema.dropTable('user_activity').ifExists().cascade().execute();
}
