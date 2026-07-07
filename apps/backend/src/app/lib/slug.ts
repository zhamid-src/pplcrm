import type { Kysely } from 'kysely';
import { sql } from 'kysely';

import type { Models } from '../../../../../libs/common/src/lib/kysely.models';

/**
 * Record-slug helpers (spec §1: routes use record slugs — /people/amira-hassan —
 * never internal IDs). Generalized from the web-forms `uniqueSlug` pattern so
 * every slug-bearing entity (web_forms, persons, households, companies, …)
 * shares one collision strategy: base, base-2, base-3, … unique per tenant.
 *
 * Compute the base with `slugifyRecordName` from @common, then call
 * {@link uniqueSlug} with a tenant-scoped lookup. For bulk insert paths (CSV
 * imports, seeds) use {@link backfillMissingSlugs} — one set-based statement
 * instead of a query per row.
 */

/**
 * Find the first free slug for `base` using the caller's tenant-scoped
 * `isTaken` check — every repo exposes the same `slugExists(tenant_id, slug,
 * excludeId?)` shape (pass the record's own id as `excludeId` on rename so it
 * can keep its slug).
 */
export async function uniqueSlug(base: string, isTaken: (candidate: string) => Promise<boolean>): Promise<string> {
  let candidate = base;
  let n = 2;
  while (await isTaken(candidate)) {
    candidate = `${base}-${n}`;
    n += 1;
  }
  return candidate;
}

/** Slug source definitions for the record tables backfilled by bulk paths. */
const BULK_SLUG_SOURCES = {
  persons: { fallback: 'person', source: `coalesce(first_name, '') || ' ' || coalesce(last_name, '')` },
  households: { fallback: 'household', source: `coalesce(street_num, '') || ' ' || coalesce(street1, '')` },
  companies: { fallback: 'company', source: `coalesce(name, '')` },
} as const;

export type SluggedTable = keyof typeof BULK_SLUG_SOURCES;

/**
 * Fill in slugs for every row of `table` in `tenant_id` that has none yet —
 * the set-based companion to {@link uniqueSlug} for bulk insert paths (CSV
 * import workers, onboarding seeds). Slugify + all-digit guard match the
 * 2026-07-07-record-slugs migration; collision handling differs from the
 * interactive path: the first row of a base keeps the bare slug only when no
 * existing row holds it, and every other row gets an id suffix (`{base}-{id}`)
 * — always unique in one statement, no per-row query loop.
 */
export async function backfillMissingSlugs(db: Kysely<Models>, table: SluggedTable, tenant_id: string): Promise<void> {
  const { fallback, source } = BULK_SLUG_SOURCES[table];
  await sql`
    WITH base AS (
      SELECT id, tenant_id,
        left(btrim(regexp_replace(lower(${sql.raw(source)}), '[^a-z0-9]+', '-', 'g'), '-'), 80) AS b
      FROM ${sql.table(table)}
      WHERE slug IS NULL AND tenant_id = ${tenant_id}
    ),
    named AS (
      SELECT id, tenant_id,
        CASE
          WHEN b = '' THEN ${fallback}
          WHEN b ~ '^[0-9]+$' THEN ${fallback} || '-' || b
          ELSE b
        END AS b
      FROM base
    ),
    deduped AS (
      SELECT n.id,
        n.b || CASE WHEN rn = 1 AND NOT EXISTS (
          SELECT 1 FROM ${sql.table(table)} x
          WHERE x.tenant_id = n.tenant_id AND x.slug = n.b
        ) THEN '' ELSE '-' || n.id END AS candidate
      FROM (
        SELECT id, tenant_id, b, row_number() OVER (PARTITION BY tenant_id, b ORDER BY id) AS rn
        FROM named
      ) n
    )
    UPDATE ${sql.table(table)} t
    SET slug = d.candidate
    FROM deduped d
    WHERE t.id = d.id
  `.execute(db);
}
