import { Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema.alterTable('households').addColumn('address_fp_street', 'text').execute();

  await db.schema.alterTable('households').addColumn('address_fp_full', 'text').execute();

  await db.schema.createIndex('idx_households_fp_street').on('households').column('address_fp_street').execute();

  await db.schema.createIndex('idx_households_fp_full').on('households').column('address_fp_full').execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropIndex('idx_households_fp_full').ifExists().execute();
  await db.schema.dropIndex('idx_households_fp_street').ifExists().execute();
  await db.schema.alterTable('households').dropColumn('address_fp_full').execute();
  await db.schema.alterTable('households').dropColumn('address_fp_street').execute();
}
