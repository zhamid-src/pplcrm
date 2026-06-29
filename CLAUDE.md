<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

## General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `npx nx build`, `npx exec nx test`) - avoids using globally installed CLI
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

### Type-Safe Database Access (Kysely)

- **Native Typing:** Use Kysely's `Insertable<T>` and `Updateable<T>` utility types for insert/update payloads — do not hand-roll equivalent interfaces.
- **Intentional Retrieval:** Use `.returning('id')` or `.returningAll()` only when subsequent logic requires the returned data. Avoid over-fetching.
- **Transactions:** Wrap all multi-table writes in a Kysely transaction for ACID compliance.

### Background Jobs

- **Transactional Outbox:** Queue heavy tasks (SMTP, syncs, file cleanup) by inserting into `background_jobs` _inside_ the same DB transaction as the triggering business logic. This guarantees atomicity — no ghost jobs on rollback.

### Security, Hardening & Observability

- **Input Validation:** All tRPC procedure inputs are validated with Zod at the boundary.
- **Error Sanitization:** On unhandled exceptions:
  1. Generate a unique `correlationId`.
  2. Log the full stack trace and request context to Pino using that `correlationId`.
  3. Return only the safe message + `correlationId` to the client — never the raw error.

---

## 4. Frontend Standards (Angular 22 + TailwindCSS v4 + DaisyUI v5)

### Angular Patterns

- **Signals Everywhere:** Use `signal()`, `computed()`, `effect()`, `input.required()`, `output()`, `viewChild()` for all state, inputs, outputs, derivations, effects, and DOM queries.
- **Prefer Signals over RxJS for state.** Do not use `Subject`, `BehaviorSubject`, or manual subscriptions for state. RxJS is acceptable only where Angular requires it (`HttpClient`, `ActivatedRoute`) or for true push-based event streams.
- **Dependency Injection:** Use `inject()` at the class field level. Do not inject via the constructor.
- **Modern Control Flow:** Use `@if`, `@for`, `@switch`, `@empty`. Do not use `*ngIf`, `*ngFor`, or `*ngSwitch`.

### Forms

This project uses an internal `form()` helper — not Angular's `ReactiveFormsModule` or `ngModel`:

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

### Styling & Theming (Tailwind v4 + DaisyUI v5)

- **No `tailwind.config.js`:** Tailwind v4 is configured entirely via CSS `@theme` directive blocks. Do not create or look for a JS config file.
- **DaisyUI v5 semantic classes only:** Use `bg-primary`, `text-base-content`, `btn-secondary`, etc. Do not invent custom color utilities outside the theme.

---

## 5. Database Migrations

- **Never delete applied migration files.** They are permanent history; deletion breaks the migration runner's state tracking.
- **`schema_dump.sql` is the baseline.** Update it with `pg_dump --schema-only` when the schema changes significantly. Do not add data (COPY/INSERT). The `0001_baseline.ts` migration uses this file to initialize fresh databases only.
- **New changes = new file.** Never modify a migration that has already been applied. Add a new timestamped file: `apps/backend/src/app/_migrations/YYYY-MM-DD-description.ts`.

---

## 6. Quality & Verification Pipeline

Before committing or opening a PR, run in order:

```bash
npx prettier --write .
npx nx lint frontend
npx nx lint backend
npx nx build frontend
npx nx build backend
npx nx test frontend
npx nx test backend
```

All lint errors and warnings must be resolved — do not suppress them with disable comments unless there is no alternative, and always explain why in an inline comment.
