/* eslint-disable @typescript-eslint/no-explicit-any */
import { Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  console.log('======= Migrating up: web_forms.form_type column ========');

  await db.schema
    .alterTable('web_forms')
    .addColumn('form_type', 'text', (col) => col.defaultTo('standard').notNull())
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  console.log('====== Migrating down: web_forms.form_type column =======');

  await db.schema
    .alterTable('web_forms')
    .dropColumn('form_type')
    .execute();
}
