import type { Kysely } from 'kysely';
import { sql } from 'kysely';

// Deliveries (spec §14): yard-sign delivery requests → routes → volunteer-driven stops.
//
// Three tables, all tenant-scoped with the same RLS + FORCE ROW LEVEL SECURITY shape as every
// other tenant table (schema review S-1). Key modelling decisions come straight from the binding
// spec (docs/spec/Deliveries Spec.dc.html §2):
//   - "routed" is NOT a stored request status — it is derived from an active (pending) route stop.
//     One source of truth; a partial unique index guarantees a request sits on at most one active
//     stop at a time.
//   - Route status uses the spec's American spelling "canceled".
//   - The volunteer capability link is stored only as a sha256 hash of the raw token; the raw token
//     is returned to staff once and never persisted.
export async function up(db: Kysely<any>): Promise<void> {
  // ---- delivery_requests ---------------------------------------------------
  await sql`
    CREATE TABLE public.delivery_requests (
      id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      tenant_id bigint NOT NULL,
      household_id bigint NOT NULL,
      person_id bigint,
      web_form_id uuid,
      source text NOT NULL DEFAULT 'manual',
      status text NOT NULL DEFAULT 'new',
      notes text,
      skip_reason text,
      createdby_id bigint NOT NULL,
      updatedby_id bigint,
      created_at timestamp with time zone DEFAULT now() NOT NULL,
      updated_at timestamp with time zone DEFAULT now() NOT NULL,
      CONSTRAINT chk_delivery_requests_source CHECK (source = ANY (ARRAY['web_form'::text, 'manual'::text])),
      CONSTRAINT chk_delivery_requests_status CHECK (status = ANY (ARRAY['new'::text, 'approved'::text, 'declined'::text, 'delivered'::text]))
    )
  `.execute(db);
  await sql`ALTER TABLE public.delivery_requests OWNER TO pplcrm_owner`.execute(db);
  await sql`
    ALTER TABLE public.delivery_requests
      ADD CONSTRAINT fk_delivery_requests_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE,
      ADD CONSTRAINT fk_delivery_requests_household FOREIGN KEY (household_id) REFERENCES public.households(id) ON DELETE CASCADE,
      ADD CONSTRAINT fk_delivery_requests_person FOREIGN KEY (person_id) REFERENCES public.persons(id) ON DELETE SET NULL,
      ADD CONSTRAINT fk_delivery_requests_web_form FOREIGN KEY (web_form_id) REFERENCES public.web_forms(id) ON DELETE SET NULL
  `.execute(db);
  await sql`CREATE INDEX idx_delivery_requests_tenant_status ON public.delivery_requests USING btree (tenant_id, status)`.execute(
    db,
  );
  await sql`CREATE INDEX idx_delivery_requests_tenant_household ON public.delivery_requests USING btree (tenant_id, household_id)`.execute(
    db,
  );

  // ---- delivery_routes -----------------------------------------------------
  await sql`
    CREATE TABLE public.delivery_routes (
      id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      tenant_id bigint NOT NULL,
      name text NOT NULL,
      status text NOT NULL DEFAULT 'draft',
      volunteer_person_id bigint,
      start_address text NOT NULL,
      start_lat double precision NOT NULL,
      start_lng double precision NOT NULL,
      est_minutes double precision NOT NULL DEFAULT 0,
      est_km double precision NOT NULL DEFAULT 0,
      scheduled_for timestamp with time zone,
      share_token_hash text,
      share_token_expires_at timestamp with time zone,
      params jsonb NOT NULL DEFAULT '{}'::jsonb,
      createdby_id bigint NOT NULL,
      updatedby_id bigint,
      created_at timestamp with time zone DEFAULT now() NOT NULL,
      updated_at timestamp with time zone DEFAULT now() NOT NULL,
      CONSTRAINT chk_delivery_routes_status CHECK (status = ANY (ARRAY['draft'::text, 'assigned'::text, 'in_progress'::text, 'completed'::text, 'canceled'::text]))
    )
  `.execute(db);
  await sql`ALTER TABLE public.delivery_routes OWNER TO pplcrm_owner`.execute(db);
  await sql`
    ALTER TABLE public.delivery_routes
      ADD CONSTRAINT fk_delivery_routes_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE,
      ADD CONSTRAINT fk_delivery_routes_volunteer FOREIGN KEY (volunteer_person_id) REFERENCES public.persons(id) ON DELETE SET NULL
  `.execute(db);
  await sql`CREATE INDEX idx_delivery_routes_tenant_status ON public.delivery_routes USING btree (tenant_id, status)`.execute(
    db,
  );
  // The public volunteer page resolves a route BY its token hash first (the token is the only
  // credential), then scopes every follow-up query by the resolved tenant_id. This partial index
  // keeps that exact-hash lookup fast without being a cross-tenant leak (S-1 RLS still applies to
  // every other query in the handler).
  await sql`CREATE INDEX idx_delivery_routes_share_token_hash ON public.delivery_routes USING btree (share_token_hash) WHERE share_token_hash IS NOT NULL`.execute(
    db,
  );

  // ---- delivery_route_stops ------------------------------------------------
  await sql`
    CREATE TABLE public.delivery_route_stops (
      id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      tenant_id bigint NOT NULL,
      route_id bigint NOT NULL,
      request_id bigint NOT NULL,
      seq integer NOT NULL,
      leg_minutes double precision NOT NULL DEFAULT 0,
      status text NOT NULL DEFAULT 'pending',
      reason text,
      acted_at timestamp with time zone,
      acted_via text,
      createdby_id bigint NOT NULL,
      updatedby_id bigint,
      created_at timestamp with time zone DEFAULT now() NOT NULL,
      updated_at timestamp with time zone DEFAULT now() NOT NULL,
      CONSTRAINT chk_delivery_route_stops_status CHECK (status = ANY (ARRAY['pending'::text, 'delivered'::text, 'skipped'::text])),
      CONSTRAINT chk_delivery_route_stops_acted_via CHECK (acted_via IS NULL OR acted_via = ANY (ARRAY['volunteer_link'::text, 'staff'::text]))
    )
  `.execute(db);
  await sql`ALTER TABLE public.delivery_route_stops OWNER TO pplcrm_owner`.execute(db);
  await sql`
    ALTER TABLE public.delivery_route_stops
      ADD CONSTRAINT fk_delivery_route_stops_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE,
      ADD CONSTRAINT fk_delivery_route_stops_route FOREIGN KEY (route_id) REFERENCES public.delivery_routes(id) ON DELETE CASCADE,
      ADD CONSTRAINT fk_delivery_route_stops_request FOREIGN KEY (request_id) REFERENCES public.delivery_requests(id) ON DELETE CASCADE
  `.execute(db);
  await sql`CREATE INDEX idx_delivery_route_stops_tenant_route ON public.delivery_route_stops USING btree (tenant_id, route_id)`.execute(
    db,
  );
  await sql`CREATE UNIQUE INDEX uq_delivery_route_stops_route_seq ON public.delivery_route_stops USING btree (route_id, seq)`.execute(
    db,
  );
  // Single source of truth for "routed": a request can be on at most ONE active (pending) stop.
  // Skipping/removing a stop flips it out of pending and frees the request back to the pool.
  await sql`CREATE UNIQUE INDEX uq_delivery_route_stops_active_request ON public.delivery_route_stops USING btree (request_id) WHERE status = 'pending'`.execute(
    db,
  );

  // ---- RLS (same policy shape as every tenant table, S-1) ------------------
  for (const table of ['delivery_requests', 'delivery_routes', 'delivery_route_stops']) {
    await sql`ALTER TABLE public.${sql.raw(table)} ENABLE ROW LEVEL SECURITY`.execute(db);
    await sql`ALTER TABLE ONLY public.${sql.raw(table)} FORCE ROW LEVEL SECURITY`.execute(db);
    await sql`
      CREATE POLICY tenant_isolation ON public.${sql.raw(table)}
      USING (
        (NULLIF(current_setting('app.tenant_id', true), '') IS NULL)
        OR (tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::bigint)
      )
      WITH CHECK (
        (NULLIF(current_setting('app.tenant_id', true), '') IS NULL)
        OR (tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::bigint)
      )
    `.execute(db);
    await sql`GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.${sql.raw(table)} TO pplcrm_app`.execute(db);
  }
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`DROP TABLE IF EXISTS public.delivery_route_stops`.execute(db);
  await sql`DROP TABLE IF EXISTS public.delivery_routes`.execute(db);
  await sql`DROP TABLE IF EXISTS public.delivery_requests`.execute(db);
}
