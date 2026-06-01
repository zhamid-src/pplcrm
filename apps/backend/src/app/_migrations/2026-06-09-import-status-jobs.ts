/* eslint-disable @typescript-eslint/no-explicit-any */
import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  console.log('======= Migrating up: import-status-jobs ========');

  // 1. Add status and error_message to data_imports
  await db.schema
    .alterTable('data_imports')
    .addColumn('status', 'text', (col) => col.notNull().defaultTo('completed'))
    .execute();

  await db.schema
    .alterTable('data_imports')
    .addColumn('error_message', 'text')
    .execute();

  // 2. Create background_jobs table
  await db.schema
    .createTable('background_jobs')
    .addColumn('id', 'bigserial', (col) => col.unique())
    .addColumn('tenant_id', 'bigint')
    .addColumn('queue', 'text', (col) => col.notNull().defaultTo('default'))
    .addColumn('status', 'text', (col) => col.notNull().defaultTo('pending'))
    .addColumn('payload', 'jsonb', (col) => col.notNull())
    .addColumn('attempts', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('max_attempts', 'integer', (col) => col.notNull().defaultTo(3))
    .addColumn('error', 'text')
    .addColumn('run_at', 'timestamp', (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn('locked_at', 'timestamp')
    .addColumn('locked_by', 'text')
    .addColumn('created_at', 'timestamp', (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn('updated_at', 'timestamp', (col) => col.notNull().defaultTo(sql`now()`))
    .addForeignKeyConstraint('fk_background_jobs_tenant', ['tenant_id'], 'tenants', ['id'])
    .addPrimaryKeyConstraint('background_jobs_pk', ['id'])
    .execute();

  await db.schema
    .createIndex('idx_background_jobs_status_run_at')
    .on('background_jobs')
    .columns(['status', 'run_at'])
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  console.log('======= Migrating down: import-status-jobs ========');

  await db.schema.dropTable('background_jobs').ifExists().cascade().execute();

  await db.schema.alterTable('data_imports').dropColumn('error_message').execute();
  await db.schema.alterTable('data_imports').dropColumn('status').execute();
}
