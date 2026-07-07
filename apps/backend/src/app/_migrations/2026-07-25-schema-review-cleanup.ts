import type { Kysely } from 'kysely';
import { sql } from 'kysely';

/**
 * Schema review cleanup (2026-07-06): the remaining low-risk items from Wave 1/2
 * bucket A — I-5, D-9, and the D-7 CHECK constraints whose value set could be
 * pinned to an authoritative source.
 *
 * I-5 — index for session expiry sweeps. The prune_retention worker job deletes
 * expired sessions; without this partial index that sweep scans the table.
 *
 * D-9 — fix the constraint-name typo fk_househods_tenant_id.
 *
 * D-7 (remainder) — CHECK constraints for the three internal job-pipeline status
 * columns whose complete value set is authoritative in code (data_exports has an
 * explicit TS union in exports/controller.ts; webhook_events' own writers are the
 * full set). Still DEFERRED, deliberately: donations.status (Stripe-derived, not
 * fully enumerable — financial data, unsafe to guess), notifications.type (no
 * authoritative enum), task_subtasks.status (free-form, no enum), and
 * persons.opt_in_status (consent state — a too-strict CHECK could reject a valid
 * unsubscribe/decline write).
 */
export async function up(db: Kysely<any>): Promise<void> {
  // I-5: partial index supporting expired-session sweeps.
  await sql`
    CREATE INDEX IF NOT EXISTS idx_sessions_expires_at
      ON public.sessions (expires_at) WHERE expires_at IS NOT NULL;
  `.execute(db);

  // D-9: rename the typo'd constraint (guarded so it is a no-op once renamed).
  await sql`
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_househods_tenant_id') THEN
        ALTER TABLE public.households RENAME CONSTRAINT fk_househods_tenant_id TO fk_households_tenant_id;
      END IF;
    END $$;
  `.execute(db);

  // D-7 (remainder): CHECK constraints for the pinned internal status machines.
  await sql`
    ALTER TABLE public.webhook_events DROP CONSTRAINT IF EXISTS chk_webhook_events_status;
    ALTER TABLE public.webhook_events ADD CONSTRAINT chk_webhook_events_status
      CHECK (status IS NULL OR status IN ('pending','processing','processed','failed'));

    ALTER TABLE public.data_imports DROP CONSTRAINT IF EXISTS chk_data_imports_status;
    ALTER TABLE public.data_imports ADD CONSTRAINT chk_data_imports_status
      CHECK (status IS NULL OR status IN ('pending','processing','completed','failed'));

    ALTER TABLE public.data_exports DROP CONSTRAINT IF EXISTS chk_data_exports_status;
    ALTER TABLE public.data_exports ADD CONSTRAINT chk_data_exports_status
      CHECK (status IS NULL OR status IN ('pending','processing','completed','failed'));
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`
    ALTER TABLE public.webhook_events DROP CONSTRAINT IF EXISTS chk_webhook_events_status;
    ALTER TABLE public.data_imports DROP CONSTRAINT IF EXISTS chk_data_imports_status;
    ALTER TABLE public.data_exports DROP CONSTRAINT IF EXISTS chk_data_exports_status;
  `.execute(db);

  await sql`
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_households_tenant_id') THEN
        ALTER TABLE public.households RENAME CONSTRAINT fk_households_tenant_id TO fk_househods_tenant_id;
      END IF;
    END $$;
  `.execute(db);

  await sql`DROP INDEX IF EXISTS public.idx_sessions_expires_at;`.execute(db);
}
