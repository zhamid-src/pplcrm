import type { Kysely } from 'kysely';
import { sql } from 'kysely';

/**
 * Ops heartbeats (observability).
 *
 * A tiny global (non-tenant) table proving the in-process background worker is alive: the
 * `ops_watchdog` cron job updates its row's `beat_at` every cycle, and `GET /healthz/worker`
 * reports 503 when the beat is stale — so the external Azure availability probe catches a wedged
 * worker even while the HTTP process stays healthy (dead-man's switch).
 *
 * The row is seeded here, at migration time, deliberately: if the worker never completes a single
 * watchdog cycle after deploy, the seed row is already stale and the probe alerts — the correct
 * failure direction.
 */
export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS public.ops_heartbeats (
      name text PRIMARY KEY,
      beat_at timestamp with time zone NOT NULL DEFAULT now(),
      details jsonb
    )
  `.execute(db);
  await sql`INSERT INTO public.ops_heartbeats (name) VALUES ('ops_watchdog') ON CONFLICT (name) DO NOTHING`.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`DROP TABLE IF EXISTS public.ops_heartbeats`.execute(db);
}
