/* eslint-disable @typescript-eslint/no-explicit-any */
import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  console.log('======= Migrating up: support household/company duplicates in potential_duplicates ========');

  // Make person_id nullable
  await sql`ALTER TABLE potential_duplicates ALTER COLUMN person_id DROP NOT NULL`.execute(db);

  // Add household_id and company_id columns with FK constraints
  await db.schema
    .alterTable('potential_duplicates')
    .addColumn('household_id', 'bigint', (col) =>
      col.references('households.id').onDelete('cascade'),
    )
    .addColumn('company_id', 'bigint', (col) =>
      col.references('companies.id').onDelete('cascade'),
    )
    .execute();

  // Create indexes for the new columns
  await sql`CREATE INDEX IF NOT EXISTS idx_potential_duplicates_household_id ON potential_duplicates(household_id) WHERE household_id IS NOT NULL`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_potential_duplicates_company_id ON potential_duplicates(company_id) WHERE company_id IS NOT NULL`.execute(db);

  // Create unique constraints for new duplicate types
  await db.schema
    .createIndex('idx_potential_duplicates_unique_group_household')
    .on('potential_duplicates')
    .columns(['group_key', 'household_id'])
    .unique()
    .where('household_id', 'is not', null)
    .execute();

  await db.schema
    .createIndex('idx_potential_duplicates_unique_group_company')
    .on('potential_duplicates')
    .columns(['group_key', 'company_id'])
    .unique()
    .where('company_id', 'is not', null)
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  console.log('======= Migrating down: remove household/company duplicates from potential_duplicates ========');

  await db.schema.dropIndex('idx_potential_duplicates_unique_group_company').ifExists().execute();
  await db.schema.dropIndex('idx_potential_duplicates_unique_group_household').ifExists().execute();
  await db.schema.dropIndex('idx_potential_duplicates_company_id').ifExists().execute();
  await db.schema.dropIndex('idx_potential_duplicates_household_id').ifExists().execute();

  await db.schema.alterTable('potential_duplicates').dropColumn('company_id').execute();
  await db.schema.alterTable('potential_duplicates').dropColumn('household_id').execute();

  // Make person_id not null again (after cleaning up any records where person_id is null)
  await db.deleteFrom('potential_duplicates').where('person_id', 'is', null).execute();
  await sql`ALTER TABLE potential_duplicates ALTER COLUMN person_id SET NOT NULL`.execute(db);
}
