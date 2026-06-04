/* eslint-disable @typescript-eslint/no-explicit-any */
import { Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  console.log('======= Migrating up: add previous_email and previous_role to authusers ========');

  await db.schema
    .alterTable('authusers')
    .addColumn('previous_email', 'text')
    .addColumn('previous_role', 'text')
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  console.log('======= Migrating down: add previous_email and previous_role to authusers ========');

  await db.schema.alterTable('authusers').dropColumn('previous_email').execute();
  await db.schema.alterTable('authusers').dropColumn('previous_role').execute();
}
