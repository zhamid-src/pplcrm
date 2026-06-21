/* eslint-disable @typescript-eslint/no-explicit-any */
import { Kysely, sql } from 'kysely';

/**
 * Add ON DELETE CASCADE to the household_id foreign keys in the two mapping tables.
 * This ensures that when a household is deleted (e.g. after a merge), its tag and
 * list associations are automatically cleaned up by the database, preventing orphaned rows.
 */
export async function up(db: Kysely<any>): Promise<void> {
  console.log('======= Migrating up: cascade household FK constraints ========');

  // map_households_tags: drop existing FK and recreate with CASCADE
  await sql`
    ALTER TABLE map_households_tags
      DROP CONSTRAINT IF EXISTS map_households_tags_household_id_fkey,
      ADD CONSTRAINT map_households_tags_household_id_fkey
        FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE
  `.execute(db);

  // map_lists_households: drop existing FK and recreate with CASCADE
  await sql`
    ALTER TABLE map_lists_households
      DROP CONSTRAINT IF EXISTS map_lists_households_household_id_fkey,
      ADD CONSTRAINT map_lists_households_household_id_fkey
        FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  console.log('====== Migrating down: cascade household FK constraints =======');

  // Restore FKs without CASCADE
  await sql`
    ALTER TABLE map_households_tags
      DROP CONSTRAINT IF EXISTS map_households_tags_household_id_fkey,
      ADD CONSTRAINT map_households_tags_household_id_fkey
        FOREIGN KEY (household_id) REFERENCES households(id)
  `.execute(db);

  await sql`
    ALTER TABLE map_lists_households
      DROP CONSTRAINT IF EXISTS map_lists_households_household_id_fkey,
      ADD CONSTRAINT map_lists_households_household_id_fkey
        FOREIGN KEY (household_id) REFERENCES households(id)
  `.execute(db);
}
