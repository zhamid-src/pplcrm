import type { Kysely } from 'kysely';
import { sql } from 'kysely';

/**
 * I-4: Right-size background_jobs indexes to the queries that actually run
 * (schema review 2026-07-06, §4), verified against worker.ts.
 *
 * Two active query shapes exist:
 *   1. Scheduler dedupe (x10): status IN ('pending','processing')
 *      AND payload->>'type' = '<type>'  (worker.ts, the ~10 `.where(payload->>'type')`
 *      guards). No index covered the JSONB expression.
 *   2. Job claim: status = 'pending' AND run_at <= now() ORDER BY id LIMIT 1
 *      FOR UPDATE SKIP LOCKED  (worker.ts processNextJob).
 *
 * The review's suggested claim index (queue, run_at) does NOT match the real
 * claim query — it has no `queue` predicate (queue is only logged, never
 * filtered) and orders by `id`, not run_at. So the claim index here is
 * (run_at, id) WHERE status = 'pending', which matches the filter and the sort
 * and stays small (pending rows only, not the completed/failed majority).
 *
 * The two existing full indexes are dropped because no verified query needs
 * them: idx_background_jobs_status_run_at (all statuses; the pending path is now
 * served by the partial claim index) and idx_background_jobs_queue_status
 * (leads with the never-filtered `queue` column). idx_background_jobs_tenant_status
 * is left untouched.
 *
 * Pairs with the P-3 retention job — pruning completed/failed rows is the real
 * fix for unbounded growth; these partial indexes keep the interim cheap.
 */
export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    CREATE INDEX IF NOT EXISTS idx_background_jobs_active_type
      ON public.background_jobs ((payload->>'type'))
      WHERE status IN ('pending','processing');

    CREATE INDEX IF NOT EXISTS idx_background_jobs_claim
      ON public.background_jobs (run_at, id)
      WHERE status = 'pending';
  `.execute(db);

  await sql`
    DROP INDEX IF EXISTS public.idx_background_jobs_status_run_at;
    DROP INDEX IF EXISTS public.idx_background_jobs_queue_status;
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`
    CREATE INDEX IF NOT EXISTS idx_background_jobs_status_run_at
      ON public.background_jobs (status, run_at);
    CREATE INDEX IF NOT EXISTS idx_background_jobs_queue_status
      ON public.background_jobs (queue, status, run_at);
  `.execute(db);
  await sql`
    DROP INDEX IF EXISTS public.idx_background_jobs_claim;
    DROP INDEX IF EXISTS public.idx_background_jobs_active_type;
  `.execute(db);
}
