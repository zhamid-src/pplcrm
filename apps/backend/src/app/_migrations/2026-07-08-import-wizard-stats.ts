import type { Kysely } from 'kysely';
import { sql } from 'kysely';

/**
 * CSV import wizard (spec §17) needs a few extra facts per import that the
 * legacy `data_imports` table didn't track:
 *
 *  - merged_count: rows folded into an existing person ("Merge into existing"
 *    duplicate decision) rather than inserted as a new row.
 *  - tags_applied: the wizard lets a staffer apply several comma-separated
 *    tags in one run (data_imports.tag_name only ever held the single
 *    auto-generated "Imported-YYYYMMDD-HHmm" tag).
 *  - source_file_key / source_file_size: the History page keeps the original
 *    uploaded file downloadable for 90 days (§17 footer copy) — previously
 *    only the parsed-rows JSON payload was stored, and it was deleted right
 *    after processing.
 *  - skip_reasons: per-row reasons for skipped rows, so History can offer a
 *    "download skipped rows" CSV instead of just a count.
 *
 * All four are additive/nullable-with-defaults so existing rows stay valid.
 */
export async function up(db: Kysely<any>): Promise<void> {
  await sql`ALTER TABLE public.data_imports ADD COLUMN IF NOT EXISTS merged_count integer DEFAULT 0 NOT NULL`.execute(
    db,
  );
  await sql`ALTER TABLE public.data_imports ADD COLUMN IF NOT EXISTS tags_applied jsonb DEFAULT '[]'::jsonb NOT NULL`.execute(
    db,
  );
  await sql`ALTER TABLE public.data_imports ADD COLUMN IF NOT EXISTS source_file_key text`.execute(db);
  await sql`ALTER TABLE public.data_imports ADD COLUMN IF NOT EXISTS source_file_size bigint`.execute(db);
  await sql`ALTER TABLE public.data_imports ADD COLUMN IF NOT EXISTS skip_reasons jsonb DEFAULT '[]'::jsonb NOT NULL`.execute(
    db,
  );
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`ALTER TABLE public.data_imports DROP COLUMN IF EXISTS skip_reasons`.execute(db);
  await sql`ALTER TABLE public.data_imports DROP COLUMN IF EXISTS source_file_size`.execute(db);
  await sql`ALTER TABLE public.data_imports DROP COLUMN IF EXISTS source_file_key`.execute(db);
  await sql`ALTER TABLE public.data_imports DROP COLUMN IF EXISTS tags_applied`.execute(db);
  await sql`ALTER TABLE public.data_imports DROP COLUMN IF EXISTS merged_count`.execute(db);
}
