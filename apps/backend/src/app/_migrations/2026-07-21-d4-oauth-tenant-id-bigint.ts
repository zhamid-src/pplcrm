import type { Kysely } from 'kysely';
import { sql } from 'kysely';

/**
 * D-4: Convert ms_oauth_tokens.tenant_id / google_oauth_tokens.tenant_id from
 * text to bigint and add the missing FK to tenants (schema review 2026-07-06, §3).
 *
 * These were the only two tables storing tenant_id as text; every other table
 * uses bigint. text meant no FK to tenants was possible, joins needed casts, and
 * the two most sensitive tables in the database (live mailbox tokens) had the
 * weakest integrity. After conversion the existing UNIQUE(tenant_id) constraints
 * remain valid and a CASCADE FK ties token rows to their tenant.
 *
 * No TypeScript change is required. This codebase types every bigint column as
 * `string` in TS (the pg driver returns int8 as string; there is no type-parser
 * override), so the models' `tenant_id: string` and the OAuth services — which
 * pass `tenantId: string` straight through — remain correct against a bigint
 * column (pg coerces the text parameter on write, returns text on read). The
 * review's suggested string->number change does not apply here.
 *
 * Guarded so it is a no-op on a database whose baseline already has bigint. Any
 * non-numeric value would fail the ::bigint cast; the dev data was cleared
 * before this ran and every historical value was digits-only (review-verified).
 */
export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    DO $$
    BEGIN
      IF (SELECT data_type FROM information_schema.columns
          WHERE table_schema='public' AND table_name='ms_oauth_tokens' AND column_name='tenant_id') = 'text' THEN
        ALTER TABLE public.ms_oauth_tokens ALTER COLUMN tenant_id TYPE bigint USING tenant_id::bigint;
      END IF;
      IF (SELECT data_type FROM information_schema.columns
          WHERE table_schema='public' AND table_name='google_oauth_tokens' AND column_name='tenant_id') = 'text' THEN
        ALTER TABLE public.google_oauth_tokens ALTER COLUMN tenant_id TYPE bigint USING tenant_id::bigint;
      END IF;
    END $$;
  `.execute(db);

  await sql`
    ALTER TABLE public.ms_oauth_tokens DROP CONSTRAINT IF EXISTS fk_ms_oauth_tenant;
    ALTER TABLE public.ms_oauth_tokens ADD CONSTRAINT fk_ms_oauth_tenant
      FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

    ALTER TABLE public.google_oauth_tokens DROP CONSTRAINT IF EXISTS fk_google_oauth_tenant;
    ALTER TABLE public.google_oauth_tokens ADD CONSTRAINT fk_google_oauth_tenant
      FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`
    ALTER TABLE public.ms_oauth_tokens DROP CONSTRAINT IF EXISTS fk_ms_oauth_tenant;
    ALTER TABLE public.google_oauth_tokens DROP CONSTRAINT IF EXISTS fk_google_oauth_tenant;
    ALTER TABLE public.ms_oauth_tokens ALTER COLUMN tenant_id TYPE text USING tenant_id::text;
    ALTER TABLE public.google_oauth_tokens ALTER COLUMN tenant_id TYPE text USING tenant_id::text;
  `.execute(db);
}
