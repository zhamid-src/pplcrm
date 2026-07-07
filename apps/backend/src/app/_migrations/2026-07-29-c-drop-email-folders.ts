import type { Kysely } from 'kysely';
import { sql } from 'kysely';

/**
 * Schema review 2026-07-06 follow-up — drop the `email_folders` table.
 *
 * Folders are a fixed, code-defined taxonomy (EMAIL_FOLDERS in
 * libs/common/src/lib/emails.ts); the API serves folders from that constant
 * and never reads this table. It survived only as an FK anchor for
 * emails.folder_id / email_trash.from_folder_id, implemented as globally
 * shared rows with hardcoded ids — which contradicted the tenant model:
 * lazy-create with an unscoped-query lint exemption, a vestigial tenant_id
 * column, and a tenant-deletion trap (deleting the row-owning tenant could
 * cascade away other tenants' email_trash rows via fk_email_trash_folder).
 *
 * The FKs' integrity job is replaced by CHECK constraints pinned to the six
 * REAL folder ids — Sent 3, Spam 4, Trash 5, Drafts 7, Outbox 10, Inbox 11
 * (snapshot of EMAIL_FOLDERS at migration time; virtual folder ids
 * 1/2/6/8/9 are query filters and must never be stored). This is stricter
 * than the FKs were: a virtual-folder row in the table would have satisfied
 * the FK, but fails the CHECK. Adding a future real folder means a new
 * migration extending the CHECK — consistent with folders being code-defined
 * (a deploy is already required). tRPC inputs are tightened to the same set.
 */

export async function up(db: Kysely<any>): Promise<void> {
  // Normalize strays to Inbox (11) so the CHECKs can validate. No such rows
  // are expected — the FKs prevented ids without a folder row — but a
  // virtual-folder id could have slipped in if a row for it ever existed.
  await sql`
    UPDATE public.emails SET folder_id = 11 WHERE folder_id NOT IN (3, 4, 5, 7, 10, 11);
    UPDATE public.email_trash SET from_folder_id = 11 WHERE from_folder_id NOT IN (3, 4, 5, 7, 10, 11);
  `.execute(db);

  await sql`
    ALTER TABLE public.emails DROP CONSTRAINT IF EXISTS fk_emails_folder;
    ALTER TABLE public.email_trash DROP CONSTRAINT IF EXISTS fk_email_trash_folder;

    ALTER TABLE public.emails DROP CONSTRAINT IF EXISTS chk_emails_folder_id;
    ALTER TABLE public.emails ADD CONSTRAINT chk_emails_folder_id
      CHECK (folder_id IN (3, 4, 5, 7, 10, 11));

    ALTER TABLE public.email_trash DROP CONSTRAINT IF EXISTS chk_email_trash_from_folder_id;
    ALTER TABLE public.email_trash ADD CONSTRAINT chk_email_trash_from_folder_id
      CHECK (from_folder_id IN (3, 4, 5, 7, 10, 11));
  `.execute(db);

  // idx_email_trash_folder existed only as the RI hot-path index for the
  // dropped FK (2026-07-14-i3); nothing queries by from_folder_id.
  await sql`DROP INDEX IF EXISTS public.idx_email_trash_folder`.execute(db);

  // Owned sequence email_folders_id_seq and any RLS policy drop with it.
  await sql`DROP TABLE IF EXISTS public.email_folders`.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS public.email_folders (
      id bigint NOT NULL,
      tenant_id bigint NOT NULL,
      name text NOT NULL,
      icon text,
      sort_order integer DEFAULT 0,
      is_default boolean DEFAULT false,
      createdby_id bigint NOT NULL,
      updatedby_id bigint NOT NULL,
      created_at timestamp with time zone DEFAULT now() NOT NULL,
      updated_at timestamp with time zone DEFAULT now() NOT NULL,
      CONSTRAINT email_folders_pkey PRIMARY KEY (id)
    );
    CREATE SEQUENCE IF NOT EXISTS public.email_folders_id_seq OWNED BY public.email_folders.id;
    ALTER TABLE public.email_folders ALTER COLUMN id SET DEFAULT nextval('public.email_folders_id_seq');
  `.execute(db);

  // Re-seed the six shared-global rows (attributed to the first tenant/user,
  // matching the old lazy-create behavior) so the FKs below can validate.
  // No-op on a database with no tenants or users — the FKs still validate
  // there because such a database has no emails either.
  await sql`
    INSERT INTO public.email_folders (id, tenant_id, name, icon, sort_order, is_default, createdby_id, updatedby_id)
    SELECT v.id, t.id, v.name, v.icon, v.sort_order, false, u.id, u.id
    FROM (VALUES
      (3, 'Sent', 'paper-airplane', 9),
      (4, 'Spam', 'exclamation-triangle', 11),
      (5, 'Trash', 'trash', 10),
      (7, 'Drafts', 'document', 7),
      (10, 'Outbox', 'clock', 8),
      (11, 'Inbox', 'inbox', 6)
    ) AS v(id, name, icon, sort_order)
    CROSS JOIN (SELECT id FROM public.tenants ORDER BY id LIMIT 1) t
    CROSS JOIN (SELECT id FROM public.authusers ORDER BY id LIMIT 1) u
    ON CONFLICT (id) DO NOTHING;
  `.execute(db);

  await sql`
    ALTER TABLE public.emails DROP CONSTRAINT IF EXISTS chk_emails_folder_id;
    ALTER TABLE public.email_trash DROP CONSTRAINT IF EXISTS chk_email_trash_from_folder_id;

    ALTER TABLE public.emails DROP CONSTRAINT IF EXISTS fk_emails_folder;
    ALTER TABLE public.emails ADD CONSTRAINT fk_emails_folder
      FOREIGN KEY (folder_id) REFERENCES public.email_folders(id);

    ALTER TABLE public.email_trash DROP CONSTRAINT IF EXISTS fk_email_trash_folder;
    ALTER TABLE public.email_trash ADD CONSTRAINT fk_email_trash_folder
      FOREIGN KEY (from_folder_id) REFERENCES public.email_folders(id) ON DELETE CASCADE;

    CREATE INDEX IF NOT EXISTS idx_email_trash_folder ON public.email_trash (from_folder_id);
  `.execute(db);
}
