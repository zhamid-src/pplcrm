/* eslint-disable @typescript-eslint/no-explicit-any */
import { Kysely } from 'kysely';

/**
 * Make donations self-contained for financial / tax-receipt purposes.
 *
 * Problem
 * ───────
 * The donations table only stored person_id as a link to the persons table.
 * If a contact is later deleted, the donation record loses all donor identity
 * information (name, email) needed to issue tax receipts — even though the
 * person_id FK is now SET NULL so the row itself survives.
 *
 * Solution
 * ────────
 * Denormalize the donor's first name, last name, and email directly onto the
 * donations row at the moment of recording. These are snapshots — they remain
 * immutable even if the person record changes or is deleted.
 *
 * person_id is also made nullable here so the SET NULL FK action (added in
 * 2026-07-08) is consistent with the column definition.
 */
export async function up(db: Kysely<any>): Promise<void> {
  console.log('======= Migrating up: donations donor snapshot columns ========');

  await db.schema
    .alterTable('donations')
    // Snapshot of donor identity at the time of donation — immutable.
    .addColumn('donor_first_name', 'text')
    .addColumn('donor_last_name', 'text')
    .addColumn('donor_email', 'text')
    .execute();

  // Make person_id nullable — the SET NULL FK action requires the column to
  // accept NULL, and conceptually a donation can exist without an active contact.
  await db.schema.alterTable('donations').alterColumn('person_id', (col) => col.dropNotNull()).execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  console.log('======= Migrating down: donations donor snapshot columns =======');

  await db.schema
    .alterTable('donations')
    .dropColumn('donor_first_name')
    .dropColumn('donor_last_name')
    .dropColumn('donor_email')
    .execute();

  // Re-apply NOT NULL on person_id (best effort; may fail if NULLs exist)
  await db.schema.alterTable('donations').alterColumn('person_id', (col) => col.setNotNull()).execute();
}
