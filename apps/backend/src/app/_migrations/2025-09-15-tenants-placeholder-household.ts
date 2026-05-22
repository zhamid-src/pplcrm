import { Kysely } from 'kysely';

/**
 * Add placeholder_household_id to the tenants table.
 * This references the single permanent "no-address" household created at tenant
 * sign-up. Storing it here (one value per tenant) avoids a boolean column on
 * every household row.
 */
export async function up(db: Kysely<any>) {
  await db.schema
    .alterTable('tenants')
    .addColumn('placeholder_household_id', 'bigint', (col) => col.references('households.id').onDelete('set null'))
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema.alterTable('tenants').dropColumn('placeholder_household_id').execute();
}
