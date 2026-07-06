# PeopleCRM — Security, Correctness & Performance Review

## Context

This is a full read-only review of the PeopleCRM backend (Fastify 5 + tRPC + Kysely/Postgres) and
frontend (Angular 22 + signals). The goal is a reliable, secure, performant app — not token economy.
Each finding below cites the exact file and line, states the concrete failure it produces, and gives a
fix. Findings are grouped into phases by severity so they can be executed in order.

**This document is an implementation backlog for a coding agent (Opus 4.8 or Sonnet 5.0).** Each
section names the recommended agent:

- **Opus 4.8** — security-critical reasoning, cross-cutting refactors, anything touching auth/session
  lifecycle, multi-tenant boundaries, query planning, or where a wrong fix creates a new hole.
- **Sonnet 5.0** — well-scoped, mechanical fixes with a clear spec and low blast radius (headers, escaping,
  a single index, memoization, small guards).

Do the phases in order. Within a phase, each item is independent unless noted. **Do not** weaken the
existing tenant-scoping or error-sanitization patterns while fixing these. Run the quality gate
(`pplcrm-quality-gate`) after every item, and `nx lint backend` for the tenant-safety rule.

### Severity legend

- **P0 Critical** — exploitable now, or silent data/security failure in normal use.
- **P1 High** — real security/correctness gap requiring specific conditions, or user-visible wrong data.
- **P2 Medium** — performance degradation at scale, or defense-in-depth hardening.
- **P3 Low** — polish, consistency, latent risk.

### Progress

- [x] **1.1** Access-token session revocation — implemented (branch `security/phase1-session-revocation`).
- [x] **1.2** Shared REST auth helper (`lib/rest-auth.ts`) — session revocation + viewer-write guard applied
      to `emails-api.route.ts` (`/send` write-gated; attachment reads session-gated), `exports-download.route.ts`,
      and the bearer path of `files.route.ts`.
- [ ] **1.3** — pending (next).
- [x] **1.4** Trust-proxy — added `TRUST_PROXY` env (default `false`), wired to Fastify `trustProxy`; the three
      public routes (web-forms submit, volunteer-events signup, events RSVP) now rate-limit on `req.ip` instead of
      the spoofable raw `X-Forwarded-For` header.
- [x] **1.5** CSV formula-injection guard — shared `escapeCsvCell` in `lib/csv.ts` (used by `csv.ts` and
      `csv-stream.ts`) prefixes `'` on string cells starting with `= + - @ \t \r`; numbers/dates untouched.
- [ ] 2.1 – 5.4 — pending.

---

## Phase 1 — Critical security (P0) — **Agent: Opus 4.8**

### 1.1 Access token is not revocable — session deletion doesn't sign anyone out

**Files:** `apps/backend/src/trpc.ts:82-129` (`isAuthed`), `apps/backend/src/context.ts:9-30`

`isAuthed` validates the JWT and re-reads `authusers` for role/verified, but **never checks the
`sessions` table**. The access token (`auth_token`) is a 30-minute HS256 JWT carrying `session_id`, yet
no authed request path confirms that session still exists or is `active`.

**Impact:** Every "sign out everyone now" flow is a lie for up to 30 minutes:

- `signOut` (`controller.ts:1086`) deletes the session row, but the user's current access token keeps
  working until it expires.
- `pauseTenant` (`:640`) and `scheduleTenantDeletion` (`:902`) delete **all** tenant sessions "so the
  pause/deletion takes effect immediately" — but every already-issued access token still authorizes
  reads and writes for up to 30 min.
- `resetPassword` (`:779`) and email-change confirmation (`:1529`) delete sessions to kick old
  credentials, with the same 30-minute bypass window.

**Fix:** In `isAuthed`, after the `authusers` lookup, verify the session by `hashToken(ctx.auth.session_id)`
against `sessions` (status `active`, matching `user_id`/`tenant_id`, not expired). Reject if absent.
This is one indexed lookup (`sessions_session_id_index` exists) per authed request. Consider caching for a
few seconds per session_id if the extra round-trip is a concern, but correctness first. Also confirm the
`renewAuthToken` idle/expiry checks (`:714-725`) still hold — they do, this is additive.

### 1.2 REST routes bypass the viewer-role write guard

**Files:** `apps/backend/src/app/modules/emails/routes/emails-api.route.ts:278` (`POST /api/emails/send`),
also the file/export routes and any REST mutation.

The role/permission enforcement (viewers cannot mutate) lives **only** in the tRPC `isAuthed` middleware
(`trpc.ts:109-121`). The REST routes authenticate with `verifyAuthToken` directly and never check
`role`. A `viewer` (read-only) user — or any valid token holder — can `POST /api/emails/send` and send
mail as themselves, and similarly hit other REST mutation surfaces.

**Impact:** Privilege escalation for the `viewer` role on every REST mutation endpoint. Read-only accounts
can send email, mutate attachments, etc.

**Fix:** Add a shared REST auth helper that returns `{ tenant_id, user_id, role }` and enforces the same
viewer-write rule as `isAuthed` (fetch role from `authusers`, block mutations for `viewer`). Apply it to
`emails-api.route.ts` `/send` and audit every REST route under `apps/backend/src/app/modules/**/routes/`
for the same gap. Fold in 1.1's session check here too so REST and tRPC share one revocation path.

### 1.3 Full session JWT accepted in the query string on email attachment routes

**File:** `apps/backend/src/app/modules/emails/routes/emails-api.route.ts:651, 708`

```ts
let token = req.query.token;               // full session JWT in the URL
if (!token && req.headers.authorization) { ... }
```

`files.route.ts` and `exports-download.route.ts` deliberately **reject** session JWTs in the query string
(their comments say "URLs leak into history, proxies, and logs" and use a short-lived scoped token
instead). The email attachment/inline-CID routes contradict this and accept the full session token as
`?token=`, which then lands in browser history, referrer headers, and proxy logs.

**Impact:** A leaked attachment/image URL leaks a live 30-minute session token usable against the whole
API.

**Fix:** Mint a short-lived, file-scoped token like `signed-download.ts` already does
(`signedFileDownloadUrl` / `verifyFileDownloadToken`) and use it for attachment and inline-CID URLs.
Remove `req.query.token` acceptance of session JWTs. Coordinate with the frontend email body/attachment
rendering so it requests the scoped token.

### 1.4 Public-form rate limit is trivially bypassed via a spoofed header

**File:** `apps/backend/src/app/modules/web-forms/routes/web-forms-public.route.ts:533`

```ts
const clientIp = (req.headers['x-forwarded-for'] as string) || req.ip;
```

The submission rate limiter (`controller.ts:103-120`, 5/min) keys off this value. `X-Forwarded-For` is a
client-supplied header; an attacker sets a fresh random value per request and the per-IP limit never
trips. The honeypot (`_hp`) is the only remaining defence and is easily satisfied.

**Impact:** Unauthenticated form-submission flood → unbounded `persons`/`form_submissions` inserts,
workflow triggers, background email jobs, and (for donation forms) Stripe checkout-session creation, per
tenant.

**Fix:** Configure Fastify `trustProxy` for your known proxy hops and use `req.ip` (which Fastify then
derives correctly) rather than reading the raw header. Do not trust `X-Forwarded-For` verbatim. Apply the
same correction anywhere else the raw header is read for security decisions.

### 1.5 CSV formula (spreadsheet) injection in exports

**File:** `apps/backend/src/app/lib/csv.ts:4-9`

`rowsToCsv` quotes for CSV structure but does not neutralize leading `=`, `+`, `-`, `@`, tab, or CR.
Person names, notes, tags, etc. are attacker-controllable via the public form and Zapier ingest, then
exported to CSV. Opening the export in Excel/Sheets executes `=HYPERLINK(...)`, `=cmd|...`, etc.

**Impact:** A public-form submitter can plant a formula that runs on a staff member's machine when they
export and open contacts — data exfiltration / local command execution vector.

**Fix:** In `escape`, when the stringified cell begins with `= + - @ \t \r`, prefix a single quote (`'`)
or a leading space before the existing CSV quoting. Keep the numeric/date paths intact. This is
well-specced and low-risk — **could be delegated to Sonnet 5.0** with this exact rule.

---

## Phase 2 — High security & correctness (P1)

### 2.1 Tokens (access **and** refresh) live in `localStorage`/`sessionStorage` — **Agent: Opus 4.8**

**File:** `apps/frontend/src/app/services/api/token-service.ts:24-33, 94-99`

Both the access token and the long-lived refresh token (30-day with remember-me) are in web storage,
readable by any script. There is no `helmet`/CSP on the backend (see 2.2). Any XSS — including a stored
one via the many `[innerHTML]` bindings (`newsletter-detail.html:456` binds `email()?.html_content`
directly) — yields full, durable account takeover by stealing the refresh token.

**Impact:** XSS escalates to persistent account compromise, not just a session hijack.

**Fix (staged, needs judgment — Opus):** (a) Ship a strict CSP (2.2) to cut the XSS surface. (b) Move the
refresh token to an `HttpOnly; Secure; SameSite` cookie with a dedicated refresh endpoint, keeping only
the short-lived access token in memory (not storage). (c) If the cookie migration is too large now,
minimally: keep the refresh token out of `localStorage` (session-only), shorten refresh TTL, and rotate
refresh tokens on every use (rotation isn't currently enforced — `renewAuthToken` issues a new refresh
each call, so verify old ones are invalidated). Document the decision either way.

### 2.2 No security headers (no helmet / CSP / HSTS / X-Frame-Options / nosniff) — **Agent: Sonnet 5.0**

**File:** `apps/backend/src/fastify.server.ts` (plugin registration block)

`@fastify/helmet` is not registered; there is no CSP, `Strict-Transport-Security`,
`X-Content-Type-Options: nosniff`, `X-Frame-Options`/`frame-ancestors`, or `Referrer-Policy`. The
server-rendered public form pages (`web-forms-public.route.ts`) and the SPA are all served without them.

**Impact:** Clickjacking of the public form pages, MIME-sniffing, and a much larger XSS blast radius
(compounds 2.1).

**Fix:** Register `@fastify/helmet` with a CSP appropriate to the SPA and the public form pages (they use
Google Fonts — allow those hosts explicitly). Add `nosniff`, `frame-ancestors 'none'` (or the embed
allow-list the Forms feature needs — check `pplcrm-forms` for the embed story), HSTS, and a sane
`Referrer-Policy`. Verify the public form embed/iframe flow still works after setting frame-ancestors.

### 2.3 `getAllWithCounts` returns page size as the total count — **Agent: Opus 4.8**

**File:** `apps/backend/src/app/lib/base.repo.ts:189-198`

```ts
const rows = await this.getAll(...);          // applies limit/offset from startRow/endRow
return { rows, count: rows.length };          // count == page size, not the total
```

`getAll` applies pagination (`applyOptions` maps `startRow/endRow` → `limit/offset`), so `count` equals
the number of rows on the current page, not the total matching rows. Every entity that uses the base
crud-router's `getAll`/`getAllWithCounts` (via `createCrudRouter`, `crud-router.ts:12-17`) and relies on
`count` for server-side grid paging gets a wrong total. (Persons/households/companies override this with a
real `COUNT(DISTINCT …)` query — the bug is in the base path used by the other entities.)

**Impact:** Wrong total-row counts → broken pagination UI, "load more" that stops early or never ends, and
misleading counts wherever the base path feeds a server-side grid.

**Fix:** Add a proper count in `getAllWithCounts`: run a `COUNT(*)` with the same tenant + filter WHERE
clause but **without** limit/offset, and return it as `count`, while `rows` keeps the paginated slice.
Reuse the existing filter-application code so the count matches the filtered set. Audit which entities
consume the base `count` so nothing regresses.

### 2.4 Secret lookups by settings value are not constant-time — **Agent: Opus 4.8**

**Files:** `apps/backend/src/app/modules/zapier/zapier.service.ts:146-157`
(`lookupTenantByApiKey`), `apps/backend/src/app/modules/donations/routes/donations-webhook.route.ts:20-30`

Both resolve a tenant by `WHERE key = '…' AND value = JSON.stringify(secret)`. The Zapier API key is the
sole authenticator for the inbound person-upsert/tag routes. A DB equality compare is not constant-time,
and there's no per-key rate limiting on the Zapier routes.

**Impact:** Primarily a (weak) timing side-channel on the API key; more importantly the Zapier routes have
**no rate limiting**, so the key is brute-forceable and the upsert endpoint is an unauthenticated-in-effect
write amplifier if a key leaks. (The donations webhook is additionally protected by the Stripe signature,
so it's lower risk.)

**Fix:** Store API keys/webhook tokens hashed (`hashToken`) and look up by hash, comparing with
`timingSafeEqual` after fetching the candidate row. Add IP + key rate limiting to the Zapier inbound
routes. Consider a dedicated `api_keys` table rather than overloading `settings`.

### 2.5 `verify2FA` doesn't clear the OTP on failure & has no per-account attempt cap — **Agent: Opus 4.8**

**File:** `apps/backend/src/app/modules/auth/controller.ts:1453-1476`

On a wrong code the stored `two_factor_code` is left intact; it's only cleared on success (`:1478`). The
only limit is IP-based (5/15min, `trpc.router.ts:77-83`), which an attacker rotates around (and can spoof
via XFF, see 1.4). The OTP is 6 digits and valid for 5 minutes.

**Impact:** Within the 5-minute window an attacker can grind the 6-digit OTP across rotating IPs with no
per-account lockout.

**Fix:** Track and cap failed 2FA attempts per user (e.g. invalidate the code after N failures and force a
new login), and clear/rotate the code on repeated failure. Pair with the XFF fix (1.4) so IP-based limits
are meaningful.

### 2.6 Unescaped `formId` interpolated into server-rendered form HTML — **Agent: Sonnet 5.0**

**File:** `apps/backend/src/app/modules/web-forms/routes/web-forms-public.route.ts:839, 650`

`renderFormHtml` escapes `formName`/`formDescription` via `escapeHtml` but interpolates the raw route
param `formId` into `action="/api/forms/submit/${formId}"` (and the cancel URL). It's currently constrained
because the form must resolve via `getByIdPublic(formId)` first, but relying on the DB lookup for output
safety is fragile.

**Impact:** Defense-in-depth gap; becomes a reflected-XSS hole if the ID lookup ever loosens or the ID
type changes.

**Fix:** Pass `formId` through `escapeHtml` (and prefer `encodeURIComponent` for the URL context) at every
interpolation site. Mechanical.

---

## Phase 3 — Performance (P2)

### 3.1 Grid cell HTML is re-rendered + re-sanitized on every change detection — **Agent: Sonnet 5.0**

**Files:** `apps/frontend/src/app/shared/components/datagrid/datagrid.html:559`,
`apps/frontend/src/app/shared/components/datagrid/datagrid.ts:1141-1160`

```html
<span [innerHTML]="callCellRenderer(r.original, col)"></span>
```

`callCellRenderer` runs the renderer function **and** `DOMPurify.sanitize` on every invocation, and a
method call in a template binding re-runs on every change-detection pass for every visible cell.

**Impact:** For a wide/tall grid this is O(rows × columns) DOMPurify passes per CD cycle — janky scrolling
and interaction on large lists.

**Fix:** Memoize per (row-id, column-id, value): compute the sanitized `SafeHtml` once when the row/value
changes (e.g. a computed map keyed by row id, or precompute in the row view-model) rather than in the
binding. Keep DOMPurify — just stop calling it every CD pass.

### 3.2 Base `exportCsv` buffers all rows and returns the whole CSV in one tRPC response — **Agent: Opus 4.8**

**File:** `apps/backend/src/app/lib/base.controller.ts:262-350`

`exportCsv` does `repo.getAll(... no limit ...)`, maps every row into memory, builds one CSV string, and
returns it inline in the tRPC response. There is a streaming/background export path
(`exports-download.route.ts` + `csv-stream.ts`) for large entities, but the base path used by smaller
entities has no cap.

**Impact:** A large tenant exporting a base-path entity spikes backend memory (whole table in RAM + full
CSV string + superjson serialization) and can OOM or stall the event loop.

**Fix:** Route all exports through the existing background/streaming export path, or enforce a hard row cap
on the inline path and push anything larger to the queued `export_csv` job. Prefer streaming via
`csv-stream.ts`.

### 3.3 Person search: 8-column `LOWER(...) LIKE '%q%'` over five joins with DISTINCT — **Agent: Opus 4.8**

**File:** `apps/backend/src/app/modules/persons/repositories/persons.repo.ts:167-181, 236-240`

The free-text search ORs leading-wildcard `LOWER(col) LIKE '%q%'` across persons, households, companies,
and tags, joined via `map_peoples_tags` (fan-out forces `COUNT(DISTINCT persons.id)` and a distinct data
query). Trigram indexes exist for persons columns (`idx_persons_trgm_*`) but the query wraps columns in
`LOWER(...)`, which prevents use of a non-functional trigram index; households/companies/tags columns have
no trigram index at all.

**Impact:** Full-scan-ish search that degrades sharply as any tenant's contacts grow; the count query pays
the join fan-out twice (count + rows).

**Fix (needs measurement — Opus):** Store/query normalized-lowercase columns (or add
`LOWER(col) gin_trgm_ops` functional trigram indexes) so the trigram indexes are actually used; add
trigram indexes for the household/company/tag search columns, or move search to the existing `idx_persons_fts`
full-text path. Validate with `EXPLAIN ANALYZE` before/after on a seeded large tenant.

### 3.4 `settings`-based hot lookups can't use the composite unique index — **Agent: Sonnet 5.0**

**Files:** `donations-webhook.route.ts:20`, `zapier.service.ts:149`, plus per-request tenant-setting reads
(e.g. `controller.ts:1768` `getTenantSetting`, `signIn` MFA check `:1011`).

The only `settings` index is `uq_settings_tenant_key UNIQUE (tenant_id, key)`. Lookups filtering by
`key` + `value` (webhook token, Zapier key) can't use it (leading column is `tenant_id`) → sequential scan
on every such request.

**Impact:** Seq scan on `settings` on every webhook/Zapier call and, at scale, contention as the table grows
across tenants.

**Fix:** If you keep secrets in `settings`, add a partial/covering index for the value-lookup keys (e.g. on
`(key, value)` limited to the relevant keys). Better: move API keys/webhook tokens to a dedicated hashed
table (ties into 2.4) and index by hash. Confirm `getTenantSetting`'s `(tenant_id, key)` path already uses
the unique index (it does).

### 3.5 Background worker processes exactly one job at a time — **Agent: Opus 4.8**

**File:** `apps/backend/src/app/lib/jobs/worker.ts:402-470`

The poll loop claims and runs a single job per cycle (`SELECT … FOR UPDATE SKIP LOCKED LIMIT 1`), awaits
it fully, then polls again. `activeJobsCount` is a shutdown counter, not real concurrency. Slow jobs
(email dispatch, MS/Google sync, imports) serialize the entire queue.

**Impact:** One slow tenant's sync/import stalls every other tenant's transactional email, form
notifications, and exports. Throughput is capped at one job at a time per process.

**Fix (design — Opus):** Introduce bounded concurrency (a worker pool of N claimers using
`SKIP LOCKED`), and/or separate queues/lanes so latency-sensitive mail isn't blocked behind long syncs.
The `SKIP LOCKED` claim already makes concurrent claiming safe. Keep the graceful-shutdown drain working.

### 3.6 Frontend IDB response cache uses a weak 32-bit hash for keys — **Agent: Sonnet 5.0**

**File:** `apps/frontend/src/app/services/api/trpc-service.ts:52-84`

`runCachedCall` builds an IndexedDB cache key from a 32-bit rolling string hash of
`JSON.stringify({apiName, ...options})`, and caches results for a day. A hash collision serves one query's
cached rows for a different query.

**Impact:** Rare but real: wrong cached list data surfaced across two different queries/filters; also a
full-day TTL can show stale lists after mutations.

**Fix:** Use the full serialized key (IndexedDB keys can be long strings) or a cryptographic digest;
consider invalidating the cache on the corresponding mutation instead of a blind 24h TTL.

---

## Phase 4 — Medium hardening (P2/P3) — **Agent: Sonnet 5.0 unless noted**

### 4.1 In-memory rate limiters don't survive restarts or scale horizontally

**Files:** `apps/backend/src/app/lib/rate-limiter.ts` (module-global `Map`),
`web-forms/controller.ts:25` (module-global `Map`). Both reset on deploy and are per-process, so with more
than one backend instance the effective limit multiplies by the instance count. **(Opus if moving to a
shared store.)** Fix: back these with a shared store (Postgres or Redis) if you run more than one instance,
or document the single-instance assumption.

### 4.2 `NODE_ENV`-gated dev shortcuts fail open if `NODE_ENV` is unset

**Files:** `web-forms-public.route.ts:458` (`/success` mock-donation writer),
`donations-webhook.route.ts:59-66` (mock unsigned webhook parse). Both treat "not production" as
"dev/allowed". If `NODE_ENV` is ever unset in a real deploy, these accept attacker-controlled donation
data. Fix: require an explicit positive opt-in (e.g. `ALLOW_MOCK_PAYMENTS=true`) rather than
`NODE_ENV !== 'production'` for money-touching paths.

### 4.3 `isAuthed` re-queries `authusers` on every request

**File:** `trpc.ts:88-107`. One extra round-trip per authed request for `role`/`verified`. Acceptable, but
once 1.1 adds a session check, fetch role + session validity in a single query (join `sessions` ↔
`authusers`) instead of two. _(1.1 deliberately kept the session check as a **separate** query rather than a
join, so it reuses the `selectFrom→select→where→executeTakeFirst` mock shape in ~15 existing router specs
without touching them. Collapsing the two lookups into one join is still open here and would require adding
`innerJoin` to those mocks.)_

### 4.4 CORS options spread can override the intended origin

**File:** `fastify.server.ts:41` — `register(cors, { origin: env.appUrl, ...opts })`. The `...opts` spread
comes after `origin`, so a caller-supplied `opts.origin` wins. Harmless with the default `{}`, but a
foot-gun. Fix: spread `opts` first, then force `origin: env.appUrl`, or validate `opts`.

### 4.5 Global BigInt reply serializer replaces Fastify's fast JSON path

**File:** `fastify.server.ts:33-35`. A custom `setReplySerializer` doing `JSON.stringify` with a replacer
runs for every REST reply. Minor CPU cost and it disables schema-based serialization. Fix: scope BigInt
handling to the routes that actually emit BigInt, or convert at the query layer.

### 4.6 `pino-pretty` transport configured unconditionally

**File:** `fastify.server.ts:19-30`. `pino-pretty` is a dev formatter and is expensive/blocking in
production. Fix: use pretty only when not production; emit JSON logs in prod.

### 4.7 `email` is globally UNIQUE across all tenants

**File:** schema `authusers_email_key UNIQUE (email)`; `signIn` (`controller.ts:995`) looks up by email
with no tenant. This means one email address can belong to exactly one tenant — a person can't be a member
of two orgs. Confirm this is the intended product constraint; if not, it's a schema-level design change
(**Opus**). Document either way.

---

## Phase 5 — Low / polish (P3) — **Agent: Sonnet 5.0**

- **5.1 `tests` scratch files shipped in `src`:** `apps/backend/src/test-kysely.ts`,
  `test-assign3.ts`, `test-assign4.ts`, `scratch/test-tasks.ts` — remove or move out of the build root.
- **5.2 `error.message` echoed to public form clients:** `web-forms-public.route.ts:554-562` renders raw
  `err.message` into the error page. Return generic copy; log the detail server-side (consistent with the
  tRPC sanitization boundary).
- **5.3 `parseJwt` in the client trusts `exp` only for scheduling** (`trpc-refreshlink.ts:85-106`) — fine,
  but note it never verifies signature (correct — server does). No action; documented so a future reader
  doesn't "fix" it into a vuln.
- **5.4 `as any` clusters** in `trpc.ts` error formatter and `base.repo.ts` reduce type safety at the
  security boundary. Tighten where practical without suppressing the tenant-safety lint.

---

## Critical files (quick index)

| Area                          | File                                                                                                 |
| ----------------------------- | ---------------------------------------------------------------------------------------------------- |
| Auth middleware / session gap | `apps/backend/src/trpc.ts`, `apps/backend/src/context.ts`                                            |
| Auth controller               | `apps/backend/src/app/modules/auth/controller.ts`                                                    |
| Tokens (backend)              | `apps/backend/src/app/modules/auth/auth-tokens.ts`, `lib/token-hash.ts`, `lib/signed-download.ts`    |
| REST routes (bypass surface)  | `apps/backend/src/app/modules/**/routes/*.route.ts`                                                  |
| Public forms                  | `apps/backend/src/app/modules/web-forms/routes/web-forms-public.route.ts`, `web-forms/controller.ts` |
| CSV / export                  | `apps/backend/src/app/lib/csv.ts`, `lib/base.controller.ts`, `modules/exports/…`                     |
| List/count base               | `apps/backend/src/app/lib/base.repo.ts`, `lib/crud-router.ts`                                        |
| Person search                 | `apps/backend/src/app/modules/persons/repositories/persons.repo.ts`                                  |
| Background worker             | `apps/backend/src/app/lib/jobs/worker.ts`                                                            |
| Server config / headers       | `apps/backend/src/fastify.server.ts`                                                                 |
| Tokens (frontend)             | `apps/frontend/src/app/services/api/token-service.ts`, `trpc-refreshlink.ts`, `trpc-service.ts`      |
| Grid rendering                | `apps/frontend/src/app/shared/components/datagrid/datagrid.{ts,html}`                                |

---

## Verification

Run after **each** item (see `pplcrm-quality-gate` — both are required):

```bash
npx prettier --write .
npx eslint <changed-files> --report-unused-disable-directives-severity=off
npx nx lint backend      # tenant-safety rule; and: npx nx lint frontend
npx nx build backend && npx nx build frontend
npx nx test backend && npx nx test frontend
```

Targeted end-to-end checks per phase:

- **1.1 session revocation:** sign in (get token) → in another session call `signOut` / `pauseTenant` →
  the first token's next authed tRPC call must now 401 immediately, not after 30 min. Add a backend test
  asserting a deleted session invalidates the access token.
- **1.2 viewer REST guard:** as a `viewer`, `POST /api/emails/send` must 403. Add a test.
- **1.3 attachment token:** confirm attachment/inline-image URLs carry a scoped token, not a session JWT;
  the old `?token=<session jwt>` form must be rejected.
- **1.4 XFF:** submit the public form >5×/min varying `X-Forwarded-For`; the 6th must 429. Test it.
- **1.5 CSV injection:** submit a public form with `first_name = =HYPERLINK("http://evil","x")`, export
  the entity, assert the CSV cell is prefixed/neutralized. Add a `csv.spec.ts` case.
- **2.2 headers:** `curl -I` the API and a public form page; assert CSP, `X-Content-Type-Options`,
  `frame-ancestors`, HSTS present; confirm the SPA and public form embed still load (fonts, iframe).
- **2.3 count:** hit a base-crud entity's `getAllWithCounts` with a small page size against a table with
  more rows; assert `count` equals the true total, not the page size. Add a repo test.
- **3.1 grid perf:** open a large list, profile; DOMPurify should no longer run on every CD pass.
- **3.3 search:** `EXPLAIN ANALYZE` the person search before/after on a seeded large tenant; confirm index
  usage and lower cost.
- **3.5 worker concurrency:** enqueue one slow job + several fast mail jobs; confirm mail is no longer
  blocked behind the slow job.

Use the `verify` skill to drive the affected flow in the real app for anything with a runtime surface
(auth, forms, grid, export) rather than relying on tests alone.
