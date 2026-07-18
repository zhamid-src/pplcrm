import type { Kysely, Selectable } from 'kysely';
import type { Models } from '../../../../../../libs/common/src/lib/kysely.models';

export type ClaimedJob = Selectable<Models['background_jobs']>;

/**
 * Claim the next runnable background job, honoring per-tenant in-flight fairness.
 *
 * The queue is otherwise global FIFO (`ORDER BY id`), so one tenant that enqueues a huge batch (a
 * mass import's geocoding, a large sync) would sit at the front and starve every other tenant's
 * latency-sensitive jobs (transactional mail, sends). To prevent that, a single tenant may hold at
 * most `inFlightCap` jobs in `processing` at once; tenants already at the cap are skipped this round
 * and picked up as their in-flight jobs finish. System jobs (`tenant_id = null`, the cron
 * singletons) are exempt.
 *
 * Returns the claimed-and-locked job (now `processing`), or null when nothing is runnable. Uses
 * `FOR UPDATE SKIP LOCKED` so concurrent claimers never collide.
 */
export async function claimNextPendingJob(
  db: Kysely<Models>,
  workerId: string,
  inFlightCap: number,
): Promise<ClaimedJob | null> {
  return db.transaction().execute(async (trx) => {
    // Tenants at/over their in-flight cap right now. The set is tiny (bounded by the worker pool),
    // so counting per tenant and filtering in JS is cheaper than a correlated HAVING per claim.
    const processingCounts = await trx
      .selectFrom('background_jobs')
      .select('tenant_id')
      .select((eb) => eb.fn.countAll().as('cnt'))
      .where('status', '=', 'processing')
      .where('tenant_id', 'is not', null)
      .groupBy('tenant_id')
      .execute();
    const busyTenantIds = processingCounts
      .filter((row) => Number(row.cnt) >= inFlightCap)
      .map((row) => row.tenant_id)
      .filter((id): id is string => id != null);

    let query = trx
      .selectFrom('background_jobs')
      .selectAll()
      .where('status', '=', 'pending')
      .where('run_at', '<=', new Date());
    if (busyTenantIds.length > 0) {
      query = query.where((eb) => eb.or([eb('tenant_id', 'is', null), eb('tenant_id', 'not in', busyTenantIds)]));
    }

    const pendingJob = await query.orderBy('id', 'asc').limit(1).forUpdate().skipLocked().executeTakeFirst();
    if (!pendingJob) return null;

    const updatedJob = await trx
      .updateTable('background_jobs')
      .set({
        status: 'processing',
        locked_at: new Date(),
        locked_by: workerId,
        attempts: Number(pendingJob.attempts || 0) + 1,
        updated_at: new Date(),
      })
      .where('id', '=', pendingJob.id)
      .returningAll()
      .executeTakeFirst();

    return updatedJob ?? null;
  });
}
