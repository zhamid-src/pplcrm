import type { Kysely } from 'kysely';
import { sql } from 'kysely';

/**
 * Forms "living-funnel" rebuild (North Star). Extends `web_forms` from the old active|archived
 * editor model to a draft→published→archived lifecycle with a public slug, per-form distribution
 * copy (submit label, thank-you card, confirmation email), and a team-notify toggle. Also adds
 * `form_submissions` so each response is a durable record (answers + person FK) rather than only a
 * `user_activity` count.
 *
 * Donation forms (`form_type IN ('donation','recurring_donation')`) are intentionally left on the
 * existing server-rendered path — they keep `type = NULL` and are filtered out of the new Forms page.
 */
export async function up(db: Kysely<any>): Promise<void> {
  // 1. New columns (idempotent).
  await sql`
    ALTER TABLE public.web_forms
      ADD COLUMN IF NOT EXISTS type            text,
      ADD COLUMN IF NOT EXISTS slug            text,
      ADD COLUMN IF NOT EXISTS submit_label    text,
      ADD COLUMN IF NOT EXISTS thanks_title    text,
      ADD COLUMN IF NOT EXISTS thanks_body     text,
      ADD COLUMN IF NOT EXISTS confirm_subject text,
      ADD COLUMN IF NOT EXISTS confirm_body    text,
      ADD COLUMN IF NOT EXISTS notify_team_on  boolean NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS archived_at     timestamptz
  `.execute(db);

  // 2. Status: replace the active|archived CHECK with draft|published|archived, mapping active→published.
  await sql`ALTER TABLE public.web_forms DROP CONSTRAINT IF EXISTS chk_web_forms_status`.execute(db);
  await sql`UPDATE public.web_forms SET status = 'published' WHERE status = 'active'`.execute(db);
  await sql`ALTER TABLE public.web_forms ALTER COLUMN status SET DEFAULT 'draft'`.execute(db);
  await sql`
    ALTER TABLE public.web_forms
      ADD CONSTRAINT chk_web_forms_status
      CHECK (status = ANY (ARRAY['draft'::text, 'published'::text, 'archived'::text]))
  `.execute(db);

  // 3. Backfill the new columns for existing non-donation forms.
  await sql`
    UPDATE public.web_forms
    SET type = 'signup'
    WHERE type IS NULL
      AND form_type NOT IN ('donation', 'recurring_donation')
  `.execute(db);

  await sql`
    UPDATE public.web_forms
    SET notify_team_on = send_alert,
        submit_label    = COALESCE(submit_label, 'Submit'),
        thanks_title    = COALESCE(thanks_title, 'Thank you!'),
        thanks_body     = COALESCE(thanks_body, 'Your response has been recorded.'),
        confirm_subject = COALESCE(confirm_subject, 'Thanks for your submission'),
        confirm_body    = COALESCE(confirm_body, 'Hi [First name],' || chr(10) || chr(10) ||
                                   'Thanks for your submission — we''ve received it and will be in touch.')
  `.execute(db);

  // 4. Generate a slug per form, unique within a tenant. Duplicates within a tenant get a numeric
  //    suffix by creation order; blank/symbol-only names fall back to a short id-derived slug.
  await sql`
    WITH slugged AS (
      SELECT
        id,
        tenant_id,
        COALESCE(
          NULLIF(lower(regexp_replace(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'), '(^-+|-+$)', '', 'g')), ''),
          'form-' || substring(id::text from 1 for 8)
        ) AS base,
        row_number() OVER (
          PARTITION BY tenant_id,
            COALESCE(
              NULLIF(lower(regexp_replace(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'), '(^-+|-+$)', '', 'g')), ''),
              'form-' || substring(id::text from 1 for 8)
            )
          ORDER BY created_at, id
        ) AS rn
      FROM public.web_forms
      WHERE slug IS NULL
    )
    UPDATE public.web_forms w
    SET slug = CASE WHEN s.rn = 1 THEN s.base ELSE s.base || '-' || s.rn END
    FROM slugged s
    WHERE w.id = s.id
  `.execute(db);

  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_web_forms_tenant_slug
      ON public.web_forms (tenant_id, slug)
      WHERE slug IS NOT NULL
  `.execute(db);

  // 5. Durable submission records: answers snapshot + person FK.
  await sql`
    CREATE TABLE IF NOT EXISTS public.form_submissions (
      id         uuid        DEFAULT gen_random_uuid() NOT NULL,
      tenant_id  bigint      NOT NULL,
      form_id    uuid        NOT NULL,
      person_id  bigint      NOT NULL,
      answers    jsonb       NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (tenant_id, id)
    )
  `.execute(db);

  await sql`
    CREATE INDEX IF NOT EXISTS idx_form_submissions_tenant_form
      ON public.form_submissions (tenant_id, form_id, created_at DESC)
  `.execute(db);

  await sql`
    CREATE INDEX IF NOT EXISTS idx_form_submissions_person
      ON public.form_submissions (tenant_id, person_id)
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`DROP TABLE IF EXISTS public.form_submissions`.execute(db);
  await sql`DROP INDEX IF EXISTS public.idx_web_forms_tenant_slug`.execute(db);
  await sql`ALTER TABLE public.web_forms DROP CONSTRAINT IF EXISTS chk_web_forms_status`.execute(db);
  await sql`UPDATE public.web_forms SET status = 'active' WHERE status IN ('published', 'draft')`.execute(db);
  await sql`ALTER TABLE public.web_forms ALTER COLUMN status SET DEFAULT 'active'`.execute(db);
  await sql`
    ALTER TABLE public.web_forms
      ADD CONSTRAINT chk_web_forms_status
      CHECK (status = ANY (ARRAY['active'::text, 'archived'::text]))
  `.execute(db);
  await sql`
    ALTER TABLE public.web_forms
      DROP COLUMN IF EXISTS type,
      DROP COLUMN IF EXISTS slug,
      DROP COLUMN IF EXISTS submit_label,
      DROP COLUMN IF EXISTS thanks_title,
      DROP COLUMN IF EXISTS thanks_body,
      DROP COLUMN IF EXISTS confirm_subject,
      DROP COLUMN IF EXISTS confirm_body,
      DROP COLUMN IF EXISTS notify_team_on,
      DROP COLUMN IF EXISTS archived_at
  `.execute(db);
}
