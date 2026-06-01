/* eslint-disable @typescript-eslint/no-explicit-any */
import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  console.log('======= Migrating up: webhook-events ========');

  await db.schema
    .createTable('webhook_events')
    .addColumn('id', 'bigserial')
    .addColumn('tenant_id', 'bigint')
    .addColumn('stripe_event_id', 'text', (col) => col.notNull().unique())
    .addColumn('type', 'text', (col) => col.notNull())
    .addColumn('payload', 'jsonb', (col) => col.notNull())
    .addColumn('status', 'text', (col) => col.notNull().defaultTo('pending'))
    .addColumn('attempts', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('max_attempts', 'integer', (col) => col.notNull().defaultTo(3))
    .addColumn('error', 'text')
    .addColumn('run_at', 'timestamp', (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn('locked_at', 'timestamp')
    .addColumn('locked_by', 'text')
    .addColumn('created_at', 'timestamp', (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn('updated_at', 'timestamp', (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn('processed_at', 'timestamp')
    .addForeignKeyConstraint('fk_webhook_events_tenant', ['tenant_id'], 'tenants', ['id'])
    .addPrimaryKeyConstraint('webhook_events_pk', ['id'])
    .execute();

  await db.schema
    .createIndex('idx_webhook_events_status_run_at')
    .on('webhook_events')
    .columns(['status', 'run_at'])
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  console.log('======= Migrating down: webhook-events ========');
  await db.schema.dropTable('webhook_events').ifExists().cascade().execute();
}
