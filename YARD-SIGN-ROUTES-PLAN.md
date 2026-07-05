# Yard sign delivery routes — implementation plan

**Audience:** the implementing agent. This is a complete, ordered instruction set. Every
convention referenced here has a skill in `.claude/skills/` — read the named skill before
touching that layer. Decisions have already been made; do not re-open them unless you hit a
hard contradiction in the code.

**The feature in one sentence:** constituents sign up for a yard sign through a public form;
staff approve the requests and click "Plan routes"; the app groups geocoded households into
**~1-hour delivery routes**, staff assign each route to a volunteer and share a phone-friendly
link; the volunteer drives the route and checks off each stop.

**This is not a delivery app.** No driver matching, no capacity, no time windows, no live
tracking, no traffic. One fixed route length (60 minutes), straight-line-distance time
estimates, done.

---

## 0. Ground rules

1. Read these skills first: `pplcrm-add-entity` (the master checklist — this plan follows its
   ordering), `pplcrm-design-principles` **and its UX-GUIDELINES.md**, `pplcrm-trpc-backend`,
   `pplcrm-tenant-safety`, `pplcrm-migrations`, `pplcrm-schemas-validation`,
   `pplcrm-datagrid`, `pplcrm-page-layout-ux`, `pplcrm-angular-components`,
   `pplcrm-quality-gate`.
2. **Design-review gate (design principles §9):** two surfaces here are novel page types —
   the "Plan routes" preview page and the public volunteer route page. Before implementing
   them, produce a visual artifact mockup in the app's own theme (white cards, `#0ea5e9`
   primary, uppercase kickers, pins-and-annotations format) and present it to Zee for review.
   Build the backend (Phases 1–3) while waiting; do not code those two UIs before the mock
   exists.
3. **If the build is currently broken by unrelated work in progress, do not stop.** Zee has
   said he will fix it. Implement your slice, verify it with unit tests and per-file
   `npx eslint`, and list any pre-existing failures you had to work around in your final
   report.
4. npm is the package manager; installs need `--legacy-peer-deps`.

---

## 1. What already exists — reuse, don't rebuild

| Capability                | Where                                                                                                                                                                                                                                                                                                                   | How this feature uses it                                                                                        |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Public signup forms       | `apps/backend/src/app/modules/web-forms/` — server-rendered form at `/api/forms/view/:formId`, POST `/api/forms/submit/:formId`, honeypot `_hp`, per-IP in-memory rate limit, email required, find-or-create person **and household by address fingerprint** inside one transaction, `target_tags`, confirmation emails | Add a new `form_type: 'yard_sign'` — the whole intake pipeline is already built                                 |
| Geocoding                 | `apps/backend/src/app/lib/gis/geocoding.ts` (`geocodeAndMapHousehold`), background job `geocode_household`, Google Maps API with deterministic dev/test mock; households already carry `lat`, `lng`, `geocoding_status`, `formatted_address`                                                                            | Routes are built from **household** coordinates. Zero new geocoding infrastructure for stops                    |
| Volunteers                | `persons` (linked to `volunteer_events` via `volunteer_shifts`)                                                                                                                                                                                                                                                         | "Assign volunteer" = pick a person (reuse the person-search pattern in `experiences/events/ui/event-view.html`) |
| Public route registration | `apps/backend/src/app/routes.ts` (`fastify.register(x, { prefix: '/api/…' })`)                                                                                                                                                                                                                                          | New public volunteer page under `/api/yard-signs`                                                               |
| Background jobs           | `lib/jobs/job-payloads.ts` (discriminated union) + `job-handlers.ts` switch                                                                                                                                                                                                                                             | No new job types needed (geocoding reused); listed so you don't invent one                                      |
| Tenant settings           | `settings` table (per-tenant key/jsonb value), `modules/settings/`                                                                                                                                                                                                                                                      | Persist last-used route-planning defaults under key `yard_sign_route_defaults`                                  |
| Address autocomplete      | `libs/uxcommon/src/components/address-autocomplete/`                                                                                                                                                                                                                                                                    | Start-address input on the plan page                                                                            |
| Canonical CRUD module     | `modules/teams/` + `experiences/teams/`                                                                                                                                                                                                                                                                                 | Copy its layering exactly (per `pplcrm-add-entity`)                                                             |
| Icons                     | `libs/uxcommon/src/components/icons/icons.index.ts`                                                                                                                                                                                                                                                                     | `map-pin` exists — use it for the experience. Verify any other icon name against `PcIconNameType` before use    |
| STRUCTURE.md regeneration | `npm run context:backend` / `context:frontend` / `context:libs`                                                                                                                                                                                                                                                         | Run at the end                                                                                                  |

---

## 2. Product flows (the spec)

### Flow A — Constituent requests a sign (public)

1. Staff create a web form with the new type **Yard sign form** (forms experience already has
   the editor; `form_type` picker gains one option).
2. Constituent fills it in: name, email, **address required** (street, city, zip; state per
   form config), optional phone/notes. Honeypot + rate limit as today.
3. Submission runs the existing standard pipeline (person + household find-or-create,
   fingerprint dedupe, tags, confirmation email) **plus** inserts one `yard_sign_requests`
   row (status `new`, source `web_form`) in the same transaction.
4. Duplicate guard: if that household already has an **open** request (`new`, `approved`, or
   on an active route), do **not** insert a second row — still show the public success page
   (never reveal existing data to an anonymous visitor).
5. Household geocoding job fires exactly as it does today for new/updated households.

### Flow B — Staff triage and plan (internal, authed)

1. New sidebar item **Yard signs** (icon `map-pin`) → requests grid. Staff see every request
   with status, address, geocode readiness, and the route it's on (if any).
2. Staff approve or decline requests (single row + bulk). Staff can also add a request
   manually (phone calls happen): pick an existing household (reuse the household-search
   pattern from the person view's "Assign household"), optional person + notes.
3. Staff click **Plan routes** → the plan page. They set a start address (default: last used,
   persisted per tenant) and optionally tweak advanced parameters (collapsed by default).
4. **Preview, then commit** (safe default — nothing is written during preview): the server
   returns proposed routes ("Route 1 — 9 stops · 52 min · 11.4 km", ordered stops) plus a
   "Couldn't fit" list with a named reason per request and a guided fix.
5. Staff click **Create N routes**. Routes are persisted (status `draft`); the included
   requests now show as routed.

### Flow C — Assign and share (internal)

1. Routes grid lists all routes; route detail shows the ordered stop list.
2. Staff assign a volunteer (person picker) → status `assigned`.
3. Staff click **Copy volunteer link** → mints a share token (or copies the existing one) and
   puts `https://<host>/api/yard-signs/route/<token>` on the clipboard, plus an **Open in
   Google Maps** action (directions deep link with all stops as waypoints).
4. How the link reaches the volunteer (text/email) is out of scope — staff paste it wherever
   they talk to their volunteers.

### Flow D — Volunteer delivers (public, tokenized)

1. Volunteer opens the link on their phone: route name, progress ("3 of 9 delivered"),
   ordered stop cards — first name + address only (data minimization: no email/phone of
   constituents), per-stop **Navigate** link (Google Maps), buttons **Mark delivered** /
   **Couldn't deliver** (with a short reason picker: `not home obstacle`? No —
   reasons: "No safe spot", "Wrong address", "Resident declined", "Other").
2. First stop action flips the route to `in_progress`. Marking a stop updates the linked
   request in the same transaction (`delivered`, or back to `approved` with the skip reason
   recorded) so skipped houses return to the planning pool automatically.
3. When every stop is terminal (delivered/skipped) the route auto-completes; the page shows a
   done state ("All 9 stops handled — thank you!").
4. Undo: a just-tapped stop shows **Undo** on the page (state `pending` restore) — mistakes on
   a phone in the sun are guaranteed.

---

## 3. Data model

Follow `pplcrm-migrations`. One new migration file
`apps/backend/src/app/_migrations/2026-07-XX-yard-sign-routes.ts` creating three tables. Use
bigint identity + the standard `RecordType` base columns (`id`, `tenant_id`, `createdby_id`,
`updatedby_id`, `created_at`, `updated_at`) exactly like `teams` (copy DDL shape from
`_migrations/schema.sql`). All FKs `ON DELETE CASCADE` from route → stops; stops → requests
`ON DELETE CASCADE`; requests → households `ON DELETE CASCADE`.

### `yard_sign_requests`

| Column       | Type                                                                                    | Notes                                      |
| ------------ | --------------------------------------------------------------------------------------- | ------------------------------------------ |
| household_id | bigint NOT NULL → households                                                            | The delivery target; coordinates live here |
| person_id    | bigint NULL → persons                                                                   | Who asked, when known                      |
| web_form_id  | uuid NULL → web_forms                                                                   | Source form, when from Flow A              |
| source       | text NOT NULL CHECK (`web_form`,`manual`)                                               |                                            |
| status       | text NOT NULL DEFAULT `new` CHECK (`new`,`approved`,`declined`,`delivered`,`cancelled`) |                                            |
| notes        | text NULL                                                                               | Constituent message / staff notes          |
| skip_reason  | text NULL                                                                               | Last failed-delivery reason, for triage    |

Indexes: `(tenant_id, status)`, `(tenant_id, household_id)`.
**"Routed" is not a status** — it is derived (an active stop exists). Single source of truth;
enforce with a partial unique index on `yard_sign_route_stops(request_id) WHERE status = 'pending'`.

### `yard_sign_routes`

| Column                 | Type                                                                                           | Notes                                                            |
| ---------------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| name                   | text NOT NULL                                                                                  | Auto-named at commit ("Maple St area — Jul 6"), renamable        |
| status                 | text NOT NULL DEFAULT `draft` CHECK (`draft`,`assigned`,`in_progress`,`completed`,`cancelled`) |                                                                  |
| volunteer_person_id    | bigint NULL → persons                                                                          |                                                                  |
| start_address          | text NOT NULL                                                                                  | As typed/resolved                                                |
| start_lat / start_lng  | double precision NOT NULL                                                                      | Geocoded at preview time                                         |
| est_minutes / est_km   | numeric NOT NULL                                                                               | Recomputed on any stop change                                    |
| scheduled_for          | timestamptz NULL                                                                               | Optional "when it's planned to run" — display only               |
| share_token_hash       | text NULL                                                                                      | sha256 hex of the raw token; raw token is never stored           |
| share_token_expires_at | timestamptz NULL                                                                               |                                                                  |
| params                 | jsonb NOT NULL                                                                                 | The generation params snapshot (speed, service min, …) for audit |

### `yard_sign_route_stops`

| Column       | Type                                                                    | Notes                                                        |
| ------------ | ----------------------------------------------------------------------- | ------------------------------------------------------------ |
| route_id     | bigint NOT NULL → yard_sign_routes                                      |                                                              |
| request_id   | bigint NOT NULL → yard_sign_requests                                    |                                                              |
| seq          | int NOT NULL                                                            | 1-based; UNIQUE `(route_id, seq)` deferrable (reorders swap) |
| leg_minutes  | numeric NOT NULL                                                        | Est. travel from previous point (start for seq 1)            |
| status       | text NOT NULL DEFAULT `pending` CHECK (`pending`,`delivered`,`skipped`) |                                                              |
| skip_reason  | text NULL                                                               |                                                              |
| completed_at | timestamptz NULL                                                        |                                                              |

Then complete the type layer per `pplcrm-add-entity` steps 1–3 (all four `libs/common` files):

- `libs/common/src/lib/schemas/yard-signs.schema.ts` — triads `AddYardSignRequestObj` /
  `UpdateYardSignRequestObj`, `AddYardSignRouteObj` / `UpdateYardSignRouteObj`, plus
  `PlanYardSignRoutesObj` (the generation params, below) using `core.schema` helpers.
- `lib/models.ts` z.infer aliases; `lib/kysely.models.ts` interfaces + `Models` entries;
  named re-exports in `libs/common/src/index.ts` (named blocks, not `export *`).

Tenant safety: every hand-written query on all three tables takes `.where('tenant_id', …)` —
the `local/no-unscoped-db-query` rule will hold you to it (`pplcrm-tenant-safety`). The
public token path is the one intentional pattern difference: resolve the route **by token
hash first**, then use its `tenant_id` for every subsequent query in that handler.

---

## 4. The routing engine (the actual algorithm)

New pure-function library, no DB, no I/O: `apps/backend/src/app/lib/routing/`
(`geo.ts`, `plan-routes.ts`, `plan-routes.spec.ts`). This must be the most-tested code in the
feature.

### Named constants (no magic numbers — `route-constants.ts`)

```
SERVICE_MINUTES_PER_STOP = 5      // park, grab sign, plant it, photo
AVG_SPEED_KMH            = 30     // residential driving
ROAD_WINDING_FACTOR      = 1.3    // straight-line → road distance fudge
TARGET_ROUTE_MINUTES     = 60     // the product promise
ROUTE_FILL_TARGET_MIN    = 52     // stop adding stops past this (buffer for reality)
OUTLIER_NEAREST_KM       = 8      // nearest other stop farther than this ⇒ unroutable
MAX_STOPS_PER_PLAN       = 500    // O(n²) guard; also a sane campaign ceiling
SHARE_TOKEN_TTL_DAYS     = 30
```

`SERVICE_MINUTES_PER_STOP`, `AVG_SPEED_KMH`, and the return-leg toggle are user-tweakable in
"Advanced" on the plan page; the rest are fixed.

### Time model

`legMinutes(a, b) = haversineKm(a, b) × ROAD_WINDING_FACTOR / AVG_SPEED_KMH × 60`
`routeMinutes = Σ legMinutes + stops.length × SERVICE_MINUTES_PER_STOP`
(+ the return leg to start if the toggle is on; default **off** — sign crews rarely loop).

### Algorithm (greedy nearest-neighbor + 2-opt; deterministic)

```
input: stops[{requestId, lat, lng}], start{lat,lng}, params
1. Partition out unroutable stops:
   a. legMinutes(start, s) + SERVICE > ROUTE_FILL_TARGET  → reason 'too_far_from_start'
   b. distance to nearest other stop AND to start > OUTLIER_NEAREST_KM → 'isolated'
2. remaining = routable stops sorted by (distance from start, then requestId) — the id
   tiebreak makes output deterministic for identical input.
3. while remaining not empty:
     route = []; cursor = start
     loop:
       next = nearest remaining stop to cursor (id tiebreak)
       if projected routeMinutes with next > ROUTE_FILL_TARGET and route not empty: break
       if route is empty: always take next (it fit per step 1a)
       append; cursor = next
     2-opt improve route (cap 200 iterations); recompute leg times
     emit route
4. return { routes: [{stops, legMinutes[], totalMinutes, totalKm}], unroutable: [{requestId, reason}] }
```

No k-means, no OR-tools, no external routing API. This is intentionally the simple version;
1-hour neighborhoods forgive estimate error. Do not add dependencies.

### Required unit tests (Vitest, `pplcrm-testing`)

- haversine against two known city pairs (±1%).
- A 4×4 grid of points 500 m apart near the start → splits into routes each ≤ 60 est-minutes,
  every stop appears exactly once across routes + unroutable.
- One point 50 km away → lands in `unroutable('isolated'/'too_far_from_start')`, never in a route.
- Empty input → `{routes: [], unroutable: []}` (no throw).
- Single stop → one 1-stop route.
- Determinism: same input twice → deep-equal output.
- 2-opt actually improves: a deliberately crossed 4-stop square orders to the perimeter.
- 500-stop random cloud completes < 2 s (guards a quadratic blowup regression).

---

## 5. Backend module — `apps/backend/src/app/modules/yard-signs/`

Follow `pplcrm-trpc-backend` layering (AppError subclasses, `repo.transaction()`, sanitized
errors). Two repos (`yard-sign-requests.repo.ts`, `yard-sign-routes.repo.ts` extending
`BaseRepository`), one controller, one tRPC router registered in `modules/trpc.ts` as
`yardSigns: YardSignsRouter` (camelCase precedent: `webForms`).

### tRPC procedures (all `authProcedure`, all tenant-scoped)

**Requests**

- `requests.getAll` — grid fetch; **override the repo query to join `households`** (address,
  `formatted_address`, `lat`, `geocoding_status`) and left-join active stop → `route_id`,
  `route_name`. Mirror an existing join-style repo (see how persons/households grids compose).
- `requests.add` — manual entry `{household_id, person_id?, notes?}`; source `manual`;
  reject (CONFLICT AppError) if the household already has an open request — message names the
  household.
- `requests.update` — notes edit.
- `requests.setStatus` — `{ids[], status: approved|declined|cancelled}` bulk-safe; refuse to
  decline/cancel a request sitting on an active route with a message naming the route
  ("Remove it from Maple St route first, or cancel that route.") — unless the route is
  `draft`, in which case auto-remove the stop and log it.
- `requests.delete` — only `declined`/`cancelled` requests, else guide to decline first.

**Planning**

- `plan.preview` — input `PlanYardSignRoutesObj`:
  `{start_address: string, service_minutes?, avg_speed_kmh?, include_return_leg?}`.
  Server: geocode the start address (extract a reusable `geocodeAddress(addressStr)` helper
  out of `geocodeAndMapHousehold` into `lib/gis/` — do not duplicate the fetch logic; keep the
  existing dev/test deterministic mock behavior), collect eligible requests
  (`status='approved'`, household `geocoding_status='success'` with lat/lng, no active stop),
  cap at `MAX_STOPS_PER_PLAN` (tell the client the cap applied), run the engine, return
  proposal **without writing anything**. Also return the ineligible buckets with counts:
  `awaiting_geocode`, `geocode_failed`, `not_approved` so the UI can narrate.
- `plan.commit` — input: the params + `routes: [{request_ids: string[] (ordered)}]`. In one
  transaction: re-verify each request is still eligible (concurrent-planner guard — skip and
  report ones that aren't), recompute legs server-side (never trust client math), insert
  routes (auto-name: predominant street/city of stops + date) + stops, persist the params
  snapshot, save the start address to `settings` key `yard_sign_route_defaults`. Return
  `{created: n, skipped: [{request_id, reason}]}`.

**Routes**

- `routes.getAll`, `routes.getById` (stops joined, ordered by seq, each with household
  address + request status), `routes.update` (name, scheduled_for, notes),
  `routes.assignVolunteer` `{route_id, person_id|null}` (draft→assigned / back),
  `routes.setStatus` (manual in_progress/completed; cancel returns all pending stops'
  requests to the pool), `routes.delete` (draft/assigned only — else cancel first),
  `routes.removeStop` (recompute legs/totals; request back to pool),
  `routes.reorderStop` `{route_id, stop_id, direction: up|down}` (server recomputes legs),
  `routes.updateStopStatus` (staff can mark delivered/skipped from the detail page too — same
  transition rules as the public path, shared private method),
  `routes.mintShareLink` — generates 32 random bytes (`crypto.randomBytes`), stores sha256
  hex + expiry (`SHARE_TOKEN_TTL_DAYS`), returns the **raw token once**; if a token exists
  and `regenerate: false`, return "already exists" so the UI can offer copy-vs-regenerate;
  `routes.revokeShareLink` — null the hash.

Every mutation logs to the activity system the way `teams`/BaseController do — route detail
must show a coherent story ("Route created from plan", "Sara assigned", "Stop 4 skipped:
wrong address").

### Web-forms integration (small, surgical)

- `form_type` gains `'yard_sign'`: frontend union in `form-editor.ts:119` + editor copy;
  backend `submitFormPublic` branch: require street1/city/zip (mirror the donation
  always-required pattern in both `renderFormHtml` and the controller); after the existing
  household find-or-create inside the same transaction, insert the request (Flow A rules,
  including the open-request dedupe). The existing `send-webform-notifications` job covers
  staff alerts untouched.

### Public volunteer endpoint — new `routes/yard-signs-public.route.ts`, prefix `/api/yard-signs`

Server-rendered HTML like `web-forms-public.route.ts` / `volunteer-events-public.route.ts`
(same visual system those pages use; mobile-first — volunteers are on phones):

- `GET /route/:token` — hash the token, look up the route; invalid/expired/revoked/cancelled
  ⇒ uniform 404 page ("This route link isn't active. Ask your organizer for a new one.") —
  never distinguish which failure. Render Flow D page. **Escape every DB string with the
  existing `escapeHtml`** (names/addresses/reasons are user-supplied).
- `POST /route/:token/stops/:stopId` — body `{action: 'delivered'|'skipped'|'undo', reason?}`.
  Validate stop belongs to the token's route; transaction updates stop + request +
  route status (first action ⇒ `in_progress`; all terminal ⇒ `completed` + activity entry).
  Attribute activity to the route's `createdby_id` (same convention as web-forms public
  submissions).
- Per-IP rate limiting on both verbs (reuse the web-forms in-memory window pattern; module
  constant, e.g. 60/min — a volunteer taps fast).
- The page's only outbound links are `https://www.google.com/maps/dir/?api=1&destination=…`
  (per stop) and the full-route variant with `waypoints=` (pipe-separated lat,lng, in seq
  order; origin = route start). No JS beyond small inline fetch handlers for the buttons.

---

## 6. Frontend experience — `apps/frontend/src/app/experiences/yard-signs/`

Follow `pplcrm-add-entity` steps 7–11, `teams` as the template. Services:
`yard-sign-requests-service.ts`, `yard-sign-routes-service.ts` (both
`AbstractAPIService` impls; `endpointName` keys per the router registration). Routes in
`dashboard.routes.ts`:

```
yard-signs
├── ''            → requests grid
├── 'plan'        → plan page
├── 'routes'      → routes grid
└── 'routes/:id'  → route detail
```

Sidebar (`layout/sidebar/sidebar-items.ts`): item **Yard signs**, icon `map-pin`, placed with
the other field/engagement items (match the grouping style you find there). Sentence case
everywhere; every button is verb + noun (+ number when acting on a set).

### Requests grid (`pc-datagrid`, per `pplcrm-datagrid`)

- Columns: Requested by (person, link), Address (household `formatted_address` fallback
  composed), Status chip (`new` neutral / `approved` info / `delivered` success / `declined`,
  `cancelled` muted), Readiness (geocode state — see below), Source, Route (link to route
  detail or "—"), Requested date.
- Readiness column narrates instead of hiding (§2): `Ready` (success), `Locating…` (pending),
  `Address problem` (error) — the error chip's row action deep-links to **Edit household**
  (the fix lives there; editing re-triggers geocoding automatically today).
- Bulk actions bar: **Approve**, **Decline** with counts ("Approve 12 requests").
- Toolbar: **Add request** (dialog: household search — reuse the assign-household search
  pattern — optional person, notes), primary CTA **Plan routes** with the live eligible count
  ("Plan routes · 23 ready"). 0 ready does **not** disable it — it navigates to the plan page
  whose empty state explains exactly what's missing (guide, don't error).
- Empty state (house idiom: icon + cause + one action): "No yard sign requests yet." →
  **Create a signup form** (routes to forms editor with yard_sign preselected) and secondary
  **Add request**.

### Plan page (novel — mockup first, §0.2)

Single page, no wizard. Top card: start address (`address-autocomplete`, prefilled from
tenant defaults), collapsed **Advanced** (`collapse` DaisyUI): minutes per stop, average
speed, return-to-start toggle. Button **Preview routes**.

- Ineligible narration above results, with numbers and exits: "3 waiting for location ·
  1 address problem · 5 not approved" — each links to the requests grid pre-filtered.
- Results: one card per proposed route — kicker `ROUTE 1`, title "9 stops · 52 min ·
  11.4 km", ordered stop list (seq, name, street, leg minutes). "Couldn't fit" section lists
  each leftover with its reason in user terms ("Too far to reach within an hour from this
  start point").
- Sticky footer: **Create 4 routes** / plain **Start over**. Commit → success toast
  ("4 routes created"), navigate to routes grid. If commit reports skipped requests
  (concurrent planner), toast a specific info message naming the count.
- Loading: `createLoadingGate()` on preview+commit; skeleton guard for first render. Preview
  is synchronous — no job, no polling.

### Routes grid

Columns: Name (link), Status chip (draft neutral / assigned info / in progress warning /
completed success / cancelled muted), Stops ("6 of 9 delivered" once started, else "9"),
Est. time (tabular numerals), Volunteer, Scheduled for, Created. Empty state: "No routes yet.
Approve requests, then plan routes." → **Plan routes**.

### Route detail (`pc-detail-layout`, checklist in `pplcrm-page-layout-ux`)

- Header: eyebrow "Yard sign route", title = route name (inline rename), status chip,
  prev/next record nav (`injectRecordNavigation` from the routes grid), breadcrumbs
  `Yard signs / Routes / <name>`.
- Actions: **Assign volunteer** (person search; shows current with change/remove),
  **Copy volunteer link** (first click mints + copies + success toast "Link copied — valid
  30 days"; when a link exists, offer Copy again / **Regenerate link** behind a
  ConfirmDialog — "Regenerate this link? The old link stops working immediately."),
  **Open in Google Maps**. Overflow ⋯: Revoke link, **Cancel route** (danger confirm naming
  consequences: "Its 7 undelivered stops return to the planning pool."), Delete
  (draft/assigned only, danger confirm).
- Stops list: seq badge, name + address, leg minutes, status chip; per-row: move up/down
  (recomputes estimates server-side; flash the row on save per the house motion idiom),
  mark delivered / couldn't deliver (reason dialog), remove from route (confirm; "returns to
  the pool"). Running total footer: "Estimated 52 min · 11.4 km".
- `<pc-record-activities [entity]="'yard_sign_routes'" [entityId]="id()!">` at the bottom —
  mandatory.
- All feedback through `AlertService`; all confirmations through `ConfirmDialogService`;
  semantic tokens only; no hover-only affordances; every disabled control carries the reason.

---

## 7. Security checklist (verify each explicitly before calling the phase done)

1. Every internal procedure: `authProcedure` + tenant scoping; `nx lint backend` green on the
   `no-unscoped-db-query` rule with **no** new ignoreTables entries.
2. Share tokens: ≥32 random bytes (base64url in the URL), only sha256 stored, expiry
   enforced in SQL (`share_token_expires_at > now()`), revocation nulls the hash, regenerate
   rotates. Lookup by exact hash match (no user-controlled query shapes).
3. Public GET/POST: uniform 404 for any invalid token state; no error text distinguishes
   expired vs revoked vs nonexistent; rate limited per IP; stop id validated against the
   token's route id AND tenant id inside the transaction.
4. Public pages expose first name + address only — no constituent email/phone, no tenant
   internals, no request notes.
5. Public form intake: existing honeypot/rate limit/Zod caps; success page identical whether
   or not the household already had a request (no enumeration oracle).
6. All rendered strings in server HTML pass through `escapeHtml`.
7. No new secrets; geocoding reuses `env.googleMapsApiKey` and its throttle/backoff.
8. Errors to clients stay sanitized (AppError → formatter); raw Kysely/pg errors never leak.

---

## 8. Edge cases — required behaviors (test the starred ones)

| Case                                              | Behavior                                                                                                                         |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| ★ Household geocode pending/failed                | Excluded from planning; counted + linked on plan page; grid Readiness chip guides to household edit                              |
| ★ Duplicate signup, same household                | No second open request; public success page unchanged; manual add gets a CONFLICT message naming the household                   |
| ★ Concurrent planners                             | `plan.commit` re-checks eligibility in-transaction; loser gets skipped list, UI reports it specifically                          |
| ★ Stop skipped by volunteer                       | Request → `approved` + `skip_reason`; reappears in next plan; activity logged                                                    |
| ★ All stops terminal                              | Route auto-`completed`; volunteer page shows done state; token keeps working read-only until expiry                              |
| Request cancelled/declined while on a draft route | Stop auto-removed, totals recomputed, activity logged                                                                            |
| Same, on an in-progress route                     | Refused with guidance (remove stop or cancel route first)                                                                        |
| Route cancelled                                   | Pending stops' requests → pool; delivered ones stay `delivered`                                                                  |
| Address edited mid-route                          | Household re-geocodes (existing behavior); estimates go stale — acceptable; detail page keeps live address                       |
| Isolated far stop                                 | `unroutable('isolated')`, named in "Couldn't fit"; staff escape hatch = deliver manually and mark delivered from the grid/detail |
| 0 eligible at plan time                           | Plan page renders the guided empty state, never an error toast                                                                   |
| > 500 eligible                                    | First 500 by approval date; banner says the cap and that re-planning continues the rest                                          |
| Volunteer double-taps / replays                   | Transitions idempotent (`delivered → delivered` no-op 200); undo restores `pending`                                              |
| Token expired mid-route                           | 404 page; staff regenerate → new link resumes where it left off (state is server-side)                                           |
| Tenant/household deletion                         | FK cascades remove requests/stops; routes cascade from tenant                                                                    |
| Timezones/DST                                     | Only durations + a display-only `scheduled_for` timestamptz; no scheduling math anywhere                                         |

**Non-goals (do not build):** sign inventory, multi-depot, time windows, capacity, live GPS,
in-app turn-by-turn, volunteer accounts/logins, SMS sending, map tile rendering. An in-app
map preview is a possible later enhancement — it would need its own §9 mockup approval; the
Google Maps deep link is the v1 navigation story.

---

## 9. Execution order

Each phase ends with the `pplcrm-quality-gate` pipeline on changed files (both `npx eslint`
AND `nx lint` — they enforce disjoint rules) plus that phase's tests.

1. **Phase 0 — design gate:** mockup artifact for the plan page + volunteer page → Zee.
2. **Phase 1 — schema:** migration, kysely models, Zod triads, barrels. Gate: backend builds,
   migration up/down clean on a fresh DB.
3. **Phase 2 — engine:** `lib/routing/` + full spec suite (§4). Gate: all engine tests green.
4. **Phase 3 — backend:** repos/controller/router + registration, `geocodeAddress` extraction,
   web-forms `yard_sign` branch, public route + tokens. Gate: controller/router specs
   (transactions via `useTestTransaction`), security checklist §7 walked item by item.
5. **Phase 4 — internal UI:** services, requests grid, routes grid, route detail, plan page
   (post-mockup-approval), sidebar + routes + breadcrumbs + activity log.
6. **Phase 5 — public volunteer page** (post-mockup-approval) + Maps deep links + copy-link UX.
7. **Phase 6 — verify:** `/verify` the end-to-end flow (form signup → geocode (dev mock) →
   approve → plan → commit → share → deliver/skip → auto-complete), run frontend+backend
   test suites, regenerate STRUCTURE.md files (`npm run context:backend` /
   `context:frontend` / `context:libs`), final ten-second litmus test from
   `pplcrm-design-principles` §10 on every new screen.

Report at the end: what shipped, test counts, any pre-existing failures encountered (per
§0.3), and the two mockup artifact URLs.
