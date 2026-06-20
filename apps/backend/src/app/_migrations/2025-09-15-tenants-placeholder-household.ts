import { Kysely } from 'kysely';

export async function up(db: Kysely<any>) {
  await db.schema
    .alterTable('tenants')
    .addColumn('placeholder_household_id', 'bigint', (col) => col.references('households.id').onDelete('set null'))
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema.alterTable('tenants').dropColumn('placeholder_household_id').execute();
}
