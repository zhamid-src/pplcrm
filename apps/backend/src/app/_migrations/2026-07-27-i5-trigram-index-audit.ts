import type { Kysely } from 'kysely';
import { sql } from 'kysely';

/**
 * I-5: Drop unused/unusable GIN trigram indexes (schema review 2026-07-06, §4;
 * the audit deferred by the I-2/I-6 migration).
 *
 * Trigram GINs are the most expensive indexes per write in the schema, and they
 * only pay off for columns reachable by a grid "contains" filter (ILIKE '%…%' on
 * the bare column) on a table large enough that the planner would ever prefer
 * them over the tenant btree. Audited against the grid column definitions and
 * each repo's filterModel/columnMapping wiring:
 *
 * Dropped —
 * - idx_households_trgm_state: the dominant query is a 2-letter code; a '%tx%'
 *   pattern extracts zero trigrams, so pg_trgm physically cannot use the index.
 * - idx_companies_trgm_email / _industry: unreachable. The companies repo wires
 *   no searchStr/filterModel handling, so no ILIKE ever targets these columns.
 * - idx_lists_trgm_name / _description, idx_tags_trgm_name,
 *   idx_volunteer_events_trgm_name / _location: reachable, but these tables are
 *   dozens-to-hundreds of rows per tenant — the planner always prefers the
 *   tenant btree + filter at that cardinality. Revisit if any of them
 *   realistically grows past ~10k rows.
 *
 * Kept (persons first_name/last_name/email/mobile; households street1/city/zip;
 * companies name) — mapped grid filters on voter-file-scale tables, plus the
 * persons-grid Company filter that reaches companies.name through the join.
 */
export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    DROP INDEX IF EXISTS public.idx_households_trgm_state;
    DROP INDEX IF EXISTS public.idx_companies_trgm_email;
    DROP INDEX IF EXISTS public.idx_companies_trgm_industry;
    DROP INDEX IF EXISTS public.idx_lists_trgm_name;
    DROP INDEX IF EXISTS public.idx_lists_trgm_description;
    DROP INDEX IF EXISTS public.idx_tags_trgm_name;
    DROP INDEX IF EXISTS public.idx_volunteer_events_trgm_name;
    DROP INDEX IF EXISTS public.idx_volunteer_events_trgm_location;
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`
    CREATE INDEX IF NOT EXISTS idx_households_trgm_state ON public.households USING gin (state public.gin_trgm_ops);
    CREATE INDEX IF NOT EXISTS idx_companies_trgm_email ON public.companies USING gin (email public.gin_trgm_ops);
    CREATE INDEX IF NOT EXISTS idx_companies_trgm_industry ON public.companies USING gin (industry public.gin_trgm_ops);
    CREATE INDEX IF NOT EXISTS idx_lists_trgm_name ON public.lists USING gin (name public.gin_trgm_ops);
    CREATE INDEX IF NOT EXISTS idx_lists_trgm_description ON public.lists USING gin (description public.gin_trgm_ops);
    CREATE INDEX IF NOT EXISTS idx_tags_trgm_name ON public.tags USING gin (name public.gin_trgm_ops);
    CREATE INDEX IF NOT EXISTS idx_volunteer_events_trgm_name ON public.volunteer_events USING gin (name public.gin_trgm_ops);
    CREATE INDEX IF NOT EXISTS idx_volunteer_events_trgm_location ON public.volunteer_events USING gin (location_address public.gin_trgm_ops);
  `.execute(db);
}
