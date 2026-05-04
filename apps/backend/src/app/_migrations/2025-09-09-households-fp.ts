import { Kysely } from 'kysely';

/**
 * Adds address fingerprint columns to the `households` table.
 * These are used for household deduplication during imports and address matching.
 *
 * - `address_fp_street`: normalized fingerprint of street-level fields (street_num, street1, street2)
 * - `address_fp_full`: normalized fingerprint of all address fields
 */
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable('households')
    .addColumn('address_fp_street', 'text')
    .execute();

  await db.schema
    .alterTable('households')
    .addColumn('address_fp_full', 'text')
    .execute();

  await db.schema
    .createIndex('idx_households_fp_street')
    .on('households')
    .column('address_fp_street')
    .execute();

  await db.schema
    .createIndex('idx_households_fp_full')
    .on('households')
    .column('address_fp_full')
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropIndex('idx_households_fp_full').ifExists().execute();
  await db.schema.dropIndex('idx_households_fp_street').ifExists().execute();
  await db.schema.alterTable('households').dropColumn('address_fp_full').execute();
  await db.schema.alterTable('households').dropColumn('address_fp_street').execute();
}
