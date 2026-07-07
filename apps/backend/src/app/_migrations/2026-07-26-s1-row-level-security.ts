import type { Kysely } from 'kysely';
import { sql } from 'kysely';

/**
 * S-1 (schema review 2026-07-06 §6): row-level security as a defense-in-depth
 * backstop beneath the app-level `.where('tenant_id', …)` scoping and the
 * `local/no-unscoped-db-query` lint rule.
 *
 * Every base table carrying a `tenant_id` column gets ENABLE + FORCE RLS and a
 * single `tenant_isolation` policy. This is only meaningful now that S-2 made the
 * runtime role (`pplcrm_app`) a non-owner — owners bypass their own policies, and
 * FORCE makes the policy bind even for the owner.
 *
 * Policy — "opt-in scoping":
 *
 *     NULLIF(current_setting('app.tenant_id', true), '') IS NULL
 *     OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::bigint
 *
 * The cast targets the NULLIF result, not current_setting directly: the GUC is
 * set to the empty string (not NULL) on unscoped checkouts, and Postgres does
 * not short-circuit the OR — so a bare `''::bigint` would throw. `NULLIF(…, '')`
 * turns empty into NULL, and NULL::bigint is a safe no-op.
 *
 * When the `app.tenant_id` GUC is empty/unset the policy allows every row; when
 * it is set to a tenant id the policy restricts to that tenant (USING for
 * read/update/delete, WITH CHECK for insert). The runtime pool's
 * `onReserveConnection` hook (base.repo.ts) sets the GUC from the async-context
 * tenant (tenant-context.ts) on every connection checkout, and the tRPC
 * `isAuthed` middleware establishes that context for authenticated requests.
 *
 * Leaving "unset = allow all" is deliberate and load-bearing: the pre-auth
 * "identify the tenant" queries (login/passkey, refresh-token, webhook- and
 * api-key resolution, public event pages) and the background-job worker (some of
 * whose jobs are intentionally cross-tenant, e.g. prune_retention) run with no
 * tenant context, so RLS must not restrict them. They remain protected by their
 * existing app-level scoping; RLS adds isolation precisely on the authenticated
 * request path, where untrusted input drives the queries.
 *
 * `tenants` itself has no `tenant_id` column and is intentionally excluded.
 */

// One expression, reused for USING and WITH CHECK. `current_setting(…, true)`
// (missing_ok) returns NULL when the GUC was never set in the session.
const TENANT_TABLES_LOOP = `
  SELECT c.table_name
  FROM information_schema.columns c
  JOIN information_schema.tables t
    ON t.table_schema = c.table_schema AND t.table_name = c.table_name
  WHERE c.table_schema = 'public'
    AND c.column_name = 'tenant_id'
    AND t.table_type = 'BASE TABLE'
`;

export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    DO $$
    DECLARE
      r record;
      policy_expr text :=
        $expr$NULLIF(current_setting('app.tenant_id', true), '') IS NULL
          OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::bigint$expr$;
    BEGIN
      FOR r IN ${sql.raw(TENANT_TABLES_LOOP)} LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.table_name);
        EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', r.table_name);
        EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON public.%I', r.table_name);
        EXECUTE format(
          'CREATE POLICY tenant_isolation ON public.%I FOR ALL USING (%s) WITH CHECK (%s)',
          r.table_name, policy_expr, policy_expr
        );
      END LOOP;
    END $$;
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`
    DO $$
    DECLARE
      r record;
    BEGIN
      FOR r IN ${sql.raw(TENANT_TABLES_LOOP)} LOOP
        EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON public.%I', r.table_name);
        EXECUTE format('ALTER TABLE public.%I NO FORCE ROW LEVEL SECURITY', r.table_name);
        EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY', r.table_name);
      END LOOP;
    END $$;
  `.execute(db);
}
