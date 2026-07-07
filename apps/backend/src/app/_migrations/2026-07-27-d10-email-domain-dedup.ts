import type { Kysely } from 'kysely';
import { sql } from 'kysely';

/**
 * D-10 (schema review 2026-07-06 §7): remove duplicated facts in the email domain.
 *
 * Each duplicated fact gets exactly one normalized home; the copy is dropped or
 * demoted to a documented, derived display cache:
 *
 * - `emails.body` → dropped. `email_bodies.body_html` is the body's home (the 1:1
 *   split exists to keep the blob out of list scans). No code reads or writes
 *   `emails.body`; any legacy value that never made it into `email_bodies` is
 *   preserved by the backfill below before the column is dropped.
 * - `emails.to_email` → kept, but documented as a display-only cache of the To
 *   list. `email_recipients` is the source of truth (both writers — the provider
 *   ingester and the local send path — populate it for every email).
 * - `data_imports.tag_name` → kept as the name requested at import time; it is
 *   the only surviving label once the tag is deleted (tag deletion nulls
 *   `tag_id`, see tags.repo.ts). While the tag exists, `tags.name` via `tag_id`
 *   is the truth — the imports list now resolves the live name first.
 *
 * `emails.preview` stays: legitimately derived (and doubles as the provider
 * dedupe key, already documented at its call sites).
 *
 * The backfill runs before any tenant context exists, so the S-1 RLS policy
 * ("unset GUC = allow all") does not filter it.
 */
export async function up(db: Kysely<any>): Promise<void> {
  // Preserve legacy bodies that only exist on the emails row before dropping it.
  await sql`
    INSERT INTO public.email_bodies (tenant_id, email_id, body_html, createdby_id, updatedby_id)
    SELECT e.tenant_id, e.id, e.body, e.createdby_id, e.updatedby_id
    FROM public.emails e
    WHERE e.body IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM public.email_bodies b WHERE b.email_id = e.id)
  `.execute(db);

  await sql`ALTER TABLE public.emails DROP COLUMN IF EXISTS body`.execute(db);

  await sql`
    COMMENT ON COLUMN public.emails.to_email IS
      'Display-only cache of the To list; email_recipients is the source of truth (D-10)'
  `.execute(db);
  await sql`
    COMMENT ON COLUMN public.data_imports.tag_name IS
      'Tag name requested at import time; label of record once the tag is deleted. While the tag exists, tags.name via tag_id is the source of truth (D-10)'
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  // The dropped column's data is not restorable; the body lives in email_bodies.
  await sql`ALTER TABLE public.emails ADD COLUMN IF NOT EXISTS body text`.execute(db);
  await sql`COMMENT ON COLUMN public.emails.to_email IS NULL`.execute(db);
  await sql`COMMENT ON COLUMN public.data_imports.tag_name IS NULL`.execute(db);
}
