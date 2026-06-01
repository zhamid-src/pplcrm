/* eslint-disable @typescript-eslint/no-explicit-any */
import { Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  console.log('======= Migrating up: lists-status ========');

  await db.schema
    .alterTable('lists')
    .addColumn('status', 'text', (col) => col.notNull().defaultTo('idle'))
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  console.log('======= Migrating down: lists-status ========');

  await db.schema.alterTable('lists').dropColumn('status').execute();
}
