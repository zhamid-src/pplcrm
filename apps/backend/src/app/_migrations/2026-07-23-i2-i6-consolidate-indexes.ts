import type { Kysely } from 'kysely';
import { sql } from 'kysely';

/**
 * I-2 / I-6: Drop prefix-redundant and low-value indexes (schema review
 * 2026-07-06, §4).
 *
 * I-2 — each dropped index's key columns are a leading prefix of a surviving
 * wider index (verified against the live catalog), so the wider index already
 * serves the narrower `WHERE a = …` scans. The team-side map indexes dropped
 * here are complemented by the second-FK RI indexes added in I-3.
 *
 * I-6 — idx_user_activity_activity indexes a low-cardinality text column with no
 * tenant scoping and no query path, so it is dropped outright. The
 * (tenant_id, is_placeholder) index is replaced by a partial UNIQUE index that
 * serves the "find this tenant's placeholder household" lookup AND enforces the
 * at-most-one-placeholder-per-tenant invariant. The remaining low-cardinality
 * two-valued indexes (idx_lists_tenant_is_dynamic, idx_households_tenant_geocoding,
 * idx_emails_tenant_status) are harmless and intentionally left in place; the GIN
 * trigram audit needs frontend analysis and is out of scope for this pass.
 *
 * All drops are IF EXISTS; the unique index is IF NOT EXISTS.
 */
export async function up(db: Kysely<any>): Promise<void> {
  // --- I-2: prefix-redundant indexes ---
  await sql`
    DROP INDEX IF EXISTS public.idx_companies_tenant;                  -- prefix of idx_companies_tenant_email/_industry
    DROP INDEX IF EXISTS public.idx_donations_tenant;                  -- prefix of idx_donations_person
    DROP INDEX IF EXISTS public.idx_teams_tenant;                      -- prefix of idx_teams_tenant_captain
    DROP INDEX IF EXISTS public.tasks_tenant_index;                    -- prefix of idx_tasks_tenant_status/_due/_assigned
    DROP INDEX IF EXISTS public.idx_volunteer_events_tenant;          -- prefix of idx_volunteer_events_dates
    DROP INDEX IF EXISTS public.idx_volunteer_events_tenant_start;    -- prefix of idx_volunteer_events_dates
    DROP INDEX IF EXISTS public.idx_volunteer_shifts_tenant;          -- prefix of idx_volunteer_shifts_event/_person
    DROP INDEX IF EXISTS public.idx_email_recipients_email_id;        -- prefix of idx_email_recipients_kind
    DROP INDEX IF EXISTS public.idx_email_read_states_user;           -- prefix of email_read_states_pk
    DROP INDEX IF EXISTS public.campaigns_map_tenant_campaign_index;  -- prefix of map_campaigns_users_pk
    DROP INDEX IF EXISTS public.idx_map_teams_lists_team;             -- prefix of map_teams_lists_pk
    DROP INDEX IF EXISTS public.idx_map_teams_persons_team;           -- prefix of map_teams_persons_pk
    DROP INDEX IF EXISTS public.zapier_subscriptions_tenant_id_idx;   -- prefix of zapier_subscriptions_tenant_id_event_type_key
    DROP INDEX IF EXISTS public.idx_newsletter_events_tenant_newsletter; -- prefix of idx_newsletter_events_type
    DROP INDEX IF EXISTS public.idx_notifications_tenant_user;        -- prefix of idx_notifications_read
    DROP INDEX IF EXISTS public.idx_emails_tenant_active;             -- partial subset of idx_emails_tenant_folder
  `.execute(db);

  // --- I-6: low-value indexes ---
  await sql`DROP INDEX IF EXISTS public.idx_user_activity_activity;`.execute(db);

  await sql`
    DROP INDEX IF EXISTS public.idx_households_tenant_is_placeholder;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_households_placeholder
      ON public.households (tenant_id) WHERE is_placeholder;
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`
    DROP INDEX IF EXISTS public.idx_households_placeholder;
    CREATE INDEX IF NOT EXISTS idx_households_tenant_is_placeholder ON public.households (tenant_id, is_placeholder);
    CREATE INDEX IF NOT EXISTS idx_user_activity_activity ON public.user_activity (activity);
    CREATE INDEX IF NOT EXISTS idx_companies_tenant ON public.companies (tenant_id);
    CREATE INDEX IF NOT EXISTS idx_donations_tenant ON public.donations (tenant_id);
    CREATE INDEX IF NOT EXISTS idx_teams_tenant ON public.teams (tenant_id);
    CREATE INDEX IF NOT EXISTS tasks_tenant_index ON public.tasks (tenant_id);
    CREATE INDEX IF NOT EXISTS idx_volunteer_events_tenant ON public.volunteer_events (tenant_id);
    CREATE INDEX IF NOT EXISTS idx_volunteer_events_tenant_start ON public.volunteer_events (tenant_id, start_time);
    CREATE INDEX IF NOT EXISTS idx_volunteer_shifts_tenant ON public.volunteer_shifts (tenant_id);
    CREATE INDEX IF NOT EXISTS idx_email_recipients_email_id ON public.email_recipients (email_id);
    CREATE INDEX IF NOT EXISTS idx_email_read_states_user ON public.email_read_states (tenant_id, user_id);
    CREATE INDEX IF NOT EXISTS campaigns_map_tenant_campaign_index ON public.map_campaigns_users (tenant_id, campaign_id);
    CREATE INDEX IF NOT EXISTS idx_map_teams_lists_team ON public.map_teams_lists (tenant_id, team_id);
    CREATE INDEX IF NOT EXISTS idx_map_teams_persons_team ON public.map_teams_persons (tenant_id, team_id);
    CREATE INDEX IF NOT EXISTS zapier_subscriptions_tenant_id_idx ON public.zapier_subscriptions (tenant_id);
    CREATE INDEX IF NOT EXISTS idx_newsletter_events_tenant_newsletter ON public.newsletter_events (tenant_id, newsletter_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_tenant_user ON public.notifications (tenant_id, user_id);
    CREATE INDEX IF NOT EXISTS idx_emails_tenant_active ON public.emails (tenant_id, folder_id) WHERE deleted_at IS NULL;
  `.execute(db);
}
