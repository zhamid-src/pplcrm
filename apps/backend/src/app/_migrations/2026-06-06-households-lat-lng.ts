/* eslint-disable @typescript-eslint/no-explicit-any */
import { Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  console.log('======= Migrating up: add coordinates and address details to households ========');

  await db.schema
    .alterTable('households')
    .addColumn('lat', 'double precision')
    .addColumn('lng', 'double precision')
    .addColumn('formatted_address', 'text')
    .addColumn('type', 'text')
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  console.log('====== Migrating down: drop coordinates and address details from households =======');

  await db.schema
    .alterTable('households')
    .dropColumn('lat')
    .dropColumn('lng')
    .dropColumn('formatted_address')
    .dropColumn('type')
    .execute();
}
