# Record-slug URLs — the pattern (Wave 0, spec §1)

Spec §1 "security is a surface property": routes carry record slugs
(`/people/amira-hassan`), never tenant or internal IDs. This note documents the
pattern shipped for **persons, households, companies** so later waves can adopt
it for other entities (tasks, lists, teams, …) without re-deriving it.
`web_forms` / `events` / `volunteer_events` / `tenants` already used the same
column shape for their public pages; the record-slug work generalized their
helpers rather than inventing a parallel implementation.

## Database

- `slug text` column, `UNIQUE (tenant_id, slug)` partial btree index
  (`<table>_tenant_slug_unique`, `WHERE slug IS NOT NULL`) — same shape as
  `events_tenant_slug_unique`.
- Migration `apps/backend/src/app/_migrations/2026-07-07-record-slugs.ts`
  backfills every existing row: slugify the source columns, guard all-digit
  results (prefix the fallback noun so a slug can never look like a numeric
  id), dedupe per tenant with `-2`, `-3`… suffixes.
- Slug sources: persons = `first_name last_name` (fallback `person`),
  households = `street_num street1` (fallback `household`), companies = `name`
  (fallback `company`).

## Backend

- `slugifyRecordName(value, fallback)` in `libs/common/src/lib/utils.ts` —
  the one slugifier (lowercase, accent-strip, hyphenate, 80-char cap,
  fallback + all-digit guard).
- `uniqueSlug(base, isTaken)` in `apps/backend/src/app/lib/slug.ts` — the one
  collision loop. Each repo exposes the same `slugExists(tenant_id, slug,
excludeId?)` used as `isTaken` (shape copied from web-forms).
- **Create** paths set `slug` before insert (persons `addPerson`, households
  `addHousehold`, companies `add` override). **Rename** paths regenerate it
  (controller `update` overrides watching the source columns; pass the record
  id as `excludeId` so an unchanged name keeps its slug).
- **Bulk** paths (CSV import workers) call `backfillMissingSlugs(db, table,
tenant_id)` once after inserting — set-based, id-suffixed on collision, no
  per-row query loop. Rows that somehow miss slug generation are harmless:
  they simply keep numeric URLs until touched.
- Resolution: `getBySlug` tRPC query per entity → repo `getOneBySlug`, always
  tenant-scoped (`.where('tenant_id', …)`).

## Frontend

- Route param stays `:id` and accepts **either** a numeric id or a slug.
- `apps/frontend/src/app/services/record-slug.resolver.ts` registers
  `resolve: { id: … }` on the `:id` and `:id/edit` routes. Because
  `withComponentInputBinding()` merges `{ ...queryParams, ...params, ...data }`
  (data wins), the routed component's `id` input **always receives the numeric
  id** — view/form components, `RecordNavigationService`, breadcrumbs and the
  activity log needed no changes. Unknown slugs redirect to the entity grid.
- After the record loads, the view swaps the address bar to the slug URL with
  `Location.replaceState(...)` — cosmetic only, no re-navigation. Old numeric
  deep links therefore still resolve and end up displaying the slug URL.

## Adopting it for a new entity (checklist)

1. Migration: `slug text` + backfill + `<table>_tenant_slug_unique` partial
   index (copy the shape in `2026-07-07-record-slugs.ts`); add `slug` to the
   entity's model in `libs/common/src/lib/kysely.models.ts`.
2. Repo: `slugExists` + `getOneBySlug` (copy any of the three).
3. Controller: set slug on create via
   `uniqueSlug(slugifyRecordName(source, fallback), isTaken)`; regenerate on
   rename with `excludeId`; call `backfillMissingSlugs` after bulk inserts
   (add the table to `BULK_SLUG_SOURCES` in `lib/slug.ts`).
4. Router: `getBySlug` procedure (tenant-scoped).
5. Frontend: service `getBySlug`; add a resolver via `recordSlugResolver` in
   `record-slug.resolver.ts`; register `resolve: { id: … }` on the `:id`
   routes; `Location.replaceState` in the view after load.
