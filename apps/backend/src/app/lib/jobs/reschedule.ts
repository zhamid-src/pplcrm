import type { Kysely } from 'kysely';
import type { Models } from '../../../../../../libs/common/src/lib/kysely.models';
import type { JobType } from './job-payloads';

const MINUTE_MS = 60 * 1000;
export const TEN_MINUTES_MS = 10 * MINUTE_MS;
export const DAY_MS = 24 * 60 * MINUTE_MS;

const DEFAULT_MAX_ATTEMPTS = 3;

/**
 * Re-queues a parameterless periodic job to run again after `delayMs`.
 * Used by the self-rescheduling cron-style jobs (cleanup, dedupe, sync scheduling, …).
 */
export async function scheduleNextRun(db: Kysely<Models>, type: JobType, delayMs: number): Promise<void> {
  await db
    .insertInto('background_jobs')
    .values({
      tenant_id: null,
      queue: 'default',
      status: 'pending',
      payload: JSON.stringify({ type }),
      run_at: new Date(Date.now() + delayMs),
      max_attempts: DEFAULT_MAX_ATTEMPTS,
    })
    .execute();
}
