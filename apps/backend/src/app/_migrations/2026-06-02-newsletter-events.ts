/* eslint-disable @typescript-eslint/no-explicit-any */
import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  console.log('======= Migrating up: newsletter_events ========');

  await db.schema
    .createTable('newsletter_events')
    .ifNotExists()
    .addColumn('id', 'bigserial', (col) => col.unique())
    .addColumn('tenant_id', 'bigint', (col) => col.notNull())
    .addColumn('newsletter_id', 'bigint', (col) => col.notNull())
    .addColumn('email', 'text', (col) => col.notNull())
    .addColumn('event_type', 'text', (col) => col.notNull())
    .addColumn('sg_event_id', 'text', (col) => col.notNull().unique())
    .addColumn('sg_message_id', 'text')
    .addColumn('url', 'text')
    .addColumn('ip', 'text')
    .addColumn('user_agent', 'text')
    .addColumn('timestamp', 'timestamp', (col) => col.notNull())
    .addColumn('created_at', 'timestamp', (col) => col.notNull().defaultTo(sql`now()`))
    .addForeignKeyConstraint('fk_newsletter_events_tenant_id', ['tenant_id'], 'tenants', ['id'])
    .addForeignKeyConstraint(
      'fk_newsletter_events_newsletter_id',
      ['newsletter_id'],
      'newsletters',
      ['id'],
      (cb) => cb.onDelete('cascade')
    )
    .addPrimaryKeyConstraint('newsletter_events_id_pk', ['id'])
    .execute();

  await db.schema
    .createIndex('idx_newsletter_events_tenant_newsletter')
    .ifNotExists()
    .on('newsletter_events')
    .columns(['tenant_id', 'newsletter_id'])
    .execute();

  await db.schema
    .createIndex('idx_newsletter_events_newsletter_event')
    .ifNotExists()
    .on('newsletter_events')
    .columns(['newsletter_id', 'event_type'])
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  console.log('====== Migrating down: newsletter_events =======');
  await db.schema.dropTable('newsletter_events').ifExists().cascade().execute();
}
