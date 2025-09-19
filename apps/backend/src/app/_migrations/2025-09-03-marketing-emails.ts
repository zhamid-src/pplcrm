/* eslint-disable @typescript-eslint/no-explicit-any */
import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  console.log('======= Migrating up: marketing_emails ========');

  await db.schema
    .createTable('marketing_emails')
    .ifNotExists()
    .addColumn('id', 'bigserial', (col) => col.unique())
    .addColumn('tenant_id', 'bigint', (col) => col.notNull())
    .addColumn('createdby_id', 'bigint', (col) => col.notNull())
    .addColumn('updatedby_id', 'bigint', (col) => col.notNull())
    .addColumn('name', 'text', (col) => col.notNull())
    .addColumn('status', 'text', (col) => col.notNull().defaultTo('sent'))
    .addColumn('subject', 'text')
    .addColumn('preview_text', 'text')
    .addColumn('audience_description', 'text')
    .addColumn('target_lists', 'text')
    .addColumn('segments', 'text')
    .addColumn('total_recipients', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('delivered_count', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('bounce_count', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('open_rate', 'numeric', (col) => col.notNull().defaultTo(0))
    .addColumn('click_rate', 'numeric', (col) => col.notNull().defaultTo(0))
    .addColumn('unique_opens', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('unique_clicks', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('unsubscribe_count', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('spam_complaint_count', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('reply_count', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('send_date', 'timestamp')
    .addColumn('last_engagement_at', 'timestamp')
    .addColumn('summary', 'text')
    .addColumn('html_content', 'text')
    .addColumn('plain_text_content', 'text')
    .addColumn('top_links', 'jsonb')
    .addColumn('attachments', 'jsonb')
    .addColumn('created_at', 'timestamp', (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn('updated_at', 'timestamp', (col) => col.notNull().defaultTo(sql`now()`))
    .addCheckConstraint(
      'chk_marketing_emails_open_rate_range',
      sql`open_rate >= 0 AND open_rate <= 100`,
    )
    .addCheckConstraint(
      'chk_marketing_emails_click_rate_range',
      sql`click_rate >= 0 AND click_rate <= 100`,
    )
    .addForeignKeyConstraint('fk_marketing_emails_tenant_id', ['tenant_id'], 'tenants', ['id'])
    .addForeignKeyConstraint('fk_marketing_emails_createdby_id', ['createdby_id'], 'authusers', ['id'])
    .addForeignKeyConstraint('fk_marketing_emails_updatedby_id', ['updatedby_id'], 'authusers', ['id'])
    .addPrimaryKeyConstraint('marketing_emails_id_pk', ['id'])
    .execute();

  await db.schema
    .createIndex('marketing_emails_tenant_idx')
    .ifNotExists()
    .on('marketing_emails')
    .column('tenant_id')
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  console.log('====== Migrating down: marketing_emails =======');
  await db.schema.dropTable('marketing_emails').ifExists().cascade().execute();
}
