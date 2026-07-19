import type { Kysely } from 'kysely';
import { sql } from 'kysely';

/**
 * Recurring newsletters removed entirely (product decision, 2026-07-18): the draft-per-cadence
 * model added little over "Schedule for later" plus a calendar reminder, and the feature never
 * shipped. One-time scheduled sends (`newsletters.send_date` + the scheduled cron) stay.
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`ALTER TABLE public.newsletters DROP COLUMN IF EXISTS schedule_id`.execute(db);
  await sql`DROP TABLE IF EXISTS public.newsletter_schedules`.execute(db);
  // The self-rescheduling cron row would otherwise sit in the queue as an unknown payload type.
  await sql`
    DELETE FROM public.background_jobs
      WHERE status IN ('pending', 'processing')
        AND payload->>'type' = 'process_newsletter_schedules'
  `.execute(db);
}

export async function down(): Promise<void> {
  // Irreversible by design: the feature is gone, and nothing shipped ever wrote these rows.
  throw new Error('Cannot restore the removed newsletter_schedules table');
}
