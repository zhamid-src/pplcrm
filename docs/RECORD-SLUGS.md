# Record-slug URLs — the pattern (Wave 0, spec §1)

Spec §1 "security is a surface property": routes carry record slugs, never
tenant or internal IDs. This note documents the pattern shipped for
**households, companies** (name slugs) and **persons** (opaque public_id — see
the exception below) so later waves can adopt it for other entities (tasks,
lists, teams, …) without re-deriving it. `web_forms` / `events` /
`volunteer_events` / `tenants` already used the same column shape for their
public pages; the record-slug work generalized their helpers rather than
inventing a parallel implementation.

> **Persons are the exception — opaque public_id, not a name slug.** At 100k+
> people, name slugs collide (`amira-hassan-4787`), leak counts, and put real
> names in URLs and logs — bad for a political CRM. Persons instead carry an
> opaque `public_id` and their URL name prefix is purely decorative. Everything
> below under "Persons" overrides the household/company name-slug flow. Do NOT
> apply the name-slug flow to persons.

## Database

- `slug text` column, `UNIQUE (tenant_id, slug)` partial btree index
  (`<table>_tenant_slug_unique`, `WHERE slug IS NOT NULL`) — same shape as
  `events_tenant_slug_unique`.
- Migration `apps/backend/src/app/_migrations/2026-07-07-record-slugs.ts`
  backfills every existing row: slugify the source columns, guard all-digit
  results (prefix the fallback noun so a slug can never look like a numeric
  id), dedupe per tenant with `-2`, `-3`… suffixes.
- Slug sources (households/companies only): households = `street_num street1`
  (fallback `household`), companies = `name` (fallback `company`). Persons no
  longer use a name slug — see "Persons" below.

## Backend

- `slugifyRecordName(value, fallback)` in `libs/common/src/lib/utils.ts` —
  the one slugifier (lowercase, accent-strip, hyphenate, 80-char cap,
  fallback + all-digit guard).
- `uniqueSlug(base, isTaken)` in `apps/backend/src/app/lib/slug.ts` — the one
  collision loop. Each repo exposes the same `slugExists(tenant_id, slug,
excludeId?)` used as `isTaken` (shape copied from web-forms).
- **Create** paths set `slug` before insert (households `addHousehold`,
  companies `add` override). **Rename** paths regenerate it (controller `update`
  overrides watching the source columns; pass the record id as `excludeId` so an
  unchanged name keeps its slug). (Persons use `insertPersonWithPublicId`
  instead — see "Persons".)
- **Bulk** paths (CSV import workers) call `backfillMissingSlugs(db, table,
tenant_id)` once after inserting — set-based, id-suffixed on collision, no
  per-row query loop. Rows that somehow miss slug generation are harmless:
  they simply keep numeric URLs until touched. (Persons instead call
  `backfillPersonPublicIds` — see "Persons".)
- Resolution (households/companies): `getBySlug` tRPC query per entity → repo
  `getOneBySlug`, always tenant-scoped (`.where('tenant_id', …)`). Persons use
  `getByPublicId` instead — see "Persons" below.

## Frontend

- Route param stays `:id` and accepts **either** a numeric id or a slug.
- `apps/frontend/src/app/services/record-slug.resolver.ts` registers
  `resolve: { id: … }` on the `:id` and `:id/edit` routes. Because
  `withComponentInputBinding()` merges `{ ...queryParams, ...params, ...data }`
  (data wins), the routed component's `id` input **always receives the numeric
  id** — view/form components, `RecordNavigationService`, breadcrumbs and the
  activity log needed no changes. Unknown slugs redirect to the entity grid.
  Households/companies resolve via the generic `recordSlugResolver` (name-slug
  `getBySlug`); persons use the dedicated `personRecordIdResolver` (public_id
  decode — see "Persons").
- After the record loads, the view swaps the address bar to the slug URL with
  `Location.replaceState(...)` — cosmetic only, no re-navigation. Old numeric
  deep links therefore still resolve and end up displaying the slug URL.

## Persons — opaque public_id (the exception)

Persons do not use a name slug. Each person carries an opaque `public_id`; the
URL name prefix is decorative and ignored on resolution.

- **Identifier:** `persons.public_id text` — 8 Crockford Base32 chars
  (alphabet `0123456789ABCDEFGHJKMNPQRSTVWXYZ`, no I/L/O/U) encoding 40 bits from
  `crypto.randomBytes(5)`, stored uppercase-canonical (e.g. `4T9K2XPM`). Unique
  per tenant via the partial index `persons_tenant_public_id_unique ON
(tenant_id, public_id) WHERE public_id IS NOT NULL` (mirrors
  `events_tenant_slug_unique`). `public_id` **never changes.**
- **URL display form:** stored in the existing `persons.slug` column as
  `{name}-{xxxx}-{xxxx}` (e.g. `joseph-4t9k-2xpm`) — decorative slugified first
  name, else last name, else `person`, then the public_id split 4-4. Regenerated
  on rename; because resolution is by public_id, a stale name in an old URL
  still resolves.
- **Shared helpers** (`libs/common/src/lib/public-id.ts`, exported from
  `@common`): `encodeCrockford(bytes)`, `normalizeCrockford(s)` (uppercase,
  I/L→1, O→0, strip non-alphabet), `extractPublicIdFromSlug(segment)` (strip
  hyphens → last 8 → normalize → validate), `buildPersonSlug(first, last, id)`.
  Used by both the frontend resolver and the backend so decode is identical.
- **Generation** (`apps/backend/src/app/lib/person-public-id.ts`):
  `insertPersonWithPublicId(first, last, attempt)` generates a Crockford id,
  attempts the insert, and retries on the `persons_tenant_public_id_unique`
  23505 violation up to 5 times (`isPersonPublicIdConflict`) — no
  check-then-insert `uniqueSlug` for persons. Bulk paths (CSV import) call
  `backfillPersonPublicIds(db, tenant_id)` instead of `backfillMissingSlugs`.
- **Resolution:** `getByPublicId` tRPC query → controller normalizes the segment
  → repo `getByPublicId`, tenant-scoped. The frontend `personRecordIdResolver`
  decodes the segment with `extractPublicIdFromSlug` (bare id, hyphen-split id,
  or full display slug all work); numeric `/people/123` deep links pass straight
  through as before.
- **Migration:** `2026-07-10-person-public-id.ts` adds the column + index (pure
  DDL) then backfills every existing person in JS — per tenant, with an
  in-memory used-set and generate-retry — assigning a fresh public_id and the
  derived display slug. No RLS toggle: the baseline's `row_security` strip
  handles it.

## Adopting the name-slug flow for a new entity (checklist)

> This checklist is the **name-slug** flow (households/companies). If the entity
> exposes real people or anything count/identity-sensitive, prefer the person
> `public_id` flow above instead.

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
