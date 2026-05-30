/* eslint-disable @typescript-eslint/no-explicit-any */
import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  console.log('======= Migrating up: email_read_states ========');

  await db.schema
    .createTable('email_read_states')
    .addColumn('tenant_id', 'bigint', (col) => col.notNull())
    .addColumn('user_id', 'bigint', (col) => col.notNull())
    .addColumn('email_id', 'bigint', (col) => col.notNull())
    .addColumn('is_read', 'boolean', (col) => col.defaultTo(true).notNull())
    .addColumn('created_at', 'timestamp', (col) => col.defaultTo(sql`now()`).notNull())
    .addForeignKeyConstraint('fk_email_read_states_tenant', ['tenant_id'], 'tenants', ['id'])
    .addForeignKeyConstraint('fk_email_read_states_user', ['user_id'], 'authusers', ['id'])
    .addForeignKeyConstraint('fk_email_read_states_email', ['email_id'], 'emails', ['id'], (cb) => cb.onDelete('cascade'))
    .addPrimaryKeyConstraint('email_read_states_pk', ['tenant_id', 'user_id', 'email_id'])
    .execute();

  await db.schema
    .createIndex('idx_email_read_states_user')
    .on('email_read_states')
    .columns(['tenant_id', 'user_id'])
    .execute();

  await db.schema
    .createIndex('idx_email_read_states_email')
    .on('email_read_states')
    .columns(['tenant_id', 'email_id'])
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  console.log('======= Migrating down: email_read_states ========');
  await db.schema.dropTable('email_read_states').ifExists().cascade().execute();
}
