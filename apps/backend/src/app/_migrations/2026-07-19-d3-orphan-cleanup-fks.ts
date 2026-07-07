import type { Kysely } from 'kysely';
import { sql } from 'kysely';

/**
 * D-3 (continued): Clean up orphaned form_submissions and add its composite FKs
 * (schema review 2026-07-06, §3).
 *
 * At review time every form_submissions row was fully dangling — referencing a
 * web_form / person that no longer exists (the "dangling PII" the review warns
 * about: a parent was deleted but, absent an FK, the child was left behind).
 * Nothing references form_submissions, so deleting rows whose parent is missing
 * is exactly what ON DELETE CASCADE would have done — safe in any environment
 * and idempotent (a no-op once no orphans remain).
 *
 * The composite (id, tenant_id) FK pattern makes a submission unable to point
 * across tenants; both parent columns are NOT NULL, so the FKs are always
 * enforced.
 *
 * email_folders is intentionally NOT given a tenant FK. Despite carrying a
 * tenant_id column, folders are global, shared-across-tenants system rows
 * addressed by hardcoded id only (see emails-api.route.ts: "unscoped by design —
 * email_folders uses global hardcoded IDs; FK references id only, not tenant_id").
 * A CASCADE tenant FK there would let deleting the folder-owning tenant nuke every
 * other tenant's folders, so it is deliberately omitted.
 */
export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    DELETE FROM public.form_submissions fs
    WHERE NOT EXISTS (
            SELECT 1 FROM public.web_forms w
            WHERE w.id = fs.form_id AND w.tenant_id = fs.tenant_id)
       OR NOT EXISTS (
            SELECT 1 FROM public.persons p
            WHERE p.id = fs.person_id AND p.tenant_id = fs.tenant_id);
  `.execute(db);

  await sql`
    ALTER TABLE public.form_submissions DROP CONSTRAINT IF EXISTS fk_form_submissions_form;
    ALTER TABLE public.form_submissions ADD CONSTRAINT fk_form_submissions_form
      FOREIGN KEY (form_id, tenant_id) REFERENCES public.web_forms(id, tenant_id) ON DELETE CASCADE;

    ALTER TABLE public.form_submissions DROP CONSTRAINT IF EXISTS fk_form_submissions_person;
    ALTER TABLE public.form_submissions ADD CONSTRAINT fk_form_submissions_person
      FOREIGN KEY (person_id, tenant_id) REFERENCES public.persons(id, tenant_id) ON DELETE CASCADE;
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  // Deleted orphan rows are not restored (they were invalid by construction).
  await sql`
    ALTER TABLE public.form_submissions DROP CONSTRAINT IF EXISTS fk_form_submissions_person;
    ALTER TABLE public.form_submissions DROP CONSTRAINT IF EXISTS fk_form_submissions_form;
  `.execute(db);
}
