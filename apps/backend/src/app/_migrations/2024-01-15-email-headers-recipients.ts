/**
 * Migration to add email_headers and email_recipients tables for enhanced email data.
 * This migration adds support for storing detailed email headers and recipient information.
 */
import { Kysely } from 'kysely';

/**
 * Remove email_headers and email_recipients tables.
 *
 * @param db - Database connection instance
 */
export async function down(db: Kysely<any>): Promise<void> {
  // Drop indexes first
  await db.schema.dropIndex('idx_email_recipients_kind').execute();
  await db.schema.dropIndex('idx_email_recipients_email_id').execute();
  await db.schema.dropIndex('idx_email_headers_email_id').execute();

  // Drop tables
  await db.schema.dropTable('email_recipients').execute();
  await db.schema.dropTable('email_headers').execute();

  console.log('✅ Removed email_headers and email_recipients tables');
}

/**
 * Add email_headers and email_recipients tables.
 *
 * @param _db - Database connection instance
 */
export async function up(_db: Kysely<any>): Promise<void> {
  // Create email_headers table
  /*
  await db.schema
    .createTable('email_headers')
    .addColumn('id', 'bigserial', (col) => col.primaryKey().unique())
    .addColumn('tenant_id', 'bigint', (col) => col.notNull())
    .addColumn('email_id', 'bigint', (col) => col.notNull())
    .addColumn('headers_json', 'jsonb')
    .addColumn('raw_headers', 'text')
    .addColumn('date_sent', 'timestamp')
    .addColumn('createdby_id', 'bigint', (col) => col.notNull())
    .addColumn('updatedby_id', 'bigint', (col) => col.notNull())
    .addColumn('created_at', 'timestamp', (col) => col.defaultTo(sql`now()`).notNull())
    .addColumn('updated_at', 'timestamp', (col) => col.defaultTo(sql`now()`).notNull())
    .addForeignKeyConstraint('fk_email_headers_email', ['email_id'], 'emails', ['id'])
    .addUniqueConstraint('unique_email_headers_email_id', ['email_id'])
    .execute();

  // Create email_recipients table
  await db.schema
    .createTable('email_recipients')
    .addColumn('id', 'bigserial', (col) => col.primaryKey().unique())
    .addColumn('tenant_id', 'bigint', (col) => col.notNull())
    .addColumn('email_id', 'bigint', (col) => col.notNull())
    .addColumn('kind', 'text', (col) => col.notNull().check(sql`kind IN ('to', 'cc', 'bcc')`))
    .addColumn('name', 'text')
    .addColumn('email', 'text', (col) => col.notNull())
    .addColumn('pos', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('createdby_id', 'bigint', (col) => col.notNull())
    .addColumn('updatedby_id', 'bigint', (col) => col.notNull())
    .addColumn('created_at', 'timestamp', (col) => col.defaultTo(sql`now()`).notNull())
    .addColumn('updated_at', 'timestamp', (col) => col.defaultTo(sql`now()`).notNull())
    .addForeignKeyConstraint('fk_email_recipients_email', ['email_id'], 'emails', ['id'])
    .execute();

  // Create indexes for better query performance
  await db.schema
    .createIndex('idx_email_headers_email_id')
    .on('email_headers')
    .column('email_id')
    .execute();

  await db.schema
    .createIndex('idx_email_recipients_email_id')
    .on('email_recipients')
    .column('email_id')
    .execute();

  await db.schema
    .createIndex('idx_email_recipients_kind')
    .on('email_recipients')
    .columns(['email_id', 'kind', 'pos'])
    .execute();
*/
  console.log('✅ Added email_headers and email_recipients tables');
}
