import type { Kysely } from 'kysely';
import { sql } from 'kysely';

/**
 * Every web form gets a slug; the column becomes NOT NULL.
 *
 * The lifecycle create path (createForm → uniqueSlug) has always generated slugs, but the legacy
 * donation add path (addForm) never did, so donation forms carry slug = NULL and are only
 * reachable by raw UUID. The public routes now key every lookup on (tenant, slug) — see the
 * tenant-subdomain URL model — so NULL slugs would make those forms unreachable.
 *
 * Backfill: slugify the form name ('' → 'form'); a candidate that collides with an existing slug
 * in the same tenant, or with another backfilled row's candidate, gets a uuid-prefix suffix
 * instead of a numeric one — collision-proof against both live slugs and other backfill rows in a
 * single pass. idx_web_forms_tenant_slug (partial, WHERE slug IS NOT NULL) already enforces
 * per-tenant uniqueness and keeps doing so once no NULLs remain.
 */
export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    WITH slugged AS (
      SELECT
        id,
        tenant_id,
        CASE WHEN base = '' THEN 'form' ELSE base END AS candidate
      FROM (
        SELECT
          id,
          tenant_id,
          regexp_replace(regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g'), '(^-+|-+$)', '', 'g') AS base
        FROM public.web_forms
        WHERE slug IS NULL
      ) s
    ),
    resolved AS (
      SELECT
        sl.id,
        CASE
          WHEN row_number() OVER (PARTITION BY sl.tenant_id, sl.candidate ORDER BY sl.id) = 1
            AND NOT EXISTS (
              SELECT 1 FROM public.web_forms e
              WHERE e.tenant_id = sl.tenant_id AND e.slug = sl.candidate
            )
          THEN sl.candidate
          ELSE sl.candidate || '-' || left(sl.id::text, 8)
        END AS final_slug
      FROM slugged sl
    )
    UPDATE public.web_forms w
    SET slug = r.final_slug
    FROM resolved r
    WHERE w.id = r.id
  `.execute(db);

  await sql`ALTER TABLE public.web_forms ALTER COLUMN slug SET NOT NULL`.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  // Backfilled values are indistinguishable from user-visible slugs by now; only relax the
  // constraint on rollback, never null the data.
  await sql`ALTER TABLE public.web_forms ALTER COLUMN slug DROP NOT NULL`.execute(db);
}
