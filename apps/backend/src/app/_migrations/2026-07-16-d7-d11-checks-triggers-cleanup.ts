import type { Kysely } from 'kysely';
import { sql } from 'kysely';

/**
 * D-7 / D-11: Status CHECK constraints, updated_at triggers, and dead-object
 * cleanup (schema review 2026-07-06, §3).
 *
 * D-7 — CHECK constraints. Added only for columns whose complete valid value
 * set is authoritative (a Zod enum in libs/common, or an unambiguous code-level
 * state machine). Deriving the set from the app is the review's stated rule
 * ("the Zod schemas are the source of truth"). Columns whose value set is
 * genuinely free-form or could not be pinned to an authoritative source are
 * DEFERRED rather than constrained with a guessed list that might reject a
 * valid production write:
 *   - persons.preferred_contact  (Zod: z.string().max(20) — free text)
 *   - persons.opt_in_status      (consent state machine incl. unsubscribe paths)
 *   - donations.status, data_imports.status, data_exports.status,
 *     webhook_events.status, notifications.type, task_subtasks.status
 *     (no authoritative enum; pin down and add in a follow-up)
 * All constraints are written NULL-tolerant so they are safe on nullable columns.
 *
 * D-11 — updated_at triggers. Every base table that has an `updated_at` column
 * but no BEFORE UPDATE trigger calling set_updated_at() gets one, matching the
 * existing `trg_<table>_updated_at` naming. Append-only tables (form_submissions,
 * newsletter_events) correctly omit the column and are naturally skipped.
 *
 * Cleanup — drop the orphaned enum type `recipient_kind` (email_recipients.kind
 * is text+CHECK, verified unused) and the orphaned function
 * sync_email_has_attachments() (no trigger references it).
 */
export async function up(db: Kysely<any>): Promise<void> {
  // --- D-7: CHECK constraints (drop-then-add for idempotency) ---
  await sql`
    ALTER TABLE public.emails DROP CONSTRAINT IF EXISTS chk_emails_status;
    ALTER TABLE public.emails ADD CONSTRAINT chk_emails_status
      CHECK (status IS NULL OR status IN ('open','closed'));

    ALTER TABLE public.workflows DROP CONSTRAINT IF EXISTS chk_workflows_status;
    ALTER TABLE public.workflows ADD CONSTRAINT chk_workflows_status
      CHECK (status IS NULL OR status IN ('draft','active','paused'));

    ALTER TABLE public.workflow_enrollments DROP CONSTRAINT IF EXISTS chk_workflow_enrollments_status;
    ALTER TABLE public.workflow_enrollments ADD CONSTRAINT chk_workflow_enrollments_status
      CHECK (status IS NULL OR status IN ('active','completed','cancelled'));

    ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS chk_tasks_priority;
    ALTER TABLE public.tasks ADD CONSTRAINT chk_tasks_priority
      CHECK (priority IS NULL OR priority IN ('low','medium','high','urgent'));

    ALTER TABLE public.web_forms DROP CONSTRAINT IF EXISTS chk_web_forms_form_type;
    ALTER TABLE public.web_forms ADD CONSTRAINT chk_web_forms_form_type
      CHECK (form_type IS NULL OR form_type IN ('standard','donation','recurring_donation'));

    ALTER TABLE public.households DROP CONSTRAINT IF EXISTS chk_households_geocoding_status;
    ALTER TABLE public.households ADD CONSTRAINT chk_households_geocoding_status
      CHECK (geocoding_status IS NULL OR geocoding_status IN ('pending','success','failed'));
  `.execute(db);

  // --- D-11: updated_at triggers for every table missing one ---
  await sql`
    DO $$
    DECLARE r record;
    BEGIN
      FOR r IN
        SELECT c.relname
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = 'public'
        JOIN pg_attribute a ON a.attrelid = c.oid AND a.attname = 'updated_at' AND NOT a.attisdropped
        WHERE c.relkind = 'r'
          AND NOT EXISTS (
            SELECT 1 FROM pg_trigger t
            WHERE t.tgrelid = c.oid AND NOT t.tgisinternal
              AND pg_get_triggerdef(t.oid) ILIKE '%set_updated_at%'
          )
      LOOP
        EXECUTE format(
          'CREATE TRIGGER trg_%I_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION set_updated_at()',
          r.relname, r.relname);
      END LOOP;
    END $$;
  `.execute(db);

  // --- Cleanup: drop orphaned type and function ---
  await sql`DROP TYPE IF EXISTS public.recipient_kind;`.execute(db);
  await sql`DROP FUNCTION IF EXISTS public.sync_email_has_attachments();`.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`
    ALTER TABLE public.emails DROP CONSTRAINT IF EXISTS chk_emails_status;
    ALTER TABLE public.workflows DROP CONSTRAINT IF EXISTS chk_workflows_status;
    ALTER TABLE public.workflow_enrollments DROP CONSTRAINT IF EXISTS chk_workflow_enrollments_status;
    ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS chk_tasks_priority;
    ALTER TABLE public.web_forms DROP CONSTRAINT IF EXISTS chk_web_forms_form_type;
    ALTER TABLE public.households DROP CONSTRAINT IF EXISTS chk_households_geocoding_status;
  `.execute(db);
  // The updated_at triggers and the dropped orphan type/function are intentionally
  // not reverted: dropping trg_*_updated_at could remove triggers that predated
  // this migration, and recreating unused objects serves no purpose.
}
