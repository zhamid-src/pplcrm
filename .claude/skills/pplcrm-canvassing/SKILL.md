---
name: pplcrm-canvassing
description: How PeopleCRM's Canvassing feature (§13) works end-to-end — the turfs/turf_households/turf_assignments/turf_knocks tables, the turf-cutting engine (clusters geocoded households into contiguous ward-bounded turfs), derived progress from knocks, the tokenised account-less Canvass Companion, and the field report. USE WHEN editing anything under modules/canvassing, experiences/canvassing, the turf/knock schema, the cutting engine, the Companion public route, or the field report. EXAMPLES 'add a knock outcome', 'why do turfs never cross a ward', 'how does the Companion token auth work', 'where does turf progress come from'.
---

# Canvassing (§13)

Cut a smart-list universe into walkable **turfs**, hand them to volunteers via a
**Canvass Companion** (web app, no account), and let every knock sync back live.
Built net-new in Wave 2 Track F. Reuses Wave 1A geocoding (`households.lat/lng` +
`ward`) and Wave 1C `lists.getCurrentMembers` — do **not** re-derive either.

## Data model (migration `_migrations/2026-07-11-canvassing.ts`)

Four tables, canvassing-namespaced (so they never collide with Track G's
delivery tables). All follow the house pattern: `bigint` id + `UNIQUE(id)` +
`PRIMARY KEY(id, tenant_id)`, `ENABLE`+`FORCE ROW LEVEL SECURITY` with the
standard `tenant_isolation` policy, grants to `pplcrm_app`. Multi-statement DDL
runs through `sql.raw(...)` (parameterless → simple protocol), like the baseline.

| Table              | What it is                                                                                                                                              |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `turfs`            | A turf. `status` = `draft`\|`active`\|`retired` (stored lifecycle only). `list_id`, `target_doors`, `centroid_lat/lng`, `ward`.                         |
| `turf_households`  | The doors — one row per household (junction, PK includes both).                                                                                         |
| `turf_assignments` | A turf handed to a `team_id` and/or opened via `token`. `status` = `active`\|`revoked`.                                                                 |
| `turf_knocks`      | **The source of truth for progress.** One row per door interaction. `outcome`, `response`, `source`, `canvasser_name`, `client_knock_id`, `knocked_at`. |

The migration is dated **2026-07-11** deliberately: Kysely aborts with "corrupted
migrations" if a new file sorts alphabetically _before_ an already-applied one, and
the dev DB has applied `2026-07-10-person-public-id` and
`2026-07-11-automations-step-kinds` ("automations" < "canvassing", so we still
sort last). If you add another canvassing migration, keep it dated ≥ the newest
applied file.

Kysely models live in `libs/common/src/lib/kysely.models.ts` (Turfs,
TurfHouseholds, TurfAssignments, TurfKnocks). Zod triad + vocabularies in
`libs/common/src/lib/schemas/canvassing.schema.ts` (`TURF_STATUSES`,
`KNOCK_OUTCOMES`, `KNOCK_RESPONSES` are `as const` for exhaustive switches).

### Derived state — never stored twice (§22.6)

Progress ("attempted", "conversations", "In field now", "Complete") is **derived
from `turf_knocks` at read time** — there are no counter columns. `turfs.status`
stores only the true lifecycle (`draft`/`active`/`retired`); the display status
(`draft`|`assigned`|`in_field`|`complete`|`retired`) is computed in
`CanvassingController.displayStatus` from stored status + knock activity + door
count. `attempted` = `COUNT(DISTINCT household_id)`; `in_field` = a knock within
`IN_FIELD_WINDOW_MS` (6h).

## The cutting engine (`modules/canvassing/lib/cutting-engine.ts`)

Pure, dependency-free, unit-tested (`cutting-engine.spec.ts`). `cutTurfs(doors,
target)` and `previewCut(...)` share the same code so the dialog preview can
never disagree with the actual cut.

- **Input**: geocoded households (`{household_id, lat, lng, ward}`). Ungeocoded
  ones are reported as `unplaced`, never dropped.
- **Barriers**: the only barrier data shipped is the ward/precinct GIS polygons
  (`lib/gis/boundaries.geojson`), whose edges follow real rivers/rail/arterials.
  So the engine treats the **ward boundary as the barrier — a turf never spans
  two wards**. True per-street barrier linework isn't in the dataset, so finer
  avoidance is deferred to the manual "rebalance on the map" step the spec
  already calls for. If you add real barrier data, this is where it plugs in.
- **Contiguity**: within a ward, doors are ordered along a latitude-banded
  boustrophedon ("snake") sweep, then chunked into near-equal runs → compact,
  contiguous turfs without a TSP solve.

## The universe = a smart list (reuse, don't re-derive)

`CanvassingController.resolveUniverseHouseholdIds` calls
`new ListsController().getCurrentMembers(auth, listId)` (Wave 1C). If the list is
`people`, it maps to distinct `household_id`s; if `households`, uses them
directly. Then `TurfsRepo.getHouseholdsGeo` fetches lat/lng/ward. **Refresh from
list** re-runs this, drops doors that left the list (knock rows persist —
history kept) and adds new in-ward members not yet in any turf.

## Canvass Companion — tokenised, account-less (§13.4)

Public REST route `modules/canvassing/routes/canvass-public.route.ts`, mounted at
`/api/canvass` in `routes.ts`. Frontend page:
`experiences/canvassing/ui/companion-page.ts` at the public `/companion?token=...`
route (in `app.routes.ts`, not the dashboard shell).

**Security model**: the `turf_assignments.token` (24 random bytes, base64url,
UNIQUE) **is the bearer credential**. `TurfAssignmentsRepo.resolveByToken` is the
one intentionally un-tenant-scoped query in the module — the token resolves the
tenant (exactly like a session token; see the `sessions` entry in the
no-unscoped-db-query ignoreTables). Every downstream read/write is then scoped by
the resolved `tenant_id` **and** `turf_id`, and a knock is rejected unless its
household belongs to that turf. Modeled on the public form page's
tenant-resolution seam, but by token rather than subdomain+slug.

- **Idempotent sync**: knocks carry a client-generated `client_knock_id`; the
  partial unique index `(tenant_id, turf_id, client_knock_id)` + `ON CONFLICT DO
NOTHING` means an offline re-send never double-counts.
- **Offline**: the Companion queues knocks in `localStorage` and flushes on the
  `online` event / next load.
- **Honest attribution (§22.7)**: a knock writes to the household's (and person's)
  Activity log with `metadata.via = "via Canvass Companion (name)"`, under the
  **real CRM account that deployed the link** (`assignment.created_by`) — never a
  fabricated user. `user_activity.user_id`/`createdby_id` are NOT-NULL FKs to
  authusers, so a real actor is required; the source + canvasser_name carry the
  honest label.

## Frontend

- `experiences/canvassing/services/canvassing-service.ts` — extends `TRPCService`,
  wraps `api.canvassing.*`. Router: `modules/canvassing/trpc.router.ts`, registered
  as `canvassing:` in `modules/trpc.ts`.
- `ui/canvassing-page.ts` — the /canvassing page (Turfs & assignments + Field
  report tabs, `pc-map` turf-centroid markers tinted by status).
- `ui/cut-turfs-dialog.ts` — universe select (reuses `ListsService.getAllWithCounts`),
  presets, live preview.
- Sidebar entry: `layout/sidebar/sidebar-items.ts` under FIELD (icon `map-pin`,
  shortcut `v`). Help article: `experiences/help/data/articles/engagement.ts`
  (`id: 'canvassing'`); `/canvassing` is in the help spec's route allow-list.

## Testing / gotchas

- Backend specs share one Postgres instance across worktrees. Parallel tracks
  apply their own migrations to `pplcrm_test`, which makes Kysely abort with
  "corrupted migrations". Use a **dedicated** test DB:
  `TEST_DB_NAME=pplcrm_canvass_test apps/backend/scripts/setup-test-db.sh` and set
  `DB_NAME=pplcrm_canvass_test` in `.env.test`. globalSetup then builds it from
  scratch (also the fresh-DB migration verification).
- `controller.spec.ts` seeds a static household list of geocoded doors across two
  wards and drives the full flow (cut → assign → token → idempotent knock →
  progress → refresh). `cutting-engine.spec.ts` covers clustering purely.
- Mixed `.select([...])` (string cols + `sql` builders) type-checks as a plain
  array but **not** in a `.select(() => [...])` callback — use plain arrays.

## What's deferred (and why)

- **Filled turf polygons** on the map — needs a per-turf door hull; the list row
  only carries the centroid, so the map pins tinted centroids honestly instead.
- **Sub-ward barrier avoidance** — no highway/rail/water linework in the shipped
  GIS data; ward boundary is the honest proxy (see engine).
- **Team-target picker UI** — the backend fully supports `team_id`; the page
  currently issues the tokenised-link assignment ("Copy a link instead" path).
