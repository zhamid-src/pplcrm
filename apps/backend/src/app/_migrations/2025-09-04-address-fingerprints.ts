/* eslint-disable @typescript-eslint/no-explicit-any */
import { Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable('households')
    .addColumn('address_fp_street', 'text')
    .addColumn('address_fp_full', 'text')
    .execute();

  await db.schema
    .createIndex('households_fp_street_idx')
    .on('households')
    .columns(['tenant_id', 'campaign_id', 'address_fp_street'])
    .execute();

  await db.schema
    .createIndex('households_fp_full_idx')
    .on('households')
    .columns(['tenant_id', 'campaign_id', 'address_fp_full'])
    .execute();

  // Backfill fingerprints for existing rows (best-effort basic normalization in SQL)
  await db
    .updateTable('households')
    .set((eb) => ({
      address_fp_street: eb
        .fn('regexp_replace', [
          eb.fn('regexp_replace', [
            eb.fn('lower', [
              eb.fn('concat', [
                eb.fn('coalesce', ['street_num', eb.val('')]),
                eb.val(' '),
                eb.fn('coalesce', ['street1', eb.val('')]),
                eb.val(' '),
                eb.fn('coalesce', ['street2', eb.val('')]),
              ]),
            ]),
            eb.val('[^a-z0-9\\s]'),
            eb.val(' '),
            eb.val('g'),
          ]),
          eb.val('\\s+'),
          eb.val(' '),
          eb.val('g'),
        ]),
      address_fp_full: eb
        .fn('regexp_replace', [
          eb.fn('regexp_replace', [
            eb.fn('lower', [
              eb.fn('concat', [
                eb.fn('coalesce', ['apt', eb.val('')]),
                eb.val(' '),
                eb.fn('coalesce', ['street_num', eb.val('')]),
                eb.val(' '),
                eb.fn('coalesce', ['street1', eb.val('')]),
                eb.val(' '),
                eb.fn('coalesce', ['street2', eb.val('')]),
                eb.val(' '),
                eb.fn('coalesce', ['city', eb.val('')]),
                eb.val(' '),
                eb.fn('coalesce', ['state', eb.val('')]),
                eb.val(' '),
                eb.fn('coalesce', ['zip', eb.val('')]),
                eb.val(' '),
                eb.fn('coalesce', ['country', eb.val('')]),
              ]),
            ]),
            eb.val('[^a-z0-9\\s]'),
            eb.val(' '),
            eb.val('g'),
          ]),
          eb.val('\\s+'),
          eb.val(' '),
          eb.val('g'),
        ]),
    }))
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropIndex('households_fp_full_idx').ifExists().execute();
  await db.schema.dropIndex('households_fp_street_idx').ifExists().execute();
  await db.schema
    .alterTable('households')
    .dropColumn('address_fp_full')
    .dropColumn('address_fp_street')
    .execute();
}
