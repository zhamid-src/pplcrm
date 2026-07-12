# Companion Apps — Implementation Plan

**Source spec:** claude.ai/design project → `Companion Apps Spec.dc.html` (July 11, 2026). The spec's §3 (Canvass companion) and §4 (Deliveries companion) are the functional targets; its §5 API sketch is adapted below. **Ignore the spec's colors/typography — use the CRM's DaisyUI semantic tokens** (`pplcrm-design-principles` skill).

**Decisions already made (by the owner,2026-07-12):**

1. Verification channel: **email + SMS (Twilio) now**, both in v1.
2. Admin approval: **once per volunteer** — first verified sign-in creates one pending approval; once approved, all current and future assignments work. Admin can revoke anytime.
3. Scope: **both companions** — rebuild Canvass to full spec, close Deliveries gaps, gate both behind verify + approve.
4. Companion apps talk to the backend via **REST only** (Fastify routes, never tRPC) — this is already true for both existing pages; keep it that way for everything new.
5. The companions live in **one separate Nx app: `apps/companion`** — a small mobile-first Angular app serving both `/t/:token` and `/r/:token`, sharing `libs/common` (schemas/types) and `libs/uxcommon` (components/design tokens). The existing companion routes/pages in `apps/frontend` move over and are deleted there. The desktop CRM keeps the staff-side surfaces (assign dialogs, Volunteer access admin page).
6. Hosting: **same domain, path-routed** — the reverse proxy serves `/t/*` and `/r/*` from the companion build and everything else from the CRM build. Links look like `app.example.com/t/abc`; API is same-origin in production, so no new CORS/DNS work there (dev needs one extra allowed origin, see §4a).

---

## 1. Context

PeopleCRM has two volunteer-facing companion web apps, opened from a personal link, no account:

| App                  | Today                                                                                        | Target                                                                                                                                      |
| -------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Canvass companion    | `/companion?token=…` → lean single page (door list + outcome buttons) inside `apps/frontend` | Full spec §3: landing → tabs (Turf / Map / Me) → household detail → person survey, offline queue, `/t/:token` — in the new `apps/companion` |
| Deliveries companion | `/r/:token` → ~90% of spec §4 already built, inside `apps/frontend`                          | Close gaps: idempotent opIds, undo-after-reload, canvass→delivery-request hook — moved into `apps/companion`                                |

Today the capability URL alone grants access. The new requirement: **strangers must not be able to use a leaked/forwarded link.** A volunteer opening a companion link must (a) verify a one-time code sent to _their_ email or SMS on file, then (b) be approved once by an admin. After that, a long-lived device session lets them work frictionlessly.

### Current-state facts an implementer needs (verified 2026-07-12)

- **Canvass public API:** `apps/backend/src/app/modules/canvassing/routes/canvass-public.route.ts`, mounted at `/api/canvass` in `apps/backend/src/app/routes.ts`. Two endpoints: `GET /turf?token=`, `POST /knock`. Token = `turf_assignments.token` (plaintext, UNIQUE, `randomBytes(24).base64url`), resolved by `turf-assignments.repo.ts → resolveByToken` (status='active'; the one intentionally un-tenant-scoped query). No expiry column. Writes attributed to `assignment.created_by`.
- **Deliveries public API:** `modules/deliveries/routes/deliveries-public.route.ts` at `/api/deliveries`: `GET /r/:token`, `POST /r/:token/stops/:stopId` (`deliver|skip|defer|undo`). Token stored as `sha256` hash (`delivery_routes.share_token_hash` + `share_token_expires_at`), uniform 404 for dead links, per-IP in-memory limiter 120/60s. Defer-to-end + seq renumber + auto-complete + undo-any-stop already work server-side (`controller.ts`: `deferStop`, `undoStop`, `advanceRouteStatus`, `renumberAndRecompute`).
- **Frontend public routes** live outside the auth shell in `apps/frontend/src/app/app.routes.ts` (`companion`, `r/:token`, `f/:slug`, …). Both companion pages use raw `fetch()` with `apiBase()` from `apps/frontend/src/app/shared/public-pages.ts`.
- **Knock model:** `turf_knocks` (append-only; partial unique index on `(tenant_id, turf_id, client_knock_id)` gives offline idempotency). `KNOCK_OUTCOMES = conversation|no_answer|not_home|refused|inaccessible`, `KNOCK_RESPONSES = strong_support|lean_support|undecided|opposed` in `libs/common/src/lib/schemas/canvassing.schema.ts`. A knock with `person_id`+`response` upserts `campaign_person_facts.support_level` via `KNOCK_RESPONSE_TO_SUPPORT` (controller.ts).
- **Missing from canvass model:** issues chips, volunteer/yard-sign/DNC toggles, contact capture, add-person-at-door, walk order, household people in the payload, landing/tabs/map/Me UI.
- **Missing everywhere:** SMS (greenfield — the only "twilio" hits are SendGrid webhook headers), any pending-approval admin surface, any companion session concept.
- **Reusable primitives:** one-time-code hashing `apps/backend/src/app/lib/token-hash.ts` (`generateToken`/`hashToken`); transactional email `lib/mail/transactional-mail.service.ts` (`enqueueMail` → `background_jobs` outbox, Postmark, dev-mock when no token; the HTML shell already has an `.otp-code` style); outbox worker `lib/jobs/worker.ts` + `lib/jobs/job-handlers.ts`; in-memory `lib/rate-limiter.ts checkRateLimit`; role gate `adminOrOwnerProcedure` in `apps/backend/src/trpc.ts`; admin lifecycle UI pattern `apps/frontend/src/app/experiences/users/`; env config `apps/backend/src/env.ts`.
- `persons` has `mobile`, `home_phone`, `email`, `do_not_contact boolean`, `do_not_contact_channels text[]`. `delivery_routes.volunteer_person_id` exists; `turf_assignments` has **no person link** (only `team_id`).
- Pre-ship: no production DB, so schema changes are cheap, but per `pplcrm-migrations` new changes still go in a **new dated migration**, not into `schema.sql`.

---

## 2. Architecture — the volunteer access layer

One shared layer gates both apps. Volunteers are **persons in the rolodex** (deliveries already points at `volunteer_person_id`; canvass assignments gain the same).

### Access flow

```
Volunteer opens /t/:token or /r/:token
  └─ GET /api/companion/access (token + optional X-Companion-Session header)
       ├─ token dead/expired/revoked → friendly dead-link page
       ├─ assignment has no volunteer person → "Ask your organizer to re-send your link"
       ├─ valid session for the right volunteer AND volunteer approved → state: ready → app loads
       ├─ valid session but volunteer not yet approved → state: pending_approval (poll)
       └─ no session → state: need_verification
            └─ POST /verify/start {channel} → 6-digit code via email or SMS (masked destination shown)
            └─ POST /verify/confirm {code} → mint companion session (device token, 30d)
                 ├─ volunteer already approved → ready immediately
                 └─ first time → volunteer status 'verified', admins emailed, page polls until approved
Admin approves once (new "Volunteer access" page) → every companion data endpoint
requires BOTH the capability token AND a valid session whose volunteer matches the
assignment AND volunteer.status='approved'.
```

Key properties:

- The session is minted at confirm time but is **only usable once the volunteer is approved** — data endpoints check session validity AND approval. So the pending page just polls `GET /access` until it flips to `ready`; no second code entry.
- Approval is per volunteer per tenant. Revoking a volunteer kills all their sessions and dead-ends every link.
- The capability token still scopes _what_ they can touch (one turf / one route); the session scopes _who_ they are. Both required.
- Verification codes: 6 digits, hashed at rest (`hashToken`), 10-minute expiry, max 5 confirm attempts per code, 3 sends per token per 15 min (`checkRateLimit`), plus the per-IP limiter pattern from `deliveries-public.route.ts` on all companion routes.
- Never reveal whether a contact exists; only ever show masked values (`j•••@gmail.com`, `(•••) •••-4821`) for contacts already on the person record.
- Dead-link page: for tokens that once existed (revoked/expired rows still resolvable) show "This link is no longer active — contact <organizer first name>"; for unknown tokens show the generic version. Uniform 404 status either way.

---

## 3. Database migration

One new file: `apps/backend/src/app/_migrations/2026-07-12-companion-apps.ts` (follow `pplcrm-migrations`; do **not** touch `schema.sql`). All tables: `bigint` ids, `(id, tenant_id)` PK style, `createdby_id/updatedby_id/created_at/updated_at`, FORCE RLS — copy an existing table's boilerplate.

**New tables**

```sql
companion_volunteers (
  id, tenant_id, person_id NOT NULL,             -- UNIQUE (tenant_id, person_id)
  status text NOT NULL DEFAULT 'invited'
    CHECK (status IN ('invited','verified','approved','revoked')),
  verify_code_hash text, verify_code_expires_at timestamptz,
  verify_attempts integer NOT NULL DEFAULT 0,
  verify_channel text CHECK (verify_channel IN ('email','sms')),
  verified_at timestamptz, approved_by bigint, approved_at timestamptz, revoked_at timestamptz
)

companion_sessions (
  id, tenant_id, volunteer_id NOT NULL,          -- FK companion_volunteers
  token_hash text NOT NULL UNIQUE,               -- sha256 via token-hash.ts; raw returned once
  expires_at timestamptz NOT NULL,               -- now + 30 days
  revoked_at timestamptz, last_used_at timestamptz, user_agent text
)

companion_ops (                                   -- idempotency ledger for BOTH apps
  tenant_id NOT NULL, op_id text NOT NULL,        -- PK (tenant_id, op_id)
  scope text NOT NULL,                            -- 'canvass' | 'deliveries'
  created_at timestamptz NOT NULL DEFAULT now()
)
```

**Alterations**

- `turf_assignments`: add `volunteer_person_id bigint` (nullable — legacy rows), `expires_at timestamptz` (nullable; staff-set; spec default "end of canvass window" — set from turf/campaign date when available, else null = no expiry).
- `turf_households`: add `walk_order integer` (computed at cut/assign time — see §5).
- `turf_knocks`: add `issues text[] NOT NULL DEFAULT '{}'`, `wants_volunteer boolean NOT NULL DEFAULT false`, `wants_yard_sign boolean NOT NULL DEFAULT false`, `set_dnc boolean NOT NULL DEFAULT false`, `contact_phone text`, `contact_email text`, `subscribe boolean NOT NULL DEFAULT false`.
- `campaigns`: add `canvass_issues text[] NOT NULL DEFAULT '{}'` (chip vocabulary), `canvass_script text` (door script).
- `delivery_requests`: extend `source` CHECK to `('web_form','manual','canvass')` (drop + re-add constraint).
- `campaign_subscriptions`: extend `consent_source` CHECK to include `'canvass'`.

Update `libs/common/src/lib/kysely.models.ts` for every table touched. Check `campaign_person_facts.voting_status` CHECK values in `schema.sql` before writing the §5 mapping.

---

## 4. Phase A — Shared access layer (backend + admin UI + SMS)

_Backend-heavy; suggest Opus. Everything here is independent of the canvass rebuild._

### A0. Scaffold `apps/companion` (§4a)

- **Invoke the `nx-generate` skill first** (CLAUDE.md rule) to scaffold a new Angular app `companion` under `apps/`, matching `apps/frontend`'s setup: standalone components, esbuild builder, Tailwind v4 + DaisyUI via the same CSS `@theme` approach (copy `apps/frontend/src/styles.css` imports/tokens — do not fork the token values, import shared ones from `libs/uxcommon` where they live), Vitest for specs, ESLint wired into the workspace config.
- Path aliases in `tsconfig.base.json` (`@common`, `@uxcommon/*`, `@icons/*`) already resolve from any app — reuse them. **Never import anything from `apps/frontend/src/**`into the companion app.** Before moving pages, audit what the two existing companion pages import: anything from`libs/uxcommon` (`pc-icon`, `pc-map`, `pc-tab-bar`, dialog, toast/alert) imports fine; any `apps/frontend`-local helper they need (e.g. `shared/public-pages.ts`→`apiBase()`, the alert/toast service if it is frontend-local) must either be moved into `libs/uxcommon`(if genuinely generic) or reimplemented minimally in`apps/companion`— decide per item, prefer the small local copy for app-specific glue like`apiBase()`.
- Router: exactly two routed areas — `t/:token` and `r/:token` — plus a catch-all that shows the generic dead-link page. Nothing else is routable (spec §5: the token is the whole URL contract).
- Environments: `apps/companion/src/environments/` with `apiUrl` (same values as frontend's) and `googleMapsApiKey`.
- **Dev serving:** `pnpm nx serve companion` on port **4300** (frontend keeps 4200). Backend CORS currently allows the single origin `env.appUrl` (`fastify.server.ts`) — extend it to an array including a new optional `COMPANION_URL` env (dev: `http://localhost:4300`). In production this is unnecessary (same origin, path-routed) but harmless.
- **Prod hosting:** document in `SETUP.md` — reverse proxy sends `/t/*` and `/r/*` (and the companion's hashed asset paths, e.g. serve its build under a distinct asset base href like `/companion/` via Angular's `baseHref`/`deployUrl` so assets never collide with the CRM's) to the `companion` build output; everything else to the CRM build. Both builds deploy from the same pipeline: `nx build companion` alongside `nx build frontend`.
- Add `companion` to the quality-gate commands in every phase (`nx lint companion`, `nx build companion`, `nx test companion`).

### A1. SMS service (greenfield)

- `apps/backend/src/app/lib/sms/sms.service.ts` — mirror `transactional-mail.service.ts` exactly: `sendSms(to, body)` does a plain `fetch` POST to `https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json` (Basic auth `sid:token`, form-encoded `To/From/Body`). When creds are absent, log `[TWILIO DEV MOCK]` and succeed (so dev and tests never need Twilio). `enqueueSms(trx, …)` inserts a `background_jobs` row `type:'send-sms'` inside the caller's transaction (outbox — no ghost sends).
- `apps/backend/src/app/lib/sms/phone.ts` — `normalizeE164(raw): string | null` (strip formatting; 10 digits → `+1` prefix; leading `+` passthrough; else null). Unit-test it.
- Handler: add `case 'send-sms'` in `lib/jobs/job-handlers.ts` → new handler in `lib/jobs/handlers/notifications.handlers.ts`.
- `apps/backend/src/env.ts`: add optional `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`. Update `.env.development.example` and `SETUP.md`.

### A2. Companion-access module

New `apps/backend/src/app/modules/companion-access/` (controller, `repositories/companion-volunteers.repo.ts`, `repositories/companion-sessions.repo.ts`, `routes/companion-public.route.ts`, `trpc.router.ts`, specs).

**Public REST** (mount at `/api/companion` in `routes.ts`; copy the per-IP limiter + `statusOf/messageOf` pattern from `deliveries-public.route.ts`):

```
GET  /api/companion/access?kind=turf|route&token=…      (optional X-Companion-Session)
     → { state: 'dead'|'unassigned'|'need_verification'|'pending_approval'|'ready',
         volunteerName?, organizerFirstName?, campaignName?,
         contacts?: [{channel:'email'|'sms', masked}] }
POST /api/companion/verify/start    { kind, token, channel }         → { masked }
POST /api/companion/verify/confirm  { kind, token, code }
     → { status:'ready'|'pending_approval', sessionToken?, expiresAt? }
```

- Resolving `kind=turf` uses `turf-assignments.repo.resolveByToken` (+ new `expires_at` check); `kind=route` reuses the deliveries `isTokenUsable` path. Volunteer = `turf_assignments.volunteer_person_id` / `delivery_routes.volunteer_person_id`; upsert the `companion_volunteers` row (status 'invited') on first touch.
- `verify/start`: person must have the requested channel on file (email / normalizable mobile); code via `enqueueMail` (use the `.otp-code` template style) or `enqueueSms` ("PeopleCRM code: 123456 — expires in 10 minutes"). Because codes must survive rollbacks correctly, generate + store the hash and enqueue in one transaction.
- `verify/confirm`: constant-time-ish hash compare, attempts++, on success clear code fields, `verified_at=now()`, status `invited→verified`, mint session (`generateToken`/`hashToken`, 30d), and **if this created a newly-verified volunteer, enqueue an email to all tenant admins/owners** ("Jordan Rivera verified their phone and is waiting for approval → PeopleCRM → Volunteer access") in the same transaction.
- Shared guard for data endpoints: `requireCompanionSession(req, volunteerPersonId, tenantId)` in the controller (or a small `lib/companion-auth.ts`) — validates header token hash, expiry, revocation, volunteer match, `status='approved'`; bumps `last_used_at`. Both canvass and deliveries public routes call this.

**Admin tRPC** (`companionAccess` router, registered in `modules/trpc.ts`): `getAll` (join persons for name/contacts; `authProcedure`), `pendingCount` (`authProcedure`), `approve(id)`, `revoke(id)` (both `adminOrOwnerProcedure`; revoke also revokes all sessions). Approve/revoke write `user_activity` entries.

### A3. Admin "Volunteer access" page

- New `apps/frontend/src/app/experiences/volunteer-access/` — follow the Users page pattern (`experiences/users/`), but this is a bespoke list: use **`pc-table`** (per `pplcrm-table` skill), not the datagrid. Columns: name, contact (masked not needed here — staff may see full), status chip (Invited=neutral / Awaiting approval=warning / Approved=success / Revoked=error), verified via, approved by/at, actions (Approve / Revoke with the project confirm dialog, `AlertService` toasts).
- Route inside the auth shell (`dashboard.routes.ts`), admin-gated like the users page. Sidebar item with a pending-count badge (copy the deliveries sidebar-badge mechanism).
- Campaign settings additions: on the campaign detail page add "Canvassing" fields for `canvass_issues` (chip editor) and `canvass_script` (textarea). (Small; if the campaign page is unfamiliar, read `pplcrm-campaigns` first.)

### A4. Frontend gate shell (shared by both companion surfaces)

- New `apps/companion/src/app/gate/` (both routed areas of the companion app wrap themselves in this — nothing here touches `apps/frontend`):
  - `companion-session.ts` — get/set session token in `localStorage`, build headers, `getAccess(kind, token)`, `verifyStart`, `verifyConfirm` (raw `fetch` to `apiBase()`).
  - `companion-gate.ts` component — given `kind` + `token`, renders: dead-link page / "ask your organizer" / verify screen (channel picker with masked destinations → 6-digit code input → resend with cooldown) / pending-approval screen ("You're verified — waiting for your organizer to approve you", polls `getAccess` every 20s) / and projects `<ng-content>` when `ready`. Signals + DaisyUI tokens; tap targets ≥44px; sentence case; explained-disabled buttons per the design doctrine.
- Wrap both companion pages in this gate.

**Definition of done (A):** with dev-mock mail/SMS, a fresh volunteer link walks the full journey in the logs (code logged → confirm → pending → admin approves in UI → page flips to ready). Revoke kills access on next request. Backend specs cover: happy path both channels, wrong code ×5 lockout, resend rate limit, unapproved session rejected by the guard, revoke cascades.

---

## 5. Phase B — Canvass companion backend (spec §3 data + API)

_Suggest Opus. Read `pplcrm-canvassing` + `pplcrm-trpc-backend` first._

### B1. Assignment gains a person + walk order

- `CanvassingController.assignTurf` / tRPC `assign` gain a required `volunteer_person_id` (staff picks the canvasser — update the assign dialog in `experiences/canvassing`); set `expires_at` when a canvass window date exists.
- Walk order: at cut/assign time compute `turf_households.walk_order` with a greedy nearest-neighbour pass over household coords — reuse the pure helpers in `apps/backend/src/app/lib/routing/` (`geo.ts`); do not duplicate haversine.

### B2. Survey vocabulary (pre-ship rename, no back-compat needed)

In `libs/common/src/lib/schemas/canvassing.schema.ts`:

- `KNOCK_RESPONSES` → the spec's five: `supporter | undecided | non_supporter | not_voting | already_voted`.
- `KNOCK_OUTCOMES` += `cleared` (outcome-clearing knock; keeps the model append-only) and `moved` (person no-conversation code).
- New mapping in the controller: supporter→`support_level:'strong'`, undecided→`'undecided'`, non_supporter→`'against'`; `not_voting`/`already_voted` write `campaign_person_facts.voting_status` instead (verify the CHECK values in `schema.sql` and map accordingly — field-scoped upsert already exists, never wipe the other field).
- Update the existing companion UI labels wherever they reference the old four (they get rebuilt in Phase C anyway) and the field report aggregations in `turf-knocks.repo.ts` if they group by response.

### B3. Public API (extend `canvass-public.route.ts`)

```
GET  /api/canvass/t/:token           (requires companion session guard)
     → { campaignName, turfName, canvasser:{name}, script, issues[],
         expiresAt, households[] }   -- ordered by walk_order
       household: { id, walkOrder, address, lat, lng, dnc,
                    doorOutcome, hhSurveyDone,
                    people: [{ id, name, age, metAtDoor, result, survey? }] }
POST /api/canvass/t/:token/results   (requires companion session guard)
     body: { ops: [{ opId, type, payload, recordedAt }] }   → { acks: [{opId, status:'applied'|'duplicate'|'rejected', error?}] }
     types: 'survey' | 'person_result' | 'door_outcome' | 'clear_outcome' | 'person_create'
```

Keep the two legacy endpoints working until Phase C ships, then delete them.

- **Payload minimization is an acceptance criterion**: names, ages, walk data, prior door results only. Never emails/phones/donations/notes in the GET (spec §2). The survey pre-fill for re-editing comes from the knock rows (support, issues, toggles), not from person contact data.
- Each op: insert into `companion_ops` `ON CONFLICT DO NOTHING`; on conflict ack `duplicate` and skip. Apply each op in its own transaction (partial batch success is fine — acks say which). `recordedAt` (client clock) → `turf_knocks.knocked_at`, capped to now.
- **`survey` op side-effects** (one transaction, all writes under `assignment.created_by`, activity `via 'Canvass Companion (name)'` — existing pattern in `logKnock`):
  - insert `turf_knocks` (outcome `conversation`, response, notes, issues, toggle columns, contact fields; `client_knock_id = opId`); household-level survey = same row with `person_id` null.
  - support/voting → `CampaignPersonFactsRepo.upsertFact` (campaign = turf's `campaign_id`, existing `resolveKnockCampaignId`).
  - `wants_yard_sign` → insert `delivery_requests` (source `'canvass'`, status `'new'`, household + person + campaign) **unless an open request exists for the household** — reuse the guard logic from `DeliveriesController.addRequest`; don't duplicate it, extract/share.
  - `set_dnc` → `persons.do_not_contact = true`.
  - `contact_phone`/`contact_email` → fill person's `mobile`/`email` **only if currently blank** (never overwrite; the knock row keeps the captured value regardless).
  - `subscribe` (requires an email) → upsert `campaign_subscriptions` (status `subscribed`, `consent_source 'canvass'`, `consent_at now()`).
  - `wants_volunteer` → attach person tag `Volunteer prospect` (use the existing tags infra; create tag if missing).
- **`person_result`** → one knock row with outcome `not_home|moved|refused` for that person.
- **`door_outcome` / `clear_outcome`** → knock rows (`no_answer|inaccessible|refused` / `cleared`), household-level. Derived status: latest outcome-knock wins; `cleared` means no outcome. DNC households reject all ops (`FORBIDDEN`-style 403 body).
- **`person_create`** → insert person (name only, `household_id`, tenant-scoped) + tag `Added at door`; ack returns the new `personId` so the client can swap its temp id.
- Extend `getCompanionTurf` internals rather than starting over: `turf-households.repo.getDoors` gains people join + walk_order ordering.

**Definition of done (B):** `controller.spec.ts` additions cover: batched ops idempotency (send twice, applied once), survey → facts upsert with new vocabulary, yard-sign → `delivery_requests` row visible with source `canvass` + no duplicate for an open request, DNC write, subscribe write, fill-if-blank contact rule, person_create + tag, DNC household rejects ops, payload contains no emails/phones. `nx lint backend` green (tenant-safety rule — every new query scoped; token-resolve is the one exception pattern, already established).

---

## 6. Phase C — Canvass companion frontend rebuild (spec §3 UI)

_UI-heavy; Sonnet-suitable once B is merged. Read `pplcrm-design-principles`, `pplcrm-angular-components`, and spec §3 figures (design project `handoff-companions/img/_.png`) for layout reference — but CRM tokens for all color/type.\*

Lives entirely in `apps/companion` (route `t/:token`). In `apps/frontend`, delete the old `companion` route + `experiences/canvassing/ui/companion-page.ts/html`; anywhere the CRM builds a companion link (assign dialog / `getCompanionLink`) now emits `/t/:token` (pre-ship, so no redirect shim needed).

Structure under `apps/companion/src/app/canvass/`:

- `companion-shell.ts` — wraps everything in the Phase A gate; owns the store; view-state routing is **client-side signals only** (spec: nothing but the token is routable).
- `companion-store.ts` — signals store: turf payload, ops queue, derived door status. Offline queue in `localStorage` (extends the existing `canvass-companion-queue` pattern; deliberate deviation from the spec's IndexedDB — the queue is small JSON). Each action: apply optimistically → enqueue op (`crypto.randomUUID()` opId) → flush; flush on `online` event, on load, and after each enqueue; drain in order; reconcile acks (`duplicate` = success; swap temp person ids).
- `companion-derive.ts` + spec — pure functions: door status (dnc → outcome → hhSurvey/all-people-resulted=Canvassed → some=In progress → Not visited), "attempted", support consensus ("Mixed support"), Me-tab stats, top issues. **This is the spec's "derived, never stored" invariant — no status field in the store.**
- Views (spec §3.3–3.6, all figures):
  - **Landing** — eyebrow (campaign · turf), "You're assigned <turf>", assigner/date, stat row (doors · voters · distance if available), identity card ("Walking as <name> — results save under your name"), primary "Start walking", escape hatch line.
  - **Tabs** Turf / Map / Me — tab bar hides inside household + survey views (linear doorstep flow).
  - **Walk list** — progress card ("6 of 14 doors attempted" + bar + conversations count), All/Remaining/Visited filter chips, rows with walk-order bubble + address + names + status chip; next open door gets primary ring + filled bubble.
  - **Map** — `<pc-map>` (placeholder-safe per `pplcrm-maps-geo`) with numbered pins: hollow = to visit/not home, filled = surveyed (colored by consensus), error = refused/DNC; legend; tap pin → household.
  - **Household detail** — header (address, derived chip, "Walk order N · M people on file"), "This household" anonymous-survey card (dashed affordance until used), person cards (avatar, name, age/registered or "Met at the door", result chip or "Tap to survey", generated tags), inline "+ Add someone at this door" (no modal), bottom 3-up door outcomes (Nobody home / Inaccessible / Refused; tap active again = clear, toast "Cleared — door is back on your list"), DNC banner variant (red banner, dimmed non-interactive cards, outcomes hidden).
  - **Person survey** — no-conversation codes first (Not home / Moved / Refused, one tap); collapsible script card; support level single-select (the five options) — required, save button explained-disabled ("Pick a support level to save"; exception: DNC-toggle-only is saveable); issues chips (campaign vocabulary); follow-up toggles (volunteer, yard sign, DNC red); contact fields + "Subscribe to updates" gated inline ("Add a phone or email to subscribe"); notes; "Save & sync" → toast "Saved · syncing to PeopleCRM…" / offline "Saved — will sync when back online".
  - **Me tab** — identity/provenance card + "End shift on this device" (outline error button → clears local state, back to landing, "Shift ended — reopen your link anytime"); today's stats + "Top issues heard" (all from `companion-derive`); sync card (Up to date / Syncing… / Offline chip, last-synced, named queue entries, "Work offline" toggle, "Sync now").
  - **Offline banner** — persistent amber "Offline — N results queued in this browser" above every screen.
- Undo: keep a last-action snapshot in the store; undo restores prior state and enqueues the inverse op (e.g. `clear_outcome`).
- Toast copy per spec + `pplcrm-design-principles` (one clause, sentence case, no exclamation marks). Use `AlertService`.
- Delete the old `companion-page.ts/html` once the new shell replaces it, and remove the legacy backend endpoints.

**Definition of done (C):** specs for `companion-derive` (every derivation branch) and the store's queue (offline enqueue → flush-once semantics with mocked fetch); spec §6 canvass acceptance rows all demonstrable via the `verify` skill drive (seed a turf, walk the flow, check facts/requests/activity in the CRM).

---

## 7. Phase D — Deliveries companion hardening (spec §4 gaps)

_Small; Sonnet-suitable. Read `pplcrm-deliveries`._

- **Move:** port `apps/frontend/src/app/experiences/deliveries/ui/public-route.ts/.html` to `apps/companion/src/app/deliveries/` (route `r/:token`), fix imports per the A0 audit, then delete the original and its `r/:token` route from `apps/frontend/src/app/app.routes.ts`. Staff pages (`deliveries-requests`, `deliveries-plan`, route detail) stay in the CRM; the share URL builder in `deliveries-route-detail.ts` keeps emitting `${origin}/r/${token}` (same domain, path-routed — unchanged).
- **Gate:** wrap the moved page in the Phase A gate (`kind='route'`); backend `GET /r/:token` + `POST …/stops/:stopId` call the companion-session guard (volunteer = `delivery_routes.volunteer_person_id`; if null → `unassigned` state). `assignVolunteer` already exists staff-side — make it required before minting a share link (mint should 400 with a clear message if no volunteer assigned).
- **Idempotent opIds:** client sends `opId` (uuid) in the stop-action POST; server inserts into `companion_ops` (scope `deliveries`) ON CONFLICT → return current authoritative route state without re-applying. Fixes the double-`defer` retry bug.
- **Undo after reload:** server already supports undo on any stop — surface Undo on every terminal row (delivered/skipped), not just `lastActioned`, including from the completed state (which reopens the route — already implemented in `undoStop`).
- **Payload check:** confirm GET returns first name + address only (it does — keep it that way; add a spec asserting it).
- Fix noted while exploring: the public payload's `campaign_name` is actually the org name (`controller.ts` `publicOrgName`) — either rename the field or send the real campaign name; update the `pplcrm-deliveries` skill note either way.

**Definition of done (D):** replayed POST with same opId applies once (spec test); volunteer page shows undo on any terminal stop after a reload; unverified stranger with the raw link gets the verify wall.

---

## 8. Phase E — Docs, help center, skills, quality gate

- **Help Center (mandatory per CLAUDE.md, same change as the feature):** update `apps/frontend/src/app/experiences/help/data/articles/*.ts` — canvassing article (new companion flow, verification, approval), deliveries article (verification step), and a new short "Volunteer access approvals" admin article; wire `related` links; run `npx vitest run src/app/experiences/help` from `apps/frontend`, then re-read prose (the spec only catches broken slugs).
- **Skills:** update `.claude/skills/pplcrm-canvassing/SKILL.md` (new API shape, `/t/:token`, vocabulary, walk order) and `pplcrm-deliveries` (gate, opIds, campaign_name fix); write a new `pplcrm-companion-access` skill covering the shared layer (tables, guard, gate component, Twilio env).
- **Env/docs:** `.env.development.example`, `SETUP.md` (Twilio vars, dev-mock behavior).
- **Quality gate (per `pplcrm-quality-gate`, every phase before commit):**
  ```bash
  npx prettier --write .
  npx eslint <changed> --report-unused-disable-directives-severity=off
  npx nx lint backend && npx nx lint frontend && npx nx lint companion   # tenant-safety rule lives in nx lint backend
  npx nx build frontend && npx nx build backend && npx nx build companion
  npx nx test frontend && npx nx test backend && npx nx test companion
  ```

---

## 9. Acceptance checklist (spec §6 + new auth layer)

Auth layer:

- [ ] A stranger with a forwarded link cannot see any voter/route data — verify wall first, and no data endpoint responds without an approved session.
- [ ] Code arrives via email and via SMS (dev: both mocked in logs); wrong code ×5 locks the code; resends rate-limited.
- [ ] First verification → admin email + pending badge; approval flips the polling page to ready without re-entering a code.
- [ ] Approval is once per volunteer: a second assignment to the same approved volunteer needs only device verification (new device) or nothing (same device, live session).
- [ ] Revoking a volunteer kills all sessions on the next request; token revocation/expiry shows the friendly dead-link page.

Spec §6 (unchanged rows omitted — see spec): payload minimization verified on the wire; derived door status never disagrees; survey save blocked without support level with explained-disabled copy; DNC doors block recording but count toward progress; yard-sign toggle creates a visible intake request; full offline round-trip syncs exactly once via opIds; deliveries first action → in-progress, last terminal → auto-complete, undo from every state; all public actions attributed "via volunteer link"/companion in the activity feed; tap targets ≥44px, focus rings, reduced motion.

## 10. Suggested execution order & model fit

| Phase                                                | Depends on         | Fit                              |
| ---------------------------------------------------- | ------------------ | -------------------------------- |
| A0 (scaffold `apps/companion` + CORS/hosting)        | —                  | Sonnet (use `nx-generate` skill) |
| A (access layer + SMS + admin UI + gate shell)       | migration, A0      | Opus (auth-sensitive)            |
| B (canvass backend)                                  | migration, A guard | Opus                             |
| C (canvass frontend, in `apps/companion`)            | A0, B              | Sonnet                           |
| D (deliveries move + hardening, in `apps/companion`) | A0, A              | Sonnet                           |
| E (docs/help/skills)                                 | all                | Sonnet                           |

A and B can share the single migration file; land A0+A first so D can proceed in parallel with B/C. Keep commits per phase and run the full quality gate each time.
