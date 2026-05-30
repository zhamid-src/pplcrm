/* eslint-disable @typescript-eslint/no-explicit-any */
import { Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  console.log('======= Migrating up: volunteer_events contact and privacy columns ========');

  await db.schema
    .alterTable('volunteer_events')
    .addColumn('contact_email', 'text')
    .addColumn('contact_phone', 'text')
    .addColumn('is_private', 'boolean', (col) => col.notNull().defaultTo(false))
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  console.log('====== Migrating down: volunteer_events contact and privacy columns =======');

  await db.schema
    .alterTable('volunteer_events')
    .dropColumn('contact_email')
    .dropColumn('contact_phone')
    .dropColumn('is_private')
    .execute();
}
