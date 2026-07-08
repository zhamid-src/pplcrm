import type { Kysely } from 'kysely';
import { sql } from 'kysely';

/**
 * Canvassing (§13) — turfs, their doors, team/tokenised assignments, and knocks.
 *
 * Every table follows the house multi-tenant conventions established in
 * `schema.sql`:
 *   - `bigint` id backed by its own sequence, `UNIQUE (id)` (so FKs can target
 *     `id` alone) plus a composite `PRIMARY KEY (id, tenant_id)`.
 *   - `ENABLE` + `FORCE ROW LEVEL SECURITY` with the standard `tenant_isolation`
 *     policy (an unset `app.tenant_id` GUC permits all rows, so migrations and
 *     backfills work — see pplcrm-migrations).
 *   - `GRANT`s to the least-privilege `pplcrm_app` role; the migration itself
 *     runs as `pplcrm_owner`.
 *
 * Multi-statement blocks run through `sql.raw(...)` (parameterless → simple
 * query protocol), exactly like `0001_baseline` executes the schema dump.
 *
 * Progress ("attempted", "conversations", "complete", "in field now") is DERIVED
 * from `turf_knocks` at read time — never stored twice (§22.6).
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
  // ---------------------------------------------------------------- turfs ----
  await sql
    .raw(
      `
    CREATE TABLE public.turfs (
      id            bigint  NOT NULL,
      tenant_id     bigint  NOT NULL,
      createdby_id  bigint  NOT NULL,
      updatedby_id  bigint  NOT NULL,
      name          text    NOT NULL,
      status        text    NOT NULL DEFAULT 'draft',
      list_id       bigint,
      target_doors  integer,
      centroid_lat  double precision,
      centroid_lng  double precision,
      ward          text,
      notes         text,
      created_at    timestamp with time zone DEFAULT now() NOT NULL,
      updated_at    timestamp with time zone DEFAULT now() NOT NULL
    );
    CREATE SEQUENCE public.turfs_id_seq START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
    ALTER SEQUENCE public.turfs_id_seq OWNED BY public.turfs.id;
    ALTER TABLE ONLY public.turfs ALTER COLUMN id SET DEFAULT nextval('public.turfs_id_seq'::regclass);
    ALTER TABLE ONLY public.turfs ADD CONSTRAINT turfs_id_key UNIQUE (id);
    ALTER TABLE ONLY public.turfs ADD CONSTRAINT turfs_pk PRIMARY KEY (id, tenant_id);
    ALTER TABLE ONLY public.turfs ADD CONSTRAINT fk_turfs_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);
    ALTER TABLE ONLY public.turfs ADD CONSTRAINT fk_turfs_createdby FOREIGN KEY (createdby_id) REFERENCES public.authusers(id);
    ALTER TABLE ONLY public.turfs ADD CONSTRAINT fk_turfs_updatedby FOREIGN KEY (updatedby_id) REFERENCES public.authusers(id);
    ALTER TABLE ONLY public.turfs ADD CONSTRAINT fk_turfs_list FOREIGN KEY (list_id) REFERENCES public.lists(id) ON DELETE SET NULL;
    CREATE INDEX idx_turfs_tenant ON public.turfs (tenant_id);
    CREATE INDEX idx_turfs_tenant_list ON public.turfs (tenant_id, list_id);
    CREATE INDEX idx_turfs_tenant_status ON public.turfs (tenant_id, status);
    ${tenantIsolation('turfs')}
  `,
    )
    .execute(db);

  // ------------------------------------------------------- turf_households ---
  // The "doors" of a turf. Junction; one row per household ("one door per
  // household"). Re-syncable from the source list without touching knocks.
  await sql
    .raw(
      `
    CREATE TABLE public.turf_households (
      tenant_id     bigint  NOT NULL,
      turf_id       bigint  NOT NULL,
      household_id  bigint  NOT NULL,
      createdby_id  bigint  NOT NULL,
      updatedby_id  bigint  NOT NULL,
      created_at    timestamp with time zone DEFAULT now() NOT NULL,
      updated_at    timestamp with time zone DEFAULT now() NOT NULL,
      CONSTRAINT turf_households_pk PRIMARY KEY (tenant_id, turf_id, household_id)
    );
    ALTER TABLE ONLY public.turf_households ADD CONSTRAINT fk_turf_households_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);
    ALTER TABLE ONLY public.turf_households ADD CONSTRAINT fk_turf_households_turf FOREIGN KEY (turf_id) REFERENCES public.turfs(id) ON DELETE CASCADE;
    ALTER TABLE ONLY public.turf_households ADD CONSTRAINT fk_turf_households_household FOREIGN KEY (household_id) REFERENCES public.households(id) ON DELETE CASCADE;
    ALTER TABLE ONLY public.turf_households ADD CONSTRAINT fk_turf_households_createdby FOREIGN KEY (createdby_id) REFERENCES public.authusers(id);
    ALTER TABLE ONLY public.turf_households ADD CONSTRAINT fk_turf_households_updatedby FOREIGN KEY (updatedby_id) REFERENCES public.authusers(id);
    CREATE INDEX idx_turf_households_turf ON public.turf_households (tenant_id, turf_id);
    CREATE INDEX idx_turf_households_household ON public.turf_households (tenant_id, household_id);
    ${tenantIsolation('turf_households')}
  `,
    )
    .execute(db);

  // ----------------------------------------------------- turf_assignments ----
  // A turf handed to a team AND/OR opened via a tokenised link (no account).
  // The token is the Companion bearer credential; scoped to this turf + tenant.
  await sql
    .raw(
      `
    CREATE TABLE public.turf_assignments (
      id            bigint  NOT NULL,
      tenant_id     bigint  NOT NULL,
      createdby_id  bigint  NOT NULL,
      updatedby_id  bigint  NOT NULL,
      turf_id       bigint  NOT NULL,
      team_id       bigint,
      token         text    NOT NULL,
      status        text    NOT NULL DEFAULT 'active',
      assigned_at   timestamp with time zone DEFAULT now() NOT NULL,
      created_at    timestamp with time zone DEFAULT now() NOT NULL,
      updated_at    timestamp with time zone DEFAULT now() NOT NULL
    );
    CREATE SEQUENCE public.turf_assignments_id_seq START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
    ALTER SEQUENCE public.turf_assignments_id_seq OWNED BY public.turf_assignments.id;
    ALTER TABLE ONLY public.turf_assignments ALTER COLUMN id SET DEFAULT nextval('public.turf_assignments_id_seq'::regclass);
    ALTER TABLE ONLY public.turf_assignments ADD CONSTRAINT turf_assignments_id_key UNIQUE (id);
    ALTER TABLE ONLY public.turf_assignments ADD CONSTRAINT turf_assignments_pk PRIMARY KEY (id, tenant_id);
    ALTER TABLE ONLY public.turf_assignments ADD CONSTRAINT turf_assignments_token_key UNIQUE (token);
    ALTER TABLE ONLY public.turf_assignments ADD CONSTRAINT fk_turf_assignments_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);
    ALTER TABLE ONLY public.turf_assignments ADD CONSTRAINT fk_turf_assignments_createdby FOREIGN KEY (createdby_id) REFERENCES public.authusers(id);
    ALTER TABLE ONLY public.turf_assignments ADD CONSTRAINT fk_turf_assignments_updatedby FOREIGN KEY (updatedby_id) REFERENCES public.authusers(id);
    ALTER TABLE ONLY public.turf_assignments ADD CONSTRAINT fk_turf_assignments_turf FOREIGN KEY (turf_id) REFERENCES public.turfs(id) ON DELETE CASCADE;
    ALTER TABLE ONLY public.turf_assignments ADD CONSTRAINT fk_turf_assignments_team FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE SET NULL;
    CREATE INDEX idx_turf_assignments_turf ON public.turf_assignments (tenant_id, turf_id);
    CREATE INDEX idx_turf_assignments_team ON public.turf_assignments (tenant_id, team_id);
    ${tenantIsolation('turf_assignments')}
  `,
    )
    .execute(db);

  // ---------------------------------------------------------- turf_knocks ----
  // The source of truth for canvass progress. One row per door interaction,
  // synced live from Canvass Companions. `client_knock_id` de-dupes offline
  // re-sends; `source`/`canvasser_name` carry honest attribution (§22.7).
  await sql
    .raw(
      `
    CREATE TABLE public.turf_knocks (
      id             bigint  NOT NULL,
      tenant_id      bigint  NOT NULL,
      createdby_id   bigint  NOT NULL,
      updatedby_id   bigint  NOT NULL,
      turf_id        bigint  NOT NULL,
      household_id   bigint  NOT NULL,
      person_id      bigint,
      outcome        text    NOT NULL,
      response       text,
      notes          text,
      source         text    NOT NULL DEFAULT 'companion',
      canvasser_name text,
      client_knock_id text,
      knocked_at     timestamp with time zone DEFAULT now() NOT NULL,
      created_at     timestamp with time zone DEFAULT now() NOT NULL,
      updated_at     timestamp with time zone DEFAULT now() NOT NULL
    );
    CREATE SEQUENCE public.turf_knocks_id_seq START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
    ALTER SEQUENCE public.turf_knocks_id_seq OWNED BY public.turf_knocks.id;
    ALTER TABLE ONLY public.turf_knocks ALTER COLUMN id SET DEFAULT nextval('public.turf_knocks_id_seq'::regclass);
    ALTER TABLE ONLY public.turf_knocks ADD CONSTRAINT turf_knocks_id_key UNIQUE (id);
    ALTER TABLE ONLY public.turf_knocks ADD CONSTRAINT turf_knocks_pk PRIMARY KEY (id, tenant_id);
    ALTER TABLE ONLY public.turf_knocks ADD CONSTRAINT fk_turf_knocks_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);
    ALTER TABLE ONLY public.turf_knocks ADD CONSTRAINT fk_turf_knocks_createdby FOREIGN KEY (createdby_id) REFERENCES public.authusers(id);
    ALTER TABLE ONLY public.turf_knocks ADD CONSTRAINT fk_turf_knocks_updatedby FOREIGN KEY (updatedby_id) REFERENCES public.authusers(id);
    ALTER TABLE ONLY public.turf_knocks ADD CONSTRAINT fk_turf_knocks_turf FOREIGN KEY (turf_id) REFERENCES public.turfs(id) ON DELETE CASCADE;
    ALTER TABLE ONLY public.turf_knocks ADD CONSTRAINT fk_turf_knocks_household FOREIGN KEY (household_id) REFERENCES public.households(id) ON DELETE CASCADE;
    ALTER TABLE ONLY public.turf_knocks ADD CONSTRAINT fk_turf_knocks_person FOREIGN KEY (person_id) REFERENCES public.persons(id) ON DELETE SET NULL;
    CREATE INDEX idx_turf_knocks_turf ON public.turf_knocks (tenant_id, turf_id);
    CREATE INDEX idx_turf_knocks_household ON public.turf_knocks (tenant_id, household_id);
    CREATE INDEX idx_turf_knocks_knocked_at ON public.turf_knocks (tenant_id, knocked_at);
    CREATE UNIQUE INDEX uq_turf_knocks_client ON public.turf_knocks (tenant_id, turf_id, client_knock_id) WHERE client_knock_id IS NOT NULL;
    ${tenantIsolation('turf_knocks')}
  `,
    )
    .execute(db);

  // Least-privilege grants to the app role (owner already has everything).
  await sql
    .raw(
      `
    GRANT SELECT, INSERT, DELETE, UPDATE ON TABLE public.turfs TO pplcrm_app;
    GRANT SELECT, INSERT, DELETE, UPDATE ON TABLE public.turf_households TO pplcrm_app;
    GRANT SELECT, INSERT, DELETE, UPDATE ON TABLE public.turf_assignments TO pplcrm_app;
    GRANT SELECT, INSERT, DELETE, UPDATE ON TABLE public.turf_knocks TO pplcrm_app;
    GRANT SELECT, USAGE ON SEQUENCE public.turfs_id_seq TO pplcrm_app;
    GRANT SELECT, USAGE ON SEQUENCE public.turf_assignments_id_seq TO pplcrm_app;
    GRANT SELECT, USAGE ON SEQUENCE public.turf_knocks_id_seq TO pplcrm_app;
  `,
    )
    .execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql
    .raw(
      `
    DROP TABLE IF EXISTS public.turf_knocks CASCADE;
    DROP TABLE IF EXISTS public.turf_assignments CASCADE;
    DROP TABLE IF EXISTS public.turf_households CASCADE;
    DROP TABLE IF EXISTS public.turfs CASCADE;
  `,
    )
    .execute(db);
}
