/* eslint-disable @typescript-eslint/no-explicit-any */
import { Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  console.log('======= Migrating up: add file_id to companies and tasks ========');

  // Add file_id to companies
  await db.schema
    .alterTable('companies')
    .addColumn('file_id', 'bigint')
    .execute();

  await db.schema
    .createIndex('idx_companies_file_id')
    .on('companies')
    .column('file_id')
    .execute();

  // Add file_id to tasks
  await db.schema
    .alterTable('tasks')
    .addColumn('file_id', 'bigint')
    .execute();

  await db.schema
    .createIndex('idx_tasks_file_id')
    .on('tasks')
    .column('file_id')
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  console.log('======= Migrating down: add file_id to companies and tasks ========');

  // Remove file_id from tasks
  await db.schema.dropIndex('idx_tasks_file_id').ifExists().execute();
  await db.schema.alterTable('tasks').dropColumn('file_id').execute();

  // Remove file_id from companies
  await db.schema.dropIndex('idx_companies_file_id').ifExists().execute();
  await db.schema.alterTable('companies').dropColumn('file_id').execute();
}
