import type { Kysely } from 'kysely';
import { sql } from 'kysely';

// Spec §16 Automations: rebuild the workflow editor from an email-only drip into a mixed
// sequence of step KINDS (wait · send_email · add_tag · create_task · notify_team) with
// ONLY-ENROLL-IF conditions and a per-run history feeding the list's "RUNS 30D / LAST RUN".
//
// This migration is additive on the existing workflows/workflow_steps/workflow_enrollments
// tables (never edits an applied migration; the FORCE-RLS baseline lets a GUC-less backfill
// reach every row, so no per-migration RLS toggle is needed):
//
//   1. workflow_steps.kind    — discriminates the step; the value it carries lives in `config`.
//   2. workflow_steps.config  — jsonb payload per kind (tag_id/task title/team member/etc).
//   3. workflow_steps.subject — was NOT NULL (email-only assumption); non-email steps have none.
//   4. workflows.conditions   — jsonb QueryBuilder group for "ONLY ENROLL IF".
//   5. workflow_runs          — one row per executed step, success or failure, for run history.
export async function up(db: Kysely<any>): Promise<void> {
  // --- workflow_steps: step kind + polymorphic config ------------------------------------
  await sql`
    ALTER TABLE public.workflow_steps
      ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'send_email'
  `.execute(db);
  await sql`
    ALTER TABLE public.workflow_steps
      ADD CONSTRAINT chk_workflow_steps_kind
      CHECK (kind = ANY (ARRAY['wait'::text, 'send_email'::text, 'add_tag'::text, 'create_task'::text, 'notify_team'::text]))
  `.execute(db);
  await sql`ALTER TABLE public.workflow_steps ADD COLUMN IF NOT EXISTS config jsonb`.execute(db);
  // Non-email steps carry no subject; relax the historical NOT NULL.
  await sql`ALTER TABLE public.workflow_steps ALTER COLUMN subject DROP NOT NULL`.execute(db);

  // --- workflows: ONLY-ENROLL-IF conditions ----------------------------------------------
  await sql`ALTER TABLE public.workflows ADD COLUMN IF NOT EXISTS conditions jsonb`.execute(db);

  // --- workflow_runs: per-run history ----------------------------------------------------
  await sql`
    CREATE TABLE public.workflow_runs (
      id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      tenant_id bigint NOT NULL,
      workflow_id bigint NOT NULL,
      enrollment_id bigint,
      person_id bigint,
      step_number integer,
      step_kind text,
      status text NOT NULL DEFAULT 'success',
      error text,
      created_at timestamp with time zone DEFAULT now() NOT NULL,
      CONSTRAINT chk_workflow_runs_status CHECK (status = ANY (ARRAY['success'::text, 'failed'::text]))
    )
  `.execute(db);

  await sql`ALTER TABLE public.workflow_runs OWNER TO pplcrm_owner`.execute(db);

  await sql`
    ALTER TABLE public.workflow_runs
      ADD CONSTRAINT fk_workflow_runs_tenant_id
      FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE
  `.execute(db);
  await sql`
    ALTER TABLE public.workflow_runs
      ADD CONSTRAINT fk_workflow_runs_workflow_id
      FOREIGN KEY (workflow_id) REFERENCES public.workflows(id) ON DELETE CASCADE
  `.execute(db);

  // list stats (RUNS 30D / LAST RUN) scan by (tenant, workflow, created_at).
  await sql`
    CREATE INDEX idx_workflow_runs_tenant_workflow_created
      ON public.workflow_runs USING btree (tenant_id, workflow_id, created_at DESC)
  `.execute(db);

  // Same tenant-isolation policy shape as every other tenant_id table (S-1).
  await sql`ALTER TABLE public.workflow_runs ENABLE ROW LEVEL SECURITY`.execute(db);
  await sql`ALTER TABLE ONLY public.workflow_runs FORCE ROW LEVEL SECURITY`.execute(db);
  await sql`
    CREATE POLICY tenant_isolation ON public.workflow_runs
    USING (
      (NULLIF(current_setting('app.tenant_id', true), '') IS NULL)
      OR (tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::bigint)
    )
    WITH CHECK (
      (NULLIF(current_setting('app.tenant_id', true), '') IS NULL)
      OR (tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::bigint)
    )
  `.execute(db);
  await sql`GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.workflow_runs TO pplcrm_app`.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`DROP TABLE IF EXISTS public.workflow_runs`.execute(db);
  await sql`ALTER TABLE public.workflows DROP COLUMN IF EXISTS conditions`.execute(db);
  await sql`ALTER TABLE public.workflow_steps DROP CONSTRAINT IF EXISTS chk_workflow_steps_kind`.execute(db);
  await sql`ALTER TABLE public.workflow_steps DROP COLUMN IF EXISTS kind`.execute(db);
  await sql`ALTER TABLE public.workflow_steps DROP COLUMN IF EXISTS config`.execute(db);
}
