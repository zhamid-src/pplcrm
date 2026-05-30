/* eslint-disable @typescript-eslint/no-explicit-any */
import { Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  console.log('======= Migrating up: web_forms.fields column ========');

  await db.schema
    .alterTable('web_forms')
    .addColumn('fields', 'jsonb')
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  console.log('====== Migrating down: web_forms.fields column =======');

  await db.schema
    .alterTable('web_forms')
    .dropColumn('fields')
    .execute();
}
