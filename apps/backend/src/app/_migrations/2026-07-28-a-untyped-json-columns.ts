import type { Kysely } from 'kysely';
import { sql } from 'kysely';

/**
 * Schema review 2026-07-06 §3 — the untyped grab-bag `json` column that six
 * tables carried (persons, households, campaigns, companies, tenants,
 * profiles). A code audit found exactly two of them are real features:
 *
 *   - profiles.json   → notification preferences ({ notifications: {...} }),
 *                       read by every mail/notification opt-out check.
 *   - companies.json  → Google Places enrichment payload
 *                       ({ google_enriched: true, ... }), queried in SQL by
 *                       the enrichment backfill job.
 *
 * Those two are renamed to what they actually are (`preferences`,
 * `enrichment`) and get Zod contracts in libs/common. The other four
 * (persons, households, campaigns, tenants) are written as NULL or never
 * touched at all — they are dropped, with any non-NULL values copied to
 * `dropped_json_archive` first so no tenant data is silently destroyed.
 *
 * The archive table is only created if at least one row actually needs
 * archiving, and it gets the same FORCE-RLS tenant_isolation policy as every
 * other tenant_id-bearing table (the S-1 migration loop only covered tables
 * that existed when it ran).
 */

const TENANT_POLICY_EXPR = `NULLIF(current_setting('app.tenant_id', true), '') IS NULL
  OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::bigint`;

export async function up(db: Kysely<any>): Promise<void> {
  // 1. Archive any real data hiding in the four dead columns before dropping.
  //    tenants has no tenant_id column — its own id is the tenant.
  await sql`
    DO $$
    DECLARE
      n bigint;
    BEGIN
      SELECT (SELECT count(*) FROM public.persons    WHERE "json" IS NOT NULL)
           + (SELECT count(*) FROM public.households WHERE "json" IS NOT NULL)
           + (SELECT count(*) FROM public.campaigns  WHERE "json" IS NOT NULL)
           + (SELECT count(*) FROM public.tenants    WHERE "json" IS NOT NULL)
        INTO n;

      IF n > 0 THEN
        CREATE TABLE IF NOT EXISTS public.dropped_json_archive (
          table_name  text        NOT NULL,
          row_id      text        NOT NULL,
          tenant_id   bigint,
          json        jsonb       NOT NULL,
          archived_at timestamptz NOT NULL DEFAULT now()
        );
        ALTER TABLE public.dropped_json_archive ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public.dropped_json_archive FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation ON public.dropped_json_archive;
        CREATE POLICY tenant_isolation ON public.dropped_json_archive
          FOR ALL
          USING (${sql.raw(TENANT_POLICY_EXPR)})
          WITH CHECK (${sql.raw(TENANT_POLICY_EXPR)});

        INSERT INTO public.dropped_json_archive (table_name, row_id, tenant_id, json)
          SELECT 'persons', id::text, tenant_id, "json" FROM public.persons WHERE "json" IS NOT NULL;
        INSERT INTO public.dropped_json_archive (table_name, row_id, tenant_id, json)
          SELECT 'households', id::text, tenant_id, "json" FROM public.households WHERE "json" IS NOT NULL;
        INSERT INTO public.dropped_json_archive (table_name, row_id, tenant_id, json)
          SELECT 'campaigns', id::text, tenant_id, "json" FROM public.campaigns WHERE "json" IS NOT NULL;
        INSERT INTO public.dropped_json_archive (table_name, row_id, tenant_id, json)
          SELECT 'tenants', id::text, id, "json" FROM public.tenants WHERE "json" IS NOT NULL;
      END IF;
    END $$;
  `.execute(db);

  // 2. Drop the dead grab-bags.
  await sql`
    ALTER TABLE public.persons    DROP COLUMN IF EXISTS "json";
    ALTER TABLE public.households DROP COLUMN IF EXISTS "json";
    ALTER TABLE public.campaigns  DROP COLUMN IF EXISTS "json";
    ALTER TABLE public.tenants    DROP COLUMN IF EXISTS "json";
  `.execute(db);

  // 3. Rename the two live ones to what they hold.
  await sql`
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'json') THEN
        ALTER TABLE public.profiles RENAME COLUMN "json" TO preferences;
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public' AND table_name = 'companies' AND column_name = 'json') THEN
        ALTER TABLE public.companies RENAME COLUMN "json" TO enrichment;
      END IF;
    END $$;
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'preferences') THEN
        ALTER TABLE public.profiles RENAME COLUMN preferences TO "json";
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public' AND table_name = 'companies' AND column_name = 'enrichment') THEN
        ALTER TABLE public.companies RENAME COLUMN enrichment TO "json";
      END IF;
    END $$;
  `.execute(db);

  // Columns come back empty; data (if any) stays in dropped_json_archive for
  // manual restoration — a blind restore could clobber rows written since.
  await sql`
    ALTER TABLE public.persons    ADD COLUMN IF NOT EXISTS "json" jsonb;
    ALTER TABLE public.households ADD COLUMN IF NOT EXISTS "json" jsonb;
    ALTER TABLE public.campaigns  ADD COLUMN IF NOT EXISTS "json" jsonb;
    ALTER TABLE public.tenants    ADD COLUMN IF NOT EXISTS "json" jsonb;
  `.execute(db);
}
