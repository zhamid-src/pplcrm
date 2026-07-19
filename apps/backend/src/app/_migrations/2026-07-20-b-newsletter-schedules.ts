import type { Kysely } from 'kysely';
import { sql } from 'kysely';

/**
 * Recurring newsletters (automated newsletters, slice C).
 *
 * A `newsletter_schedules` row is the standing definition — cadence (weekly/biweekly/monthly at
 * a wall-clock time in an IANA timezone), embedded content, and audience targeting. A cron
 * (`process_newsletter_schedules`) fires due schedules and each firing creates an ORDINARY
 * `newsletters` row ("{name} — Jul 18, 2026"), so recurring issues share the archive, reports,
 * preflight, and send-guards with manual sends. `mode` decides what happens to the issue:
 * 'draft' (default) leaves it for human review and notifies the owner; 'auto' sends it through
 * the normal guarded send path.
 *
 * `newsletters.schedule_id` is the provenance link (issue → schedule) for both surfaces.
 */

/** The standard tenant_isolation policy body (matches every baseline table). */
const TENANT_POLICY = `((NULLIF(current_setting('app.tenant_id', true), '') IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::bigint))`;

export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS public.newsletter_schedules (
      id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
      tenant_id bigint NOT NULL,
      campaign_id bigint NOT NULL,
      name text NOT NULL,
      cadence text NOT NULL,
      weekday integer,
      day_of_month integer,
      send_hour integer DEFAULT 9 NOT NULL,
      send_minute integer DEFAULT 0 NOT NULL,
      timezone text DEFAULT 'UTC'::text NOT NULL,
      mode text DEFAULT 'draft'::text NOT NULL,
      status text DEFAULT 'active'::text NOT NULL,
      subject text,
      preview_text text,
      html_content text,
      plain_text_content text,
      audience_description text,
      target_lists jsonb,
      segments jsonb,
      next_run_at timestamp with time zone NOT NULL,
      last_run_at timestamp with time zone,
      createdby_id bigint NOT NULL,
      updatedby_id bigint NOT NULL,
      created_at timestamp with time zone DEFAULT now() NOT NULL,
      updated_at timestamp with time zone DEFAULT now() NOT NULL,
      CONSTRAINT newsletter_schedules_pk PRIMARY KEY (id, tenant_id),
      CONSTRAINT newsletter_schedules_id_key UNIQUE (id),
      CONSTRAINT chk_nls_cadence CHECK ((cadence = ANY (ARRAY['weekly'::text, 'biweekly'::text, 'monthly'::text]))),
      CONSTRAINT chk_nls_weekday CHECK ((weekday IS NULL) OR (weekday >= 0 AND weekday <= 6)),
      CONSTRAINT chk_nls_day_of_month CHECK ((day_of_month IS NULL) OR (day_of_month >= 1 AND day_of_month <= 31)),
      CONSTRAINT chk_nls_send_hour CHECK ((send_hour >= 0 AND send_hour <= 23)),
      CONSTRAINT chk_nls_send_minute CHECK ((send_minute >= 0 AND send_minute <= 59)),
      CONSTRAINT chk_nls_mode CHECK ((mode = ANY (ARRAY['draft'::text, 'auto'::text]))),
      CONSTRAINT chk_nls_status CHECK ((status = ANY (ARRAY['active'::text, 'paused'::text]))),
      CONSTRAINT fk_nls_tenant_id FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE,
      CONSTRAINT fk_nls_campaign_id FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE
    )
  `.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_newsletter_schedules_due ON public.newsletter_schedules (status, next_run_at)`.execute(
    db,
  );
  await sql`CREATE INDEX IF NOT EXISTS idx_newsletter_schedules_tenant ON public.newsletter_schedules (tenant_id)`.execute(
    db,
  );
  await sql`ALTER TABLE public.newsletter_schedules ENABLE ROW LEVEL SECURITY`.execute(db);
  await sql`ALTER TABLE ONLY public.newsletter_schedules FORCE ROW LEVEL SECURITY`.execute(db);
  await sql
    .raw(
      `CREATE POLICY tenant_isolation ON public.newsletter_schedules USING (${TENANT_POLICY}) WITH CHECK (${TENANT_POLICY})`,
    )
    .execute(db);
  await sql`GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.newsletter_schedules TO pplcrm_app`.execute(db);

  // Provenance: which schedule created this issue (null for one-off newsletters).
  await sql`ALTER TABLE public.newsletters ADD COLUMN IF NOT EXISTS schedule_id bigint`.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`ALTER TABLE public.newsletters DROP COLUMN IF EXISTS schedule_id`.execute(db);
  await sql`DROP TABLE IF EXISTS public.newsletter_schedules`.execute(db);
}
