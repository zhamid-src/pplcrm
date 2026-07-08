---
name: pplcrm-deliveries
description: How PeopleCRM's Deliveries feature works (spec §14) — yard-sign delivery requests → pure-preview route planning → volunteer-driven routes, with the tokenized public volunteer page. Covers the three tables and their "routed is derived" invariant, the pure routing engine, the tRPC + public-token backend, the frontend surfaces, and the honest activity attribution. USE WHEN touching anything under modules/deliveries, experiences/deliveries, the routing engine (lib/routing), the delivery_* tables, the public /r/:token page, or the deliveries sidebar badge. EXAMPLES: 'add a field to delivery requests', 'why is a request still showing as routed', 'change how routes are estimated', 'the volunteer link 404s'.
---

# Deliveries (§14)

Yard-sign requests → about-an-hour driving routes → a volunteer drives them via a public tokenized
link (no account). Binding spec: `docs/spec/Deliveries Spec.dc.html`. Prior plan (partly stale):
repo-root `YARD-SIGN-ROUTES-PLAN.md` — the spec's strings win where they disagree.

## The data model (3 tables, all tenant-scoped + RLS)

Migration: `apps/backend/src/app/_migrations/2026-07-11-deliveries.ts` (dated 07-11 so it sorts
after the already-applied `2026-07-10-person-public-id` — Kysely forbids a new migration inserted
before an applied one). Kysely models (`DeliveryRequests`, `DeliveryRoutes`, `DeliveryRouteStops`)
in `libs/common/src/lib/kysely.models.ts`.

- **`delivery_requests`** — one per household sign request. `status: new | approved | declined | delivered`
  (spec spelling; **no `cancelled`**). Tied to a `household_id` (coords + geocoding_status live on the
  household — Wave 1A; never a parallel geocoder). `web_form_id` is `uuid` (web_forms has a uuid id).
- **`delivery_routes`** — `status: draft | assigned | in_progress | completed | canceled` (American
  one-L "canceled", per spec). Carries `start_lat/lng`, `est_minutes/est_km`, a `params` jsonb
  snapshot, and the share link as **`share_token_hash` (sha256 hex) only** — the raw token is returned
  to staff once and never stored.
- **`delivery_route_stops`** — `status: pending | delivered | skipped`, `seq` (1-based),
  `leg_minutes`, `reason`, `acted_via: volunteer_link | staff`.

### The one invariant: "routed" is derived, never stored (acceptance §22.6)

A request is "on a route" **iff it has an active (`pending`) stop**. There is no `routed` status.
Enforced by a partial unique index `uq_delivery_route_stops_active_request (request_id) WHERE
status = 'pending'` — a request can be on at most one active stop. Skipping/removing a stop flips it
out of `pending` and the request is instantly back in the pool (set its request `status='approved'`).
The requests grid derives the Route column via a LEFT JOIN on the active stop, not a column.

## The routing engine (pure, the most-tested code)

`apps/backend/src/app/lib/routing/` — `geo.ts` (haversine/road-km/leg-minutes), `route-constants.ts`
(all the named numbers), `plan-routes.ts` (`planRoutes(start, stops, params)`), `plan-routes.spec.ts`.
No DB, no I/O, deterministic (requestId breaks every tie). Greedy nearest-neighbour fill under a
~52-min budget + bounded 2-opt. Unroutable buckets: `too_far_from_start`, `isolated`. Straight-line
distance × 1.3 winding factor; 1-hour neighbourhoods forgive the error — **do not add a routing API
or dependency**. Start-address geocoding reuses the shared `geocodeAddress()` in
`lib/gis/geocode-address.ts` (extracted from the household job; same mock/test degrade path).

## Backend module — `apps/backend/src/app/modules/deliveries/`

Router `deliveries` (registered in `modules/trpc.ts`). `controller.ts` holds all logic; three repos.
Every internal query is tenant-scoped. Key behaviours:

- **Plan is preview-then-commit.** `previewPlan` is pure — geocodes the start, runs the engine, returns
  routes + `unroutable` + ineligible buckets, **writes nothing**. `commitPlan` re-verifies eligibility
  in-transaction (concurrent-planner guard → `skipped` list), recomputes legs server-side, inserts
  routes+stops atomically, and saves the start address to `settings` key `deliveries.route_defaults`.
- **Stop transitions** (`applyStopTransition`, shared by staff + public): deliver → request delivered;
  skip(reason) → request back to `approved` + skip_reason; first action flips `assigned→in_progress`;
  last terminal stop **auto-completes** the route. `defer` (public "Skip for now") moves the stop to
  the end and renumbers (stays pending). `undo` restores `pending` and reopens a completed route.
  Reorder/defer/remove renumber seq via a temp offset to dodge the `(route_id, seq)` unique index.
- **Activity is mandatory and honestly attributed** (§22.7). Public actions log with
  `metadata.via = 'volunteer_link'` and a "via volunteer link" message; the `user_id` is the route's
  `createdby_id` (same convention as web-forms public writes) — never a fabricated user.

## The public volunteer page — token IS the credential

Backend REST route `modules/deliveries/routes/deliveries-public.route.ts` at prefix `/api/deliveries`
(registered in `app/routes.ts`): `GET /r/:token`, `POST /r/:token/stops/:stopId`. Resolution differs
from `/f/:slug`: **there is no subdomain/tenant param** — `findByTokenHash(sha256(token))` resolves the
route AND its tenant (the one intentional `// eslint-disable-next-line local/no-unscoped-db-query`,
cross-tenant by design; every follow-up query is scoped by the resolved `tenant_id`). Uniform 404 for
any invalid/expired/revoked/canceled state (never distinguish which). Per-IP rate limit. Payload is
**first name + address only** — verify the payload, not just the UI. Frontend page:
`experiences/deliveries/ui/public-route.ts` at Angular route `/r/:token` (in `app.routes.ts`), fetches
the REST endpoints; List/Map via `<pc-map>`.

## Frontend — `apps/frontend/src/app/experiences/deliveries/`

Two services (`deliveries-requests-service`, `deliveries-routes-service`) both point at the
`deliveries` tRPC router. **These grids are bespoke signal components, not `pc-datagrid`** — the
requests grid needs status tabs + counts, geocode readiness chips (`<pc-geocode-chip>`), bulk
approve/decline, and the always-enabled "Plan routes · N ready" primary, which the generic grid
doesn't provide. Pages: `deliveries-requests` (`/deliveries`), `deliveries-plan` (`/deliveries/plan`),
`deliveries-routes` (`/deliveries/routes`), `deliveries-route-detail` (`/deliveries/routes/:id`).
"Open in Google Maps" builds a `maps/dir/?api=1&origin=…&waypoints=…&destination=…` URL from stop
coords. Sidebar: **Deliveries** in FIELD (`sidebar-items.ts`, icon `map-pin`) with a live
ready-count badge wired in `sidebar.ts` (`deliveries.getReadyCount`, mirrors the Tasks/Duplicates
badge pattern). Help article: `experiences/help/data/articles/engagement.ts` (id `deliveries`); the
known-route allowlist in `help-content.spec.ts` includes `/deliveries*`.

## Gotchas

- Grid row DTO types must be **`type` aliases, not `interface`** — the `AbstractAPIService.getAll`
  return type requires assignability to `Record<string, unknown>[]`, which interfaces (augmentable)
  fail and type aliases satisfy.
- `est_minutes/est_km/leg_minutes` are `double precision` (not `numeric`) so node-pg returns JS
  numbers, not strings.
- Deferred (not yet built): web-form `yard_sign` intake branch, and the manual "Add request"
  household-picker dialog (backend `addRequest` + the volunteer-assignment picker exist; wire the UI).
