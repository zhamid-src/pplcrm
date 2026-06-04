/* eslint-disable @typescript-eslint/no-explicit-any */
import { Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  console.log('======= Migrating up: web_forms and volunteer_events email toggles ========');

  // 1. Alter web_forms
  await db.schema
    .alterTable('web_forms')
    .addColumn('send_confirmation', 'boolean', (col) => col.notNull().defaultTo(true))
    .addColumn('send_alert', 'boolean', (col) => col.notNull().defaultTo(true))
    .execute();

  // 2. Alter volunteer_events
  await db.schema
    .alterTable('volunteer_events')
    .addColumn('send_signup_confirmation', 'boolean', (col) => col.notNull().defaultTo(true))
    .addColumn('send_volunteer_alert', 'boolean', (col) => col.notNull().defaultTo(true))
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  console.log('====== Migrating down: web_forms and volunteer_events email toggles =======');

  await db.schema
    .alterTable('web_forms')
    .dropColumn('send_confirmation')
    .dropColumn('send_alert')
    .execute();

  await db.schema
    .alterTable('volunteer_events')
    .dropColumn('send_signup_confirmation')
    .dropColumn('send_volunteer_alert')
    .execute();
}
