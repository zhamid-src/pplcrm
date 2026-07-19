import type { Kysely } from 'kysely';
import { sql } from 'kysely';

/**
 * Automation engagement tripwires (spec: anti-abuse sending controls):
 *  - workflow_runs gains bounced_at / spam_reported_at — the SendGrid event webhook already
 *    stamps opens/clicks onto the run that sent an automation email; now hard bounces and spam
 *    complaints are stamped the same way. That gives automation sends a durable, per-tenant
 *    engagement record, which is what lets the same bounce/complaint tripwires that guard
 *    newsletters (pause at >5% hard bounces, suspend at >1% complaints) also cover automation
 *    volume — previously an abuser could blast through workflows without ever tripping the
 *    account-level wires.
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    ALTER TABLE public.workflow_runs
      ADD COLUMN IF NOT EXISTS bounced_at timestamptz,
      ADD COLUMN IF NOT EXISTS spam_reported_at timestamptz
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`
    ALTER TABLE public.workflow_runs
      DROP COLUMN IF EXISTS bounced_at,
      DROP COLUMN IF EXISTS spam_reported_at
  `.execute(db);
}
