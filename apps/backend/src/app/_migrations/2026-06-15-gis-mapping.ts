/* eslint-disable @typescript-eslint/no-explicit-any */
import { Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  console.log('======= Migrating up: add GIS mapping and geocoding fields to households ========');

  await db.schema
    .alterTable('households')
    .addColumn('district', 'text')
    .addColumn('precinct', 'text')
    .addColumn('ward', 'text')
    .addColumn('geocoding_status', 'text', (col) => col.defaultTo('pending'))
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  console.log('====== Migrating down: drop GIS mapping and geocoding fields from households =======');

  await db.schema
    .alterTable('households')
    .dropColumn('district')
    .dropColumn('precinct')
    .dropColumn('ward')
    .dropColumn('geocoding_status')
    .execute();
}
