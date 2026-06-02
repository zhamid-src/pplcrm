/* eslint-disable @typescript-eslint/no-explicit-any */
import { Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  console.log('======= Migrating up: volunteer_events send_reminder column ========');

  await db.schema
    .alterTable('volunteer_events')
    .addColumn('send_reminder', 'boolean', (col) => col.notNull().defaultTo(true))
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  console.log('====== Migrating down: volunteer_events send_reminder column =======');

  await db.schema
    .alterTable('volunteer_events')
    .dropColumn('send_reminder')
    .execute();
}
