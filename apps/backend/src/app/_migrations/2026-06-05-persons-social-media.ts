/* eslint-disable @typescript-eslint/no-explicit-any */
import { Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  console.log('======= Migrating up: add social media columns to persons ========');

  await db.schema
    .alterTable('persons')
    .addColumn('linkedin', 'text')
    .addColumn('twitter', 'text')
    .addColumn('facebook', 'text')
    .addColumn('instagram', 'text')
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  console.log('====== Migrating down: drop social media columns from persons =======');

  await db.schema
    .alterTable('persons')
    .dropColumn('linkedin')
    .dropColumn('twitter')
    .dropColumn('facebook')
    .dropColumn('instagram')
    .execute();
}
