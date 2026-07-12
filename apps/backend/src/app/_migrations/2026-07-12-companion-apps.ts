import type { Kysely } from 'kysely';
import { sql } from 'kysely';

/**
 * Companion apps (COMPANION-APPS-PLAN.md) — the volunteer access layer plus
 * the canvass-companion survey model.
 *
 * Access layer: a capability link (/t/:token, /r/:token) is no longer enough
 * on its own. The volunteer behind an assignment must verify a one-time code
 * sent to their email/SMS on file (`companion_volunteers`), be approved once
 * by an admin, and then hold a device session (`companion_sessions`) whose
 * hashed token accompanies every companion request. `companion_ops` is the
 * write-once idempotency ledger both companions use so offline retries apply
 * exactly once.
 *
 * Canvass survey model: `turf_knocks` grows the spec §3 survey fields
 * (issues, follow-up toggles, contact capture), turfs get a suggested walk
 * order, assignments get the volunteer identity + expiry, campaigns carry the
 * door script + issue vocabulary, and the canvass→deliveries yard-sign bridge
 * is unlocked by extending `delivery_requests.source` and
 * `campaign_subscriptions.consent_source` with 'canvass'.
 */

/** The standard tenant_isolation policy body (matches every baseline table). */
const TENANT_POLICY = `((NULLIF(current_setting('app.tenant_id', true), '') IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::bigint))`;

export async function up(db: Kysely<any>): Promise<void> {
  // -- companion_volunteers: one row per (tenant, person) who has ever been
  // -- sent a companion link. Approval is per volunteer, not per assignment.
  await sql`
    CREATE TABLE IF NOT EXISTS public.companion_volunteers (
      id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
      tenant_id bigint NOT NULL,
      person_id bigint NOT NULL,
      status text DEFAULT 'invited'::text NOT NULL,
      verify_code_hash text,
      verify_code_expires_at timestamp with time zone,
      verify_attempts integer DEFAULT 0 NOT NULL,
      verify_channel text,
      verified_at timestamp with time zone,
      approved_by bigint,
      approved_at timestamp with time zone,
      revoked_at timestamp with time zone,
      createdby_id bigint,
      updatedby_id bigint,
      created_at timestamp with time zone DEFAULT now() NOT NULL,
      updated_at timestamp with time zone DEFAULT now() NOT NULL,
      CONSTRAINT companion_volunteers_pk PRIMARY KEY (id, tenant_id),
      CONSTRAINT companion_volunteers_id_key UNIQUE (id),
      CONSTRAINT uq_companion_volunteers_person UNIQUE (tenant_id, person_id),
      CONSTRAINT chk_cvol_status CHECK ((status = ANY (ARRAY['invited'::text, 'verified'::text, 'approved'::text, 'revoked'::text]))),
      CONSTRAINT chk_cvol_channel CHECK ((verify_channel IS NULL) OR (verify_channel = ANY (ARRAY['email'::text, 'sms'::text])))
    )
  `.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_companion_volunteers_tenant_status ON public.companion_volunteers (tenant_id, status)`.execute(
    db,
  );
  await sql`ALTER TABLE public.companion_volunteers ENABLE ROW LEVEL SECURITY`.execute(db);
  await sql`ALTER TABLE ONLY public.companion_volunteers FORCE ROW LEVEL SECURITY`.execute(db);
  await sql
    .raw(
      `CREATE POLICY tenant_isolation ON public.companion_volunteers USING (${TENANT_POLICY}) WITH CHECK (${TENANT_POLICY})`,
    )
    .execute(db);
  await sql`GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.companion_volunteers TO pplcrm_app`.execute(db);

  // -- companion_sessions: a verified device. Only the sha256 of the session
  // -- token is stored; the raw token is returned to the phone exactly once.
  await sql`
    CREATE TABLE IF NOT EXISTS public.companion_sessions (
      id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
      tenant_id bigint NOT NULL,
      volunteer_id bigint NOT NULL,
      token_hash text NOT NULL,
      expires_at timestamp with time zone NOT NULL,
      revoked_at timestamp with time zone,
      last_used_at timestamp with time zone,
      user_agent text,
      created_at timestamp with time zone DEFAULT now() NOT NULL,
      updated_at timestamp with time zone DEFAULT now() NOT NULL,
      CONSTRAINT companion_sessions_pk PRIMARY KEY (id, tenant_id),
      CONSTRAINT companion_sessions_id_key UNIQUE (id),
      CONSTRAINT companion_sessions_token_hash_key UNIQUE (token_hash)
    )
  `.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_companion_sessions_tenant_volunteer ON public.companion_sessions (tenant_id, volunteer_id)`.execute(
    db,
  );
  await sql`ALTER TABLE public.companion_sessions ENABLE ROW LEVEL SECURITY`.execute(db);
  await sql`ALTER TABLE ONLY public.companion_sessions FORCE ROW LEVEL SECURITY`.execute(db);
  await sql
    .raw(
      `CREATE POLICY tenant_isolation ON public.companion_sessions USING (${TENANT_POLICY}) WITH CHECK (${TENANT_POLICY})`,
    )
    .execute(db);
  await sql`GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.companion_sessions TO pplcrm_app`.execute(db);

  // -- companion_ops: write-once idempotency ledger for volunteer actions.
  // -- Insert ON CONFLICT DO NOTHING; a conflict means "already applied".
  await sql`
    CREATE TABLE IF NOT EXISTS public.companion_ops (
      tenant_id bigint NOT NULL,
      op_id text NOT NULL,
      scope text NOT NULL,
      created_at timestamp with time zone DEFAULT now() NOT NULL,
      CONSTRAINT companion_ops_pk PRIMARY KEY (tenant_id, op_id),
      CONSTRAINT chk_cops_scope CHECK ((scope = ANY (ARRAY['canvass'::text, 'deliveries'::text])))
    )
  `.execute(db);
  await sql`ALTER TABLE public.companion_ops ENABLE ROW LEVEL SECURITY`.execute(db);
  await sql`ALTER TABLE ONLY public.companion_ops FORCE ROW LEVEL SECURITY`.execute(db);
  await sql
    .raw(
      `CREATE POLICY tenant_isolation ON public.companion_ops USING (${TENANT_POLICY}) WITH CHECK (${TENANT_POLICY})`,
    )
    .execute(db);
  await sql`GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.companion_ops TO pplcrm_app`.execute(db);

  // -- turf_assignments: who the link belongs to (the access layer needs a
  // -- person to verify against) and an optional hard expiry.
  await sql`ALTER TABLE public.turf_assignments ADD COLUMN IF NOT EXISTS volunteer_person_id bigint`.execute(db);
  await sql`ALTER TABLE public.turf_assignments ADD COLUMN IF NOT EXISTS expires_at timestamp with time zone`.execute(
    db,
  );

  // -- turf_households: suggested walk order (computed at cut/assign time).
  await sql`ALTER TABLE public.turf_households ADD COLUMN IF NOT EXISTS walk_order integer`.execute(db);

  // -- turf_knocks: the spec §3 survey payload.
  await sql`ALTER TABLE public.turf_knocks ADD COLUMN IF NOT EXISTS issues text[] DEFAULT '{}'::text[] NOT NULL`.execute(
    db,
  );
  await sql`ALTER TABLE public.turf_knocks ADD COLUMN IF NOT EXISTS wants_volunteer boolean DEFAULT false NOT NULL`.execute(
    db,
  );
  await sql`ALTER TABLE public.turf_knocks ADD COLUMN IF NOT EXISTS wants_yard_sign boolean DEFAULT false NOT NULL`.execute(
    db,
  );
  await sql`ALTER TABLE public.turf_knocks ADD COLUMN IF NOT EXISTS set_dnc boolean DEFAULT false NOT NULL`.execute(db);
  await sql`ALTER TABLE public.turf_knocks ADD COLUMN IF NOT EXISTS contact_phone text`.execute(db);
  await sql`ALTER TABLE public.turf_knocks ADD COLUMN IF NOT EXISTS contact_email text`.execute(db);
  await sql`ALTER TABLE public.turf_knocks ADD COLUMN IF NOT EXISTS subscribe boolean DEFAULT false NOT NULL`.execute(
    db,
  );

  // -- campaigns: door script + issue-chip vocabulary (campaign-configured).
  await sql`ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS canvass_issues text[] DEFAULT '{}'::text[] NOT NULL`.execute(
    db,
  );
  await sql`ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS canvass_script text`.execute(db);

  // -- Yard-sign bridge: a canvass survey may create a delivery request.
  await sql`ALTER TABLE public.delivery_requests DROP CONSTRAINT IF EXISTS chk_delivery_requests_source`.execute(db);
  await sql`
    ALTER TABLE public.delivery_requests
      ADD CONSTRAINT chk_delivery_requests_source
      CHECK ((source = ANY (ARRAY['web_form'::text, 'manual'::text, 'canvass'::text])))
  `.execute(db);

  // -- Door-step subscriptions: a new consent source.
  await sql`ALTER TABLE public.campaign_subscriptions DROP CONSTRAINT IF EXISTS chk_csub_source`.execute(db);
  await sql`
    ALTER TABLE public.campaign_subscriptions
      ADD CONSTRAINT chk_csub_source
      CHECK ((consent_source = ANY (ARRAY['form'::text, 'import'::text, 'manual'::text, 'copied'::text, 'canvass'::text])))
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`ALTER TABLE public.campaign_subscriptions DROP CONSTRAINT IF EXISTS chk_csub_source`.execute(db);
  await sql`
    ALTER TABLE public.campaign_subscriptions
      ADD CONSTRAINT chk_csub_source
      CHECK ((consent_source = ANY (ARRAY['form'::text, 'import'::text, 'manual'::text, 'copied'::text])))
  `.execute(db);
  await sql`ALTER TABLE public.delivery_requests DROP CONSTRAINT IF EXISTS chk_delivery_requests_source`.execute(db);
  await sql`
    ALTER TABLE public.delivery_requests
      ADD CONSTRAINT chk_delivery_requests_source
      CHECK ((source = ANY (ARRAY['web_form'::text, 'manual'::text])))
  `.execute(db);
  await sql`ALTER TABLE public.campaigns DROP COLUMN IF EXISTS canvass_script`.execute(db);
  await sql`ALTER TABLE public.campaigns DROP COLUMN IF EXISTS canvass_issues`.execute(db);
  await sql`ALTER TABLE public.turf_knocks DROP COLUMN IF EXISTS subscribe`.execute(db);
  await sql`ALTER TABLE public.turf_knocks DROP COLUMN IF EXISTS contact_email`.execute(db);
  await sql`ALTER TABLE public.turf_knocks DROP COLUMN IF EXISTS contact_phone`.execute(db);
  await sql`ALTER TABLE public.turf_knocks DROP COLUMN IF EXISTS set_dnc`.execute(db);
  await sql`ALTER TABLE public.turf_knocks DROP COLUMN IF EXISTS wants_yard_sign`.execute(db);
  await sql`ALTER TABLE public.turf_knocks DROP COLUMN IF EXISTS wants_volunteer`.execute(db);
  await sql`ALTER TABLE public.turf_knocks DROP COLUMN IF EXISTS issues`.execute(db);
  await sql`ALTER TABLE public.turf_households DROP COLUMN IF EXISTS walk_order`.execute(db);
  await sql`ALTER TABLE public.turf_assignments DROP COLUMN IF EXISTS expires_at`.execute(db);
  await sql`ALTER TABLE public.turf_assignments DROP COLUMN IF EXISTS volunteer_person_id`.execute(db);
  await sql`DROP TABLE IF EXISTS public.companion_ops`.execute(db);
  await sql`DROP TABLE IF EXISTS public.companion_sessions`.execute(db);
  await sql`DROP TABLE IF EXISTS public.companion_volunteers`.execute(db);
}
