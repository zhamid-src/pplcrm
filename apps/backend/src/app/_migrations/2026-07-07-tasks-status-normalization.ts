import type { Kysely } from 'kysely';
import { sql } from 'kysely';

/**
 * Reconciles `tasks.status` to the spec §4 canonical vocabulary: todo, in_progress,
 * waiting, done, archived. Two renames:
 *
 * - `blocked` -> `waiting` (matches the board's "Waiting" column and the card/row's
 *   optional waiting-reason line).
 * - `canceled` -> `archived` (this app already has exactly one "hidden, not coming
 *   back to it" state — archived — reachable via the grid's Archived toggle; a
 *   canceled task is that state in practice, so this collapses a second one that the
 *   spec never asked for).
 *
 * Pre-ship: no production data to preserve (see pplcrm-migrations skill), so a data
 * backfill + constraint swap in one migration is safe.
 */
export async function up(db: Kysely<any>): Promise<void> {
  // tasks/task_subtasks run FORCE ROW LEVEL SECURITY (S-1 tenant backstop). A
  // migration sets no tenant GUC, so these status backfills are rejected
  // ("query would be affected by row-level security policy") and the whole
  // batch rolls back, breaking fresh-DB bootstrap. Drop FORCE for the backfill
  // and restore it; both tables are designed to run it.
  await sql`ALTER TABLE public.tasks NO FORCE ROW LEVEL SECURITY`.execute(db);
  await sql`ALTER TABLE public.task_subtasks NO FORCE ROW LEVEL SECURITY`.execute(db);

  await sql`UPDATE public.tasks SET status = 'waiting' WHERE status = 'blocked'`.execute(db);
  await sql`UPDATE public.tasks SET status = 'archived' WHERE status = 'canceled'`.execute(db);
  await sql`UPDATE public.task_subtasks SET status = 'waiting' WHERE status = 'blocked'`.execute(db);
  await sql`UPDATE public.task_subtasks SET status = 'archived' WHERE status = 'canceled'`.execute(db);

  await sql`ALTER TABLE public.tasks FORCE ROW LEVEL SECURITY`.execute(db);
  await sql`ALTER TABLE public.task_subtasks FORCE ROW LEVEL SECURITY`.execute(db);

  await sql`ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS chk_tasks_status`.execute(db);
  await sql`
    ALTER TABLE public.tasks
    ADD CONSTRAINT chk_tasks_status
    CHECK (status = ANY (ARRAY['todo'::text, 'in_progress'::text, 'waiting'::text, 'done'::text, 'archived'::text]))
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  // Best-effort only: `canceled` merged into `archived` and cannot be distinguished
  // back out, so the down migration restores the old constraint and the `waiting` ->
  // `blocked` rename, but archived rows stay archived rather than un-collapsing.
  await sql`ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS chk_tasks_status`.execute(db);
  await sql`
    ALTER TABLE public.tasks
    ADD CONSTRAINT chk_tasks_status
    CHECK (status = ANY (ARRAY['todo'::text, 'in_progress'::text, 'blocked'::text, 'done'::text, 'canceled'::text, 'archived'::text]))
  `.execute(db);
  await sql`UPDATE public.tasks SET status = 'blocked' WHERE status = 'waiting'`.execute(db);
  await sql`UPDATE public.task_subtasks SET status = 'blocked' WHERE status = 'waiting'`.execute(db);
}
