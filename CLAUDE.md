<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

# Claude Code Automation Rules

- When executing Bash commands, always append silent flags (e.g., `git status -s`, `npm install --silent`).
- Minimize printing verbose tool execution details in your text responses.
- Combine necessary steps into concise compound scripts to reduce terminal output spam.

## General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax

<!-- nx configuration end-->

---

# PeopleCRM Project Standards

## 0. Skill Library — check here before re-deriving anything

Project-specific how-tos live in `.claude/skills/<name>/SKILL.md`. If one exists for your task, read it first — it already has the verified file paths, commands, and examples so you don't have to re-grep the codebase from scratch:

- `pplcrm-add-entity` — scaffolding a new CRUD entity end-to-end (schema → backend module → frontend experience)
- `pplcrm-campaigns` — the Campaigns feature (§15): office/election contexts, shared rolodex vs campaign-scoped facts (`campaign_person_facts`, `campaign_subscriptions`, `email_suppressions`, DNC flag), the context switcher, domain scoping via `options.campaignId`, archive/carry-over rules
- `pplcrm-trpc-backend` — tRPC/Fastify/Kysely conventions, error handling, transactions, background jobs
- `pplcrm-tenant-safety` — multi-tenant query scoping and the `local/no-unscoped-db-query` rule
- `pplcrm-migrations` — writing/applying DB migrations, `schema.sql` baseline
- `pplcrm-angular-components` — signals, the `form()` helper, loading gate, icons
- `pplcrm-datagrid` — the house-built `pc-datagrid`: DI contract, columns, inline edit, selection, grid→detail handoff, test traps
- `pplcrm-table` — the lighter `pc-table` presentational shell for bespoke (non-grid) tables, and the shared `.pc-table` token contract in `styles.css` that both it and the datagrid obey (header/density/shell). Read before hand-rolling any `<table>`
- `pplcrm-design-principles` — the app-wide UI/UX doctrine: three orientation questions, disclosure over suppression, guide-don't-error, semantic tokens, one-idiom-per-job, DaisyUI-first/CSS-over-JS, subtle purposeful motion. **Read before designing or reviewing any UI.**
- `pplcrm-page-layout-ux` — detail-layout/header/breadcrumbs/record-navigation/activity-log/toasts/dialogs composition
- `pplcrm-forms` — the North Star "living funnel" Forms experience: web_forms lifecycle, `normForm()` email invariant + templates, browse/live-edit page, `form_submissions`, the cross-tenant public `/f/:slug` page, and why donation forms stay separate
- `pplcrm-deliveries` — the Deliveries feature (§14): yard-sign requests → pure-preview route planning → volunteer routes, the three `delivery_*` tables and the "routed is derived" invariant, the pure routing engine, the tokenized public `/r/:token` volunteer page, and honest activity attribution
- `pplcrm-quality-gate` — the exact pre-commit-equivalent lint/build/test pipeline
- `pplcrm-debugging` — tracing a bug end-to-end (correlationId → Pino → tRPC → Kysely → signals)
- `pplcrm-schemas-validation` — the Zod schema triad (`AddXObj`/`UpdateXObj`/`XObj`) and `core.schema` helpers
- `pplcrm-testing` — Vitest conventions and the spec-file lint gap

If none exists for a recurring task you had to figure out the hard way, write one — don't just solve it and move on.

If a change you make invalidates an existing skill (a path it names, a flow it describes, a command it gives), update that skill in the same change — a stale skill is worse than none, because it's trusted.

## 1. Repository Structure & Imports

**Monorepo layout — keep logic in its layer:**

| Path               | Purpose                                   |
| ------------------ | ----------------------------------------- |
| `apps/frontend/`   | Angular SPA                               |
| `apps/backend/`    | Fastify 5 + tRPC backend                  |
| `libs/common/src/` | Shared types, DB definitions, Zod schemas |
| `libs/uxcommon/`   | Generic shared UI controls                |

**Path aliases** (defined in `tsconfig.base.json`) — never use relative paths across package boundaries:

| Alias            | Resolves to                            |
| ---------------- | -------------------------------------- |
| `@common`        | `libs/common/src/index.ts`             |
| `@uxcommon/*`    | `libs/uxcommon/src/*`                  |
| `@icons/*`       | `libs/uxcommon/src/components/icons/*` |
| `@experiences/*` | `apps/frontend/src/app/experiences/*`  |

**Supplementary codebase maps:**

- Backend: `apps/backend/STRUCTURE.md`
- Frontend: `apps/frontend/STRUCTURE.md`
- Libs: `apps/libs/STRUCTURE.md`

---

## 2. TypeScript Standards (Applies to All Code)

These rules are strict and enforced by ESLint. Violations must be fixed, not suppressed.

### Type Safety

- **No `as any`** — never cast to `any`. Use `unknown` for external/untyped data and narrow it explicitly with type guards or Zod parsing.
- **No `as T` type assertions** unless provably safe and unavoidable. Prefer a type guard function that returns `value is T` instead.
- **No `// @ts-ignore` or `// @ts-expect-error`** — fix the underlying issue. If a third-party type is wrong, patch it with a `.d.ts` declaration file.
- **No non-null assertions (`!`)** unless the value is provably non-null at that callsite (e.g., after an explicit `if` check). If you must use `!`, add a comment explaining why.
- **No boxed primitives** — never use `Object`, `Function`, `Boolean`, `Number`, `String` as types. Use `object`, `() => void`, `boolean`, `number`, `string`.
- **No implicit `any`** — every function parameter must have an explicit type. Return types must be explicit on all exported and public functions.
- **Use `unknown` over `any`** for data arriving from outside the module boundary (API responses before Zod parsing, `catch` clause bindings, `JSON.parse` results).
- **Use `as const`** for literal values that must not widen (e.g., `const STATUS = ['active', 'inactive'] as const`).

### `null` vs `undefined` (applies to new code and code you're editing — no retroactive sweeps)

- **`null` = intentional absence in data** — DB columns, API payloads, Zod schemas. (Kysely/Postgres already give you this.)
- **`undefined` = absence in code** — optional function params, optional object properties, uninitialized signals. Don't write `foo: string | null` on a type that never touches the DB or the wire.
- **Checking:** `value == null` (loose equality — the one legitimate use of `==`) catches both and is the idiomatic guard at seams where either could appear.

### Async & Promises

- **No floating promises.** Every `Promise` must be one of:
  - `await`-ed inside an `async` function, or
  - ended with `.catch(handler)`, or
  - ended with `.then(onFulfilled, onRejected)`, or
  - explicitly suppressed with the `void` operator when fire-and-forget is intentional.
- **No `async` functions that never `await`** — remove `async` if nothing is awaited.
- **Prefer `async/await` over raw `.then()` chains** for readability.

### Control Flow & Exhaustiveness

- **Exhaustive `switch` on discriminated unions** — add a `default` branch that assigns to `never` to catch unhandled cases at compile time:
  ```ts
  const _exhaustive: never = someUnion; // compile error if a case is missed
  ```
- **Model state with discriminated unions**, not bags of optional properties. Prefer `{ status: 'loading' } | { status: 'success'; data: T } | { status: 'error'; error: string }` over `{ loading?: boolean; data?: T; error?: string }`.

### Naming & Structure

- **Prefer `const` over `let`** — only use `let` when reassignment is necessary.
- **No magic numbers or strings** — extract to named constants.
- **No unused variables or imports** — ESLint enforces this; fix, don't suppress.

---

## 3. Backend Standards (Fastify 5 + tRPC + Kysely)

### API Endpoints

- **tRPC First:** Expose all internal client-server endpoints via tRPC routers to maintain end-to-end type safety.
- **Fastify REST:** Only use standard Fastify REST routes for external webhooks, file binary downloads/uploads, or when REST is explicitly required.
- **Error Handling:** Throw standard `TRPCError` instances (e.g., `BAD_REQUEST`, `NOT_FOUND`). Never leak DB errors or stack traces to the client.
- **`UNAUTHORIZED` means "not signed in", never "not allowed":** The client force-signs-the-user-out on any `UNAUTHORIZED` (401), even on `skipErrorHandler` calls. Use it **only** for authentication/session failures (missing/invalid/expired token or session, bad credentials). Every role/permission/ownership denial is `FORBIDDEN` (403) — throwing `UNAUTHORIZED` there logs the user out instead of saying "you don't have permission". See `pplcrm-trpc-backend`.

### Type-Safe Database Access (Kysely)

- **Native Typing:** Use Kysely's `Insertable<T>` and `Updateable<T>` utility types for insert/update payloads — do not hand-roll equivalent interfaces.
- **Intentional Retrieval:** Use `.returning('id')` or `.returningAll()` only when subsequent logic requires the returned data. Avoid over-fetching.
- **Transactions:** Wrap all multi-table writes in a Kysely transaction for ACID compliance.
- **Tenant Scoping:** Every `selectFrom`/`updateTable`/`deleteFrom` chain must include a `.where('tenant_id', ...)` filter before executing — this is a cross-tenant data leak otherwise, and it's enforced by the custom `local/no-unscoped-db-query` ESLint rule (`tools/eslint-rules/rules/no-unscoped-db-query.cjs`). See `pplcrm-tenant-safety` for the intentional-exceptions list.

### Background Jobs

- **Transactional Outbox:** Queue heavy tasks (SMTP, syncs, file cleanup) by inserting into `background_jobs` _inside_ the same DB transaction as the triggering business logic. This guarantees atomicity — no ghost jobs on rollback.

### Security, Hardening & Observability

- **Input Validation:** All tRPC procedure inputs are validated with Zod at the boundary.
- **Error Sanitization:** tRPC errors are mapped through `toTRPCError`/`errorFormatter` and only a generic safe message reaches the client in production — never the raw error or stack trace. The `correlationId` pattern (generate one, log it with Pino, return it to the client) is currently implemented in the background-job worker (`lib/jobs/worker.ts`), not yet on the tRPC request path — see `pplcrm-debugging` before assuming a client-visible tRPC error carries one.

---

## 4. Frontend Standards (Angular 22 + TailwindCSS v4 + DaisyUI v5)

### Angular Patterns

- **Signals Everywhere:** Use `signal()`, `computed()`, `effect()`, `input.required()`, `output()`, `viewChild()` for all state, inputs, outputs, derivations, effects, and DOM queries.
- **Prefer Signals over RxJS for state.** Do not use `Subject`, `BehaviorSubject`, or manual subscriptions for state. RxJS is acceptable only where Angular requires it (`HttpClient`, `ActivatedRoute`) or for true push-based event streams.
- **Dependency Injection:** Use `inject()` at the class field level. Do not inject via the constructor.
- **Modern Control Flow:** Use `@if`, `@for`, `@switch`, `@empty`. Do not use `*ngIf`, `*ngFor`, or `*ngSwitch`.

### Forms

This project uses Angular's experimental signal-forms API (`form`, `required`, `email`, `disabled`, etc. imported from `@angular/forms/signals`) — not `ReactiveFormsModule` or `ngModel`:

- Wrap payloads: `form(payload, (p) => { ... })`.
- Bind fields via `[formField]`.
- Check validity with `.invalid()`.
- Use built-in signal validators (`required`, `pattern`).

### Icons

- Component: `<pc-icon name="...">` — `name` must be a valid `PcIconNameType` value.
- Size: use the `[size]` input with a **whole integer only** (e.g., `[size]="4"`). Do not use width/height CSS utilities on `<pc-icon>`. Do not use decimals (e.g., `[size]="3.5"` is invalid).

### Loading States

- Wrap all async tRPC calls in `createLoadingGate()` to suppress spinner flicker on sub-300ms responses.
- Pattern:
  ```ts
  const end = this._loading.begin();
  try { await ... } finally { end(); }
  ```
- Use `@if (!detail())` for initial skeleton guards (prevents FOUC). Use `loading()` signal to disable buttons during in-progress actions.

### UX Requirements

- **Activity Log:** Every component that modifies data must include `<pc-record-activities [entity]="..." [entityId]="...">` at the bottom.
- **Toasts:** Use `AlertService.showSuccess()` / `AlertService.showError()` for all user feedback. Do not use `window.alert` or custom inline banners.
- **Dialogs:** Use the project dialog component for confirmation prompts — not the browser dialog and not the alert toast.
- **Help Center (keep in sync):** Whenever you add a new user-facing feature or materially change an existing one (new flow, renamed/moved UI, changed shortcut or behavior), update the in-app Help Center in the same change — do not leave it for later. Articles are typed TypeScript data in `apps/frontend/src/app/experiences/help/data/articles/*.ts` (one file per category, aggregated in `help-content.ts`); add or edit the relevant article and its `related`/link references. The integrity spec (`data/help-content.spec.ts`) catches broken slugs/links but **not** stale prose, so re-read the affected articles yourself. Run `npx vitest run src/app/experiences/help` from `apps/frontend`. This applies to backend-driven features too if they change what the user sees or does. See the `pplcrm-add-entity` checklist for the per-entity step.

### Styling & Theming (Tailwind v4 + DaisyUI v5)

- **No `tailwind.config.js`:** Tailwind v4 is configured entirely via CSS `@theme` directive blocks. Do not create or look for a JS config file.
- **DaisyUI v5 semantic classes only:** Use `bg-primary`, `text-base-content`, `btn-secondary`, etc. Do not invent custom color utilities outside the theme.

---

## 5. Database Migrations

Read `pplcrm-migrations` before touching migrations — it owns the details. In short:

- **`apps/backend/src/app/_migrations/schema.sql` is the baseline** — a `pg_dump --schema-only` that `0001_baseline.ts` executes to initialize a fresh database. As of the 2026-07-10 pre-ship re-squash it reflects the **current** schema and there are no dated migrations on top of it. (Older `schema_dump.sql` references in the repo are stale — this is the real filename.)
- **New changes = new file.** For an ordinary schema change, add a new timestamped `apps/backend/src/app/_migrations/YYYY-MM-DD-description.ts` — do **not** regenerate `schema.sql`. Never modify a migration that has already been applied.
- **Deleting applied migrations / regenerating the baseline is allowed only as a deliberate pre-ship re-squash** (regenerate the dump, delete the dated files, reset `kysely_migration`, verify a from-scratch build all in one operation). It is safe only because nothing is shipped yet; once there's a production database, migrations become forward-only history again. See `pplcrm-migrations` → "Re-squashing".
- **Fresh databases need provisioning first** (`apps/backend/scripts/setup-db-roles.sql` as a superuser): the DB and `public` schema must be owned by `pplcrm_owner` or the baseline fails on extension creation / schema ownership.

---

## 6. Quality & Verification Pipeline

Before committing, run both of these on the files you changed — **neither one alone is sufficient**:

```bash
npx prettier --write .
npx eslint <changed-files> --report-unused-disable-directives-severity=off   # what the pre-commit hook runs
npx nx lint <project>                                                       # project-specific rules
npx nx build frontend && npx nx build backend
npx nx test frontend && npx nx test backend
```

**Why both are required:** the pre-commit hook (plain `eslint`, root config) and `nx lint <project>` (project-local config) enforce **disjoint rule sets** — the hook catches `no-floating-promises`/`no-misused-promises`, only `nx lint backend` catches the multi-tenant `local/no-unscoped-db-query` rule. A green run of one says nothing about the other. The full mechanism, the known pre-existing failures, and worked before/after fixes for the promise rules live in **`pplcrm-quality-gate`** — read it before your first commit in a session.

Never suppress a violation with a disable comment unless truly unavoidable — explain why inline when you do.
