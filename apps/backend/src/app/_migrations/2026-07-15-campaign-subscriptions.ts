import type { Kysely } from 'kysely';
import { sql } from 'kysely';

/**
 * Campaigns §15 — email consent becomes a three-layer model:
 *
 *  1. `campaign_subscriptions` — per-campaign CONSENT. status: 'subscribed'
 *     (sendable) / 'pending' (double opt-in awaiting confirm) / 'unsubscribed'.
 *     Express-vs-implied consent (CASL) is carried by `consent_source`
 *     (form/import/manual/copied), not a separate status.
 *  2. `email_suppressions` — global ADDRESS HEALTH per email. A hard bounce or
 *     spam complaint kills the address in every campaign.
 *  3. `persons.do_not_contact` (added by the previous migration) — the person-
 *     level override.
 *
 * Sendable in campaign X = subscribed in X ∧ address not suppressed ∧ not DNC.
 *
 * `newsletters.campaign_id` is added here (ahead of the broader domain-scoping
 * migration) because the send path filters recipients by the newsletter's
 * campaign from this point on.
 *
 * Backfills into each tenant's office context, then the legacy structures go:
 *  - persons.opt_in_status: confirmed→subscribed(form), pending→pending(form),
 *    NULL-with-email→subscribed(import, i.e. implied consent) … then DROPPED.
 *  - 'unsubscribed' tag mappings → status unsubscribed; 'subscriber' adds
 *    nothing new. Both tags deleted.
 *  - person_newsletter_engagements.hard_bounced and 'spamreport' events →
 *    email_suppressions.
 */

const tenantIsolation = (table: string): string => `
  ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY;
  ALTER TABLE ONLY public.${table} FORCE ROW LEVEL SECURITY;
  CREATE POLICY tenant_isolation ON public.${table}
    USING (((NULLIF(current_setting('app.tenant_id'::text, true), ''::text) IS NULL)
      OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::bigint)))
    WITH CHECK (((NULLIF(current_setting('app.tenant_id'::text, true), ''::text) IS NULL)
      OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::bigint)));
`;

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql
    .raw(
      `
    CREATE TABLE public.campaign_subscriptions (
      id               bigint NOT NULL,
      tenant_id        bigint NOT NULL,
      campaign_id      bigint NOT NULL,
      person_id        bigint NOT NULL,
      createdby_id     bigint NOT NULL,
      updatedby_id     bigint NOT NULL,
      email            text   NOT NULL,
      status           text   NOT NULL DEFAULT 'subscribed',
      consent_source   text   NOT NULL DEFAULT 'manual',
      consent_at       timestamp with time zone,
      unsubscribed_at  timestamp with time zone,
      created_at       timestamp with time zone DEFAULT now() NOT NULL,
      updated_at       timestamp with time zone DEFAULT now() NOT NULL,
      CONSTRAINT chk_csub_status CHECK (status = ANY (ARRAY['subscribed'::text, 'pending'::text, 'unsubscribed'::text])),
      CONSTRAINT chk_csub_source CHECK (consent_source = ANY (ARRAY['form'::text, 'import'::text, 'manual'::text, 'copied'::text]))
    );
    CREATE SEQUENCE public.campaign_subscriptions_id_seq START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
    ALTER SEQUENCE public.campaign_subscriptions_id_seq OWNED BY public.campaign_subscriptions.id;
    ALTER TABLE ONLY public.campaign_subscriptions ALTER COLUMN id SET DEFAULT nextval('public.campaign_subscriptions_id_seq'::regclass);
    ALTER TABLE ONLY public.campaign_subscriptions ADD CONSTRAINT campaign_subscriptions_id_key UNIQUE (id);
    ALTER TABLE ONLY public.campaign_subscriptions ADD CONSTRAINT campaign_subscriptions_pk PRIMARY KEY (id, tenant_id);
    ALTER TABLE ONLY public.campaign_subscriptions ADD CONSTRAINT uq_csub_campaign_person UNIQUE (tenant_id, campaign_id, person_id);
    ALTER TABLE ONLY public.campaign_subscriptions ADD CONSTRAINT fk_csub_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);
    ALTER TABLE ONLY public.campaign_subscriptions ADD CONSTRAINT fk_csub_campaign FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;
    ALTER TABLE ONLY public.campaign_subscriptions ADD CONSTRAINT fk_csub_person FOREIGN KEY (person_id) REFERENCES public.persons(id) ON DELETE CASCADE;
    ALTER TABLE ONLY public.campaign_subscriptions ADD CONSTRAINT fk_csub_createdby FOREIGN KEY (createdby_id) REFERENCES public.authusers(id);
    ALTER TABLE ONLY public.campaign_subscriptions ADD CONSTRAINT fk_csub_updatedby FOREIGN KEY (updatedby_id) REFERENCES public.authusers(id);
    CREATE INDEX idx_csub_tenant_campaign_status ON public.campaign_subscriptions (tenant_id, campaign_id, status);
    CREATE INDEX idx_csub_tenant_person ON public.campaign_subscriptions (tenant_id, person_id);
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_subscriptions TO pplcrm_app;
    GRANT USAGE ON SEQUENCE public.campaign_subscriptions_id_seq TO pplcrm_app;
    ${tenantIsolation('campaign_subscriptions')}
  `,
    )
    .execute(db);

  await sql
    .raw(
      `
    CREATE TABLE public.email_suppressions (
      id           bigint NOT NULL,
      tenant_id    bigint NOT NULL,
      email        text   NOT NULL,
      reason       text   NOT NULL,
      occurred_at  timestamp with time zone DEFAULT now() NOT NULL,
      created_at   timestamp with time zone DEFAULT now() NOT NULL,
      CONSTRAINT chk_esup_reason CHECK (reason = ANY (ARRAY['hard_bounce'::text, 'spam_complaint'::text, 'manual'::text]))
    );
    CREATE SEQUENCE public.email_suppressions_id_seq START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
    ALTER SEQUENCE public.email_suppressions_id_seq OWNED BY public.email_suppressions.id;
    ALTER TABLE ONLY public.email_suppressions ALTER COLUMN id SET DEFAULT nextval('public.email_suppressions_id_seq'::regclass);
    ALTER TABLE ONLY public.email_suppressions ADD CONSTRAINT email_suppressions_id_key UNIQUE (id);
    ALTER TABLE ONLY public.email_suppressions ADD CONSTRAINT email_suppressions_pk PRIMARY KEY (id, tenant_id);
    ALTER TABLE ONLY public.email_suppressions ADD CONSTRAINT uq_esup_email_reason UNIQUE (tenant_id, email, reason);
    ALTER TABLE ONLY public.email_suppressions ADD CONSTRAINT fk_esup_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);
    CREATE INDEX idx_esup_tenant_email ON public.email_suppressions (tenant_id, email);
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_suppressions TO pplcrm_app;
    GRANT USAGE ON SEQUENCE public.email_suppressions_id_seq TO pplcrm_app;
    ${tenantIsolation('email_suppressions')}
  `,
    )
    .execute(db);

  // Newsletters belong to a campaign from now on (send path filters by it).
  await sql
    .raw(
      `
    ALTER TABLE public.newsletters ADD COLUMN campaign_id bigint;
    UPDATE public.newsletters n SET campaign_id = c.id
      FROM public.campaigns c WHERE c.tenant_id = n.tenant_id AND c.kind = 'office';
    ALTER TABLE public.newsletters ALTER COLUMN campaign_id SET NOT NULL;
    ALTER TABLE ONLY public.newsletters ADD CONSTRAINT fk_newsletters_campaign FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id);
    CREATE INDEX idx_newsletters_tenant_campaign ON public.newsletters (tenant_id, campaign_id);
  `,
    )
    .execute(db);

  // Backfill consent into the office context from persons.opt_in_status.
  await sql
    .raw(
      `
    INSERT INTO public.campaign_subscriptions
      (tenant_id, campaign_id, person_id, createdby_id, updatedby_id, email, status, consent_source, consent_at)
    SELECT
      p.tenant_id,
      c.id,
      p.id,
      p.createdby_id,
      p.updatedby_id,
      p.email,
      CASE p.opt_in_status WHEN 'pending' THEN 'pending' ELSE 'subscribed' END,
      CASE WHEN p.opt_in_status IS NULL THEN 'import' ELSE 'form' END,
      COALESCE(p.opt_in_confirmed_at, p.created_at)
    FROM public.persons p
    JOIN public.campaigns c ON c.tenant_id = p.tenant_id AND c.kind = 'office'
    WHERE p.email IS NOT NULL AND p.email <> '';
  `,
    )
    .execute(db);

  // The legacy 'unsubscribed' tag wins over whatever the backfill inferred.
  await sql
    .raw(
      `
    UPDATE public.campaign_subscriptions cs
    SET status = 'unsubscribed', unsubscribed_at = mpt.created_at, updated_at = now()
    FROM public.map_peoples_tags mpt
    JOIN public.tags t ON t.id = mpt.tag_id AND t.tenant_id = mpt.tenant_id
    JOIN public.campaigns c ON c.tenant_id = mpt.tenant_id AND c.kind = 'office'
    WHERE lower(t.name) = 'unsubscribed'
      AND cs.tenant_id = mpt.tenant_id
      AND cs.campaign_id = c.id
      AND cs.person_id = mpt.person_id;
  `,
    )
    .execute(db);

  // Retire the subscriber/unsubscribed tags.
  await sql
    .raw(
      `
    DELETE FROM public.map_peoples_tags mpt
    USING public.tags t
    WHERE t.id = mpt.tag_id AND t.tenant_id = mpt.tenant_id
      AND lower(t.name) IN ('subscriber', 'unsubscribed');
    DELETE FROM public.map_households_tags mht
    USING public.tags t
    WHERE t.id = mht.tag_id AND t.tenant_id = mht.tenant_id
      AND lower(t.name) IN ('subscriber', 'unsubscribed');
    DELETE FROM public.tags WHERE lower(name) IN ('subscriber', 'unsubscribed');
  `,
    )
    .execute(db);

  // Address-health backfill: hard bounces and spam complaints already observed.
  await sql
    .raw(
      `
    INSERT INTO public.email_suppressions (tenant_id, email, reason, occurred_at)
    SELECT DISTINCT ON (tenant_id, email)
      tenant_id, email, 'hard_bounce', COALESCE(bounced_at, now())
    FROM public.person_newsletter_engagements
    WHERE hard_bounced = true
    ORDER BY tenant_id, email, bounced_at DESC NULLS LAST
    ON CONFLICT (tenant_id, email, reason) DO NOTHING;

    INSERT INTO public.email_suppressions (tenant_id, email, reason, occurred_at)
    SELECT DISTINCT ON (tenant_id, email)
      tenant_id, email, 'spam_complaint', "timestamp"
    FROM public.newsletter_events
    WHERE event_type = 'spamreport'
    ORDER BY tenant_id, email, "timestamp" DESC
    ON CONFLICT (tenant_id, email, reason) DO NOTHING;
  `,
    )
    .execute(db);

  // The tenant-wide opt-in columns are fully replaced by campaign_subscriptions.
  await sql
    .raw(
      `
    ALTER TABLE public.persons
      DROP COLUMN IF EXISTS opt_in_status,
      DROP COLUMN IF EXISTS opt_in_confirmed_at;
  `,
    )
    .execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  // Consent moved out of persons/tags cannot be restored; down removes structures only.
  await sql`ALTER TABLE public.newsletters DROP CONSTRAINT IF EXISTS fk_newsletters_campaign`.execute(db);
  await sql`ALTER TABLE public.newsletters DROP COLUMN IF EXISTS campaign_id`.execute(db);
  await sql`DROP TABLE IF EXISTS public.campaign_subscriptions`.execute(db);
  await sql`DROP TABLE IF EXISTS public.email_suppressions`.execute(db);
  await sql`
    ALTER TABLE public.persons
      ADD COLUMN IF NOT EXISTS opt_in_status text,
      ADD COLUMN IF NOT EXISTS opt_in_confirmed_at timestamp with time zone
  `.execute(db);
}
