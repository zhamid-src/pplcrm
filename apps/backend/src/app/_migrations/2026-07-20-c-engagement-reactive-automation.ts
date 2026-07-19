import type { Kysely } from 'kysely';
import { sql } from 'kysely';

/**
 * Engagement-reactive automation (spec: automated newsletters, drip follow-up):
 *  - workflow_runs gains opened_at / clicked_at — automation emails now send through SendGrid
 *    with a workflow_run_id custom arg, and the event webhook stamps engagement back onto the
 *    run. Step conditions ("only send if the previous email wasn't opened") and exit goals
 *    read these columns.
 *  - workflows.exit_conditions (jsonb string[]) — sequence-level goals that end an enrollment
 *    early ("stop once they donate / open / click"), and workflow_enrollments.status gains
 *    'exited' to record that outcome distinctly from completing every step.
 *  - newsletter_schedules loses `mode` — recurring auto-send of identical static content has
 *    no industry precedent (auto-send always has a content feed) and was removed; every firing
 *    now creates a reviewable draft.
 *  - newsletters.resend_of_id — a one-shot follow-up of a sent newsletter targeted at the
 *    recipients who didn't open or click it. The partial unique index enforces at most one
 *    resend per original.
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    ALTER TABLE public.workflow_runs
      ADD COLUMN IF NOT EXISTS opened_at timestamptz,
      ADD COLUMN IF NOT EXISTS clicked_at timestamptz
  `.execute(db);

  await sql`ALTER TABLE public.workflows ADD COLUMN IF NOT EXISTS exit_conditions jsonb`.execute(db);

  await sql`ALTER TABLE public.workflow_enrollments DROP CONSTRAINT IF EXISTS chk_workflow_enrollments_status`.execute(
    db,
  );
  await sql`
    ALTER TABLE public.workflow_enrollments
      ADD CONSTRAINT chk_workflow_enrollments_status
      CHECK (((status IS NULL) OR (status = ANY (ARRAY['active'::text, 'completed'::text, 'cancelled'::text, 'exited'::text]))))
  `.execute(db);

  await sql`ALTER TABLE public.newsletter_schedules DROP COLUMN IF EXISTS mode`.execute(db);

  await sql`
    ALTER TABLE public.newsletters
      ADD COLUMN IF NOT EXISTS resend_of_id bigint REFERENCES public.newsletters(id) ON DELETE SET NULL
  `.execute(db);
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_newsletters_resend_of_id
      ON public.newsletters (resend_of_id) WHERE resend_of_id IS NOT NULL
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`DROP INDEX IF EXISTS idx_newsletters_resend_of_id`.execute(db);
  await sql`ALTER TABLE public.newsletters DROP COLUMN IF EXISTS resend_of_id`.execute(db);

  await sql`
    ALTER TABLE public.newsletter_schedules
      ADD COLUMN IF NOT EXISTS mode text DEFAULT 'draft' NOT NULL
        CONSTRAINT chk_newsletter_schedules_mode CHECK ((mode = ANY (ARRAY['draft'::text, 'auto'::text])))
  `.execute(db);

  await sql`UPDATE public.workflow_enrollments SET status = 'completed' WHERE status = 'exited'`.execute(db);
  await sql`ALTER TABLE public.workflow_enrollments DROP CONSTRAINT IF EXISTS chk_workflow_enrollments_status`.execute(
    db,
  );
  await sql`
    ALTER TABLE public.workflow_enrollments
      ADD CONSTRAINT chk_workflow_enrollments_status
      CHECK (((status IS NULL) OR (status = ANY (ARRAY['active'::text, 'completed'::text, 'cancelled'::text]))))
  `.execute(db);

  await sql`ALTER TABLE public.workflows DROP COLUMN IF EXISTS exit_conditions`.execute(db);

  await sql`
    ALTER TABLE public.workflow_runs
      DROP COLUMN IF EXISTS opened_at,
      DROP COLUMN IF EXISTS clicked_at
  `.execute(db);
}
