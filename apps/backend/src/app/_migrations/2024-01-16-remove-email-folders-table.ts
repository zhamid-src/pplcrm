/**
 * Migration to remove the email_folders table.
 * 
 * Email folders are now hardcoded in the application configuration
 * instead of being stored in the database.
 */
import { Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // Drop the email_folders table since we're using hardcoded configuration
  await db.schema.dropTable('email_folders').ifExists().execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  // Recreate the email_folders table if needed
  await db.schema
    .createTable('email_folders')
    .ifNotExists()
    .addColumn('id', 'text', (col) => col.primaryKey())
    .addColumn('tenant_id', 'text', (col) => col.notNull())
    .addColumn('name', 'text', (col) => col.notNull())
    .addColumn('icon', 'text', (col) => col.notNull())
    .addColumn('sort_order', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('is_default', 'boolean', (col) => col.notNull().defaultTo(false))
    .addColumn('createdby_id', 'text', (col) => col.notNull())
    .addColumn('updatedby_id', 'text', (col) => col.notNull())
    .addColumn('created_at', 'timestamp', (col) => col.notNull().defaultTo('now()'))
    .addColumn('updated_at', 'timestamp', (col) => col.notNull().defaultTo('now()'))
    .execute();
}
