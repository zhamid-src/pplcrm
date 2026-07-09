import type { Kysely } from 'kysely';
import { sql } from 'kysely';

/**
 * Campaigns §15 — campaign-scoped person facts + the global do-not-contact flag.
 *
 * Support level and voting status are structured per-campaign concepts, not tags:
 * single-valued, enum-constrained, machine-updated (canvass knocks, forms), and
 * queried by send/knock logic. One row per (campaign, person); a missing row or
 * NULL field means "Unknown" — never stored explicitly.
 *
 * Do-not-contact is the opposite: a person-level compliance flag that overrides
 * every context (an optional channel list narrows it; NULL = all channels).
 *
 * The legacy system tags migrate here and are deleted:
 *   supporter → strong · non-supporter → against · undecided → undecided
 *   (into each tenant's office campaign; ties resolved supporter-first)
 *   do-not-contact → persons.do_not_contact = true
 *
 * DDL follows the house multi-tenant conventions (bigint id + own sequence,
 * UNIQUE (id), composite PK (id, tenant_id), FORCE RLS with tenant_isolation,
 * GRANTs to pplcrm_app) — same as the canvassing/deliveries migrations.
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
    CREATE TABLE public.campaign_person_facts (
      id                   bigint NOT NULL,
      tenant_id            bigint NOT NULL,
      campaign_id          bigint NOT NULL,
      person_id            bigint NOT NULL,
      createdby_id         bigint NOT NULL,
      updatedby_id         bigint NOT NULL,
      support_level        text,
      support_source       text,
      support_recorded_by  bigint,
      support_recorded_at  timestamp with time zone,
      voting_status        text,
      voting_source        text,
      voting_recorded_by   bigint,
      voting_recorded_at   timestamp with time zone,
      created_at           timestamp with time zone DEFAULT now() NOT NULL,
      updated_at           timestamp with time zone DEFAULT now() NOT NULL,
      CONSTRAINT chk_cpf_support_level CHECK (support_level IS NULL OR support_level = ANY (ARRAY['strong'::text, 'leaning'::text, 'neutral'::text, 'leaning_against'::text, 'against'::text, 'undecided'::text])),
      CONSTRAINT chk_cpf_support_source CHECK (support_source IS NULL OR support_source = ANY (ARRAY['manual'::text, 'canvass'::text, 'form'::text, 'import'::text, 'carryover'::text])),
      CONSTRAINT chk_cpf_voting_status CHECK (voting_status IS NULL OR voting_status = ANY (ARRAY['will_vote'::text, 'voted_advance'::text, 'voted_eday'::text, 'not_voting'::text, 'ineligible'::text])),
      CONSTRAINT chk_cpf_voting_source CHECK (voting_source IS NULL OR voting_source = ANY (ARRAY['manual'::text, 'canvass'::text, 'form'::text, 'import'::text]))
    );
    CREATE SEQUENCE public.campaign_person_facts_id_seq START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
    ALTER SEQUENCE public.campaign_person_facts_id_seq OWNED BY public.campaign_person_facts.id;
    ALTER TABLE ONLY public.campaign_person_facts ALTER COLUMN id SET DEFAULT nextval('public.campaign_person_facts_id_seq'::regclass);
    ALTER TABLE ONLY public.campaign_person_facts ADD CONSTRAINT campaign_person_facts_id_key UNIQUE (id);
    ALTER TABLE ONLY public.campaign_person_facts ADD CONSTRAINT campaign_person_facts_pk PRIMARY KEY (id, tenant_id);
    ALTER TABLE ONLY public.campaign_person_facts ADD CONSTRAINT uq_cpf_campaign_person UNIQUE (tenant_id, campaign_id, person_id);
    ALTER TABLE ONLY public.campaign_person_facts ADD CONSTRAINT fk_cpf_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);
    ALTER TABLE ONLY public.campaign_person_facts ADD CONSTRAINT fk_cpf_campaign FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;
    ALTER TABLE ONLY public.campaign_person_facts ADD CONSTRAINT fk_cpf_person FOREIGN KEY (person_id) REFERENCES public.persons(id) ON DELETE CASCADE;
    ALTER TABLE ONLY public.campaign_person_facts ADD CONSTRAINT fk_cpf_createdby FOREIGN KEY (createdby_id) REFERENCES public.authusers(id);
    ALTER TABLE ONLY public.campaign_person_facts ADD CONSTRAINT fk_cpf_updatedby FOREIGN KEY (updatedby_id) REFERENCES public.authusers(id);
    CREATE INDEX idx_cpf_tenant_campaign ON public.campaign_person_facts (tenant_id, campaign_id);
    CREATE INDEX idx_cpf_tenant_person ON public.campaign_person_facts (tenant_id, person_id);
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_person_facts TO pplcrm_app;
    GRANT USAGE ON SEQUENCE public.campaign_person_facts_id_seq TO pplcrm_app;
    ${tenantIsolation('campaign_person_facts')}
  `,
    )
    .execute(db);

  // Global do-not-contact flag; NULL channel list = suppressed on every channel.
  await sql
    .raw(
      `
    ALTER TABLE public.persons
      ADD COLUMN do_not_contact boolean NOT NULL DEFAULT false,
      ADD COLUMN do_not_contact_channels text[];
  `,
    )
    .execute(db);

  // Backfill support levels from the legacy tags into each tenant's office
  // campaign. A person with several of the tags gets the most committed one
  // (supporter > non-supporter > undecided).
  await sql
    .raw(
      `
    INSERT INTO public.campaign_person_facts
      (tenant_id, campaign_id, person_id, createdby_id, updatedby_id,
       support_level, support_source, support_recorded_by, support_recorded_at)
    SELECT DISTINCT ON (mpt.tenant_id, mpt.person_id)
      mpt.tenant_id,
      c.id,
      mpt.person_id,
      mpt.createdby_id,
      mpt.updatedby_id,
      CASE lower(t.name)
        WHEN 'supporter' THEN 'strong'
        WHEN 'non-supporter' THEN 'against'
        ELSE 'undecided'
      END,
      'import',
      mpt.createdby_id,
      mpt.created_at
    FROM public.map_peoples_tags mpt
    JOIN public.tags t ON t.id = mpt.tag_id AND t.tenant_id = mpt.tenant_id
    JOIN public.campaigns c ON c.tenant_id = mpt.tenant_id AND c.kind = 'office'
    WHERE lower(t.name) IN ('supporter', 'non-supporter', 'undecided')
    ORDER BY mpt.tenant_id, mpt.person_id,
      CASE lower(t.name) WHEN 'supporter' THEN 0 WHEN 'non-supporter' THEN 1 ELSE 2 END;
  `,
    )
    .execute(db);

  // Backfill the do-not-contact flag from its legacy tag.
  await sql
    .raw(
      `
    UPDATE public.persons p
    SET do_not_contact = true
    FROM public.map_peoples_tags mpt
    JOIN public.tags t ON t.id = mpt.tag_id AND t.tenant_id = mpt.tenant_id
    WHERE mpt.person_id = p.id
      AND mpt.tenant_id = p.tenant_id
      AND lower(t.name) = 'do-not-contact';
  `,
    )
    .execute(db);

  // Retire the migrated tags entirely (mappings first, then the tags).
  await sql
    .raw(
      `
    DELETE FROM public.map_peoples_tags mpt
    USING public.tags t
    WHERE t.id = mpt.tag_id AND t.tenant_id = mpt.tenant_id
      AND lower(t.name) IN ('supporter', 'non-supporter', 'undecided', 'do-not-contact');
    DELETE FROM public.map_households_tags mht
    USING public.tags t
    WHERE t.id = mht.tag_id AND t.tenant_id = mht.tenant_id
      AND lower(t.name) IN ('supporter', 'non-supporter', 'undecided', 'do-not-contact');
    DELETE FROM public.tags
    WHERE lower(name) IN ('supporter', 'non-supporter', 'undecided', 'do-not-contact');
  `,
    )
    .execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  // Data moved out of tags cannot be restored; down only removes the structures.
  await sql`DROP TABLE IF EXISTS public.campaign_person_facts`.execute(db);
  await sql`DROP SEQUENCE IF EXISTS public.campaign_person_facts_id_seq`.execute(db);
  await sql`
    ALTER TABLE public.persons
      DROP COLUMN IF EXISTS do_not_contact,
      DROP COLUMN IF EXISTS do_not_contact_channels
  `.execute(db);
}
