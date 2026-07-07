import type { Kysely } from 'kysely';
import { sql } from 'kysely';

/**
 * Record slugs for persons, households and companies (spec §1 security surface:
 * routes use record slugs — /people/amira-hassan — never internal IDs).
 *
 * Follows the existing slug shape used by events/web_forms/volunteer_events:
 * a `slug text` column with a `UNIQUE (tenant_id, slug)` btree index (compare
 * `events_tenant_slug_unique`). Generation on create/rename lives in the app
 * layer (`apps/backend/src/app/lib/slug.ts`, generalized from the web-forms
 * `uniqueSlug` pattern); this migration only adds the columns, backfills every
 * existing row with collision suffixes (-2, -3, … per tenant), and enforces
 * uniqueness.
 *
 * Slug sources: persons = first+last name (fallback "person"), households =
 * street number + street (fallback "household"), companies = name (fallback
 * "company"). An all-digit slug gets the fallback prefixed so a slug can never
 * be mistaken for a numeric-ID URL, which the frontend still accepts and
 * redirects. Pattern notes for later waves: docs/RECORD-SLUGS.md.
 */

const TABLES = [
  { table: 'persons', fallback: 'person', source: `coalesce(first_name, '') || ' ' || coalesce(last_name, '')` },
  { table: 'households', fallback: 'household', source: `coalesce(street_num, '') || ' ' || coalesce(street1, '')` },
  { table: 'companies', fallback: 'company', source: `coalesce(name, '')` },
] as const;

export async function up(db: Kysely<any>): Promise<void> {
  for (const { table, fallback, source } of TABLES) {
    await sql`ALTER TABLE ${sql.table(table)} ADD COLUMN IF NOT EXISTS slug text`.execute(db);

    // Backfill: slugify the source, guard all-digit results, dedupe per tenant
    // with -2, -3… suffixes (deterministic by id).
    await sql`
      WITH base AS (
        SELECT id, tenant_id,
          left(btrim(regexp_replace(lower(${sql.raw(source)}), '[^a-z0-9]+', '-', 'g'), '-'), 80) AS b
        FROM ${sql.table(table)}
        WHERE slug IS NULL
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
        SELECT id, b, row_number() OVER (PARTITION BY tenant_id, b ORDER BY id) AS rn
        FROM named
      )
      UPDATE ${sql.table(table)} t
      SET slug = CASE WHEN d.rn = 1 THEN d.b ELSE d.b || '-' || d.rn END
      FROM deduped d
      WHERE t.id = d.id
    `.execute(db);

    // Residual duplicates are possible when a real name slugifies to an
    // already-suffixed value (e.g. a person literally named "Amira Hassan 2").
    // Disambiguate those rare rows with the row id, which is always unique.
    await sql`
      UPDATE ${sql.table(table)} t
      SET slug = t.slug || '-' || t.id
      FROM (
        SELECT id, row_number() OVER (PARTITION BY tenant_id, slug ORDER BY id) AS rn
        FROM ${sql.table(table)}
      ) d
      WHERE t.id = d.id AND d.rn > 1
    `.execute(db);

    // Same shape as events_tenant_slug_unique. Partial (slug IS NOT NULL) so a
    // not-yet-backfilled bulk row can exist mid-import without tripping it.
    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS ${sql.raw(`${table}_tenant_slug_unique`)}
      ON ${sql.table(table)} USING btree (tenant_id, slug)
      WHERE (slug IS NOT NULL)
    `.execute(db);
  }
}

export async function down(db: Kysely<any>): Promise<void> {
  for (const { table } of TABLES) {
    await sql`DROP INDEX IF EXISTS ${sql.raw(`${table}_tenant_slug_unique`)}`.execute(db);
    await sql`ALTER TABLE ${sql.table(table)} DROP COLUMN IF EXISTS slug`.execute(db);
  }
}
