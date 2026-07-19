import type { Kysely } from 'kysely';
import { sql } from 'kysely';

/**
 * Automation send compliance (spec: automated newsletters, slice A):
 *  - workflow_runs.status gains 'skipped' — a send_email step withheld because the recipient is
 *    suppressed, do-not-contact, or unsubscribed is neither a success nor a failure; it must
 *    narrate honestly ("Skipped — unsubscribed") without tripping failure counts.
 *  - newsletter_send_log.newsletter_id becomes nullable and a `source` column distinguishes
 *    'newsletter' batches from per-recipient 'automation' sends. Because the cap meters SUM the
 *    whole table (send-guards.ts sentEmailsSince), automation volume now counts toward the
 *    warm-up, hourly, and monthly allowances automatically.
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`ALTER TABLE public.workflow_runs DROP CONSTRAINT IF EXISTS chk_workflow_runs_status`.execute(db);
  await sql`
    ALTER TABLE public.workflow_runs
      ADD CONSTRAINT chk_workflow_runs_status
      CHECK ((status = ANY (ARRAY['success'::text, 'failed'::text, 'skipped'::text])))
  `.execute(db);

  await sql`ALTER TABLE public.newsletter_send_log ALTER COLUMN newsletter_id DROP NOT NULL`.execute(db);
  await sql`
    ALTER TABLE public.newsletter_send_log
      ADD COLUMN IF NOT EXISTS source text DEFAULT 'newsletter' NOT NULL,
      ADD CONSTRAINT chk_newsletter_send_log_source
        CHECK ((source = ANY (ARRAY['newsletter'::text, 'automation'::text])))
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`DELETE FROM public.newsletter_send_log WHERE newsletter_id IS NULL`.execute(db);
  await sql`
    ALTER TABLE public.newsletter_send_log
      DROP CONSTRAINT IF EXISTS chk_newsletter_send_log_source,
      DROP COLUMN IF EXISTS source
  `.execute(db);
  await sql`ALTER TABLE public.newsletter_send_log ALTER COLUMN newsletter_id SET NOT NULL`.execute(db);

  await sql`UPDATE public.workflow_runs SET status = 'failed', error = COALESCE(error, 'skipped') WHERE status = 'skipped'`.execute(
    db,
  );
  await sql`ALTER TABLE public.workflow_runs DROP CONSTRAINT IF EXISTS chk_workflow_runs_status`.execute(db);
  await sql`
    ALTER TABLE public.workflow_runs
      ADD CONSTRAINT chk_workflow_runs_status
      CHECK ((status = ANY (ARRAY['success'::text, 'failed'::text])))
  `.execute(db);
}
