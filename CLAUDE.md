<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

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

# PeopleCRM Project Standards

## Repository Structure & Imports

- **Monorepo Architecture (Nx)**: Keep logic separated:
  - `apps/frontend/` – Angular single-page application.
  - `apps/backend/` – Fastify 5 + tRPC backend.
  - `libs/common/src/` – Shared types, database definitions, and Zod validation schemas.
  - `libs/uxcommon` - Shared UI controls that are generic
- **Path Aliases**: Never use relative paths across package boundaries. Use TypeScript compiler aliases (defined in `tsconfig.base.json`):
  - `@common` → `libs/common/src/index.ts` — shared models & schemas.
  - `@uxcommon/*` → `libs/uxcommon/src/*` — frontend shared assets, components, and directives.
  - `@icons/*` → `libs/uxcommon/src/components/icons/*` — icon components.
  - `@experiences/*` → `apps/frontend/src/app/experiences/*` — feature domains.

## Backend Standards (Fastify 5 + tRPC + Kysely)

### General

- Never do 'as any', unless there's no way to avoid it.

### API Endpoints

- **tRPC First:** Expose all internal client-server endpoints via tRPC routers to maintain end-to-end type safety.
- **Fastify REST:** Only use standard Fastify REST routes for external webhooks, file binary downloads/uploads, or when REST is explicitly required.
- **Error Handling:** Throw standard `TRPCError` instances (e.g., `BAD_REQUEST`, `NOT_FOUND`) to return consistent error statuses to the client.

### Type-Safe Database Access (Kysely)

- **Native Typing:** Leverage Kysely's built-in `Insertable<T>` and `Updateable<T>` utility types for payload operations to minimize type boilerplate.
- **Intentional Retrieval:** Use `.returning('id')` or `.returningAll()` only when the immediate state retrieval is explicitly required by the subsequent business logic, avoiding unnecessary over-fetching.
- **Transactions:** Execute multi-table updates within database transactions to maintain ACID compliance and prevent orphaned records.

### Background Jobs

- **Transactional Outbox:** Offload heavy or long-running tasks (e.g., SMTP emails, syncs, file cleanups) to the background queue by inserting job payloads into the `background_jobs` table _inside_ database transactions. This guarantees jobs are only queued if the core business logic commits successfully.

### Security, Hardening & Observability

- **Input Validation:** Validate all inputs at the tRPC boundary using Zod to block malformed payloads and injection vulnerabilities.
- **Error Sanitization & Traceability:** Sanitize and scrub frontend error messages to prevent leakage of database schemas or stack traces.
  - Generate a unique `correlationId` for unhandled exceptions.
  - Send the sanitized message to the client containing only the safe message and the `correlationId`.
  - Log the full stack trace and request context to the backend logger (Pino) using that same `correlationId`.

## Frontend Standards (Angular 22 + TailwindCSS v4 + DaisyUI v5)

- **Signals Everywhere**: Use Angular Signals for all state, inputs, outputs, derivations, side effects, and DOM queries:
  - Use `signal()`, `computed()`, `effect()`, `input.required()`, `output()`, and `viewChild()`.
  - **Prefer Signals over RxJS for state management.** Do not use `Subject`, `BehaviorSubject`, or manual subscriptions for state. RxJS is acceptable only where Angular itself requires it (e.g., `HttpClient`, `ActivatedRoute` params) or for true push-based event streams.
- **Dependency Injection**: Use class-level `inject()` calls. Do not use standard class constructors for injection.
- **Modern Control Flow**: Use native Angular control flow syntax (`@if`, `@for`, `@switch`, `@empty`) instead of legacy structural directives (`*ngIf`, `*ngFor`).
- **Signal-Based Forms**: This project uses an internal `form()` helper (not a standard Angular package):
  - Wrap form payloads in `form(payload, (p) => { ... })`.
  - Bind fields via `[formField]` and evaluate validity using `.invalid()`. Use native signal validators like `required` and `pattern`.
- **Icons**:
  - Use `<pc-icon name="...">` (validated by `PcIconNameType`).
  - Do NOT use width/height utility classes on `<pc-icon>`. Use the `[size]` input instead (e.g., `[size]="4"`).
  - Use full integers with `<pc-icon [size]>` — do NOT use decimals (e.g., do NOT use `[size]="3.5"`).
- **Loading States (`createLoadingGate`)**:
  - Wrap all asynchronous API/tRPC requests in `createLoadingGate()` to prevent spinner flickering on fast loads (under 300ms).
  - Wrap async sequences in `const end = this._loading.begin(); try { ... } finally { end(); }`.
  - To prevent FOUC, check data existence (e.g., `@if (!detail())`) for initial skeletons; use the `loading()` signal for disabling buttons and subsequent progress indicators.
- **Activity & Audit Logs**: Every page or component that modifies data must display an integrated activity log at the bottom using `<pc-record-activities [entity]="..." [entityId]="...">`.
- **Toasts & Notifications**: Trigger user feedback alerts using `AlertService` (`.showSuccess()` / `.showError()`). Do not use raw window alerts or custom dialogs.
- **Dialogs**: Use the project dialog component for confirmation prompts, not the browser dialog or the alert toast.

### Styling & Theming (Tailwind v4 + DaisyUI v5)

- **No `tailwind.config.js`:** This project uses Tailwind v4. All configuration, custom utilities, and themes are declared via CSS variables using `@theme` directive blocks in your global CSS files. Do not attempt to modify or look for a JavaScript configuration file.
- **DaisyUI v5 Semantic Classes:** Use modern DaisyUI v5 color semantic utility classes (e.g., `bg-primary`, `text-base-content`, `btn-secondary`). Do not invent custom color utility classes outside the theme.

## Database Migrations

- **Never delete applied migration files.** Once a migration has been run against any environment, it is a permanent part of history. Deleting it will cause the migration runner to lose track of what has been applied.
- **`schema_dump.sql` is the baseline snapshot.** When the schema changes significantly, update `schema_dump.sql` using `pg_dump --schema-only`. The `0001_baseline.ts` migration uses this file to initialize a fresh database. Do not add data (COPY/INSERT) to it.
- **New changes always get a new migration file.** Never modify an existing migration that has already been applied. Add a new timestamped file instead (e.g., `apps/backend/src/app/_migrations/YYYY-MM-DD-description.ts`).
- **The baseline only runs on fresh databases.** On an existing database, Kysely will skip `0001_baseline` because it is already recorded in `kysely_migration`. Do not attempt to re-run or reset it.

## Quality & Verification Pipeline

- **ESLint & Formatting**: Run Prettier (`npx prettier --write`) and `nx lint` before committing. Ensure all local lint errors/warnings are resolved.
- **Before opening a PR**, verify compilation and tests pass:
  - `npx nx build frontend`
  - `npx nx build backend`
  - `npx nx test frontend`
  - `npx nx test backend`
  - `npx nx e2e frontend-e2e`

## Supplementary Codebase Maps

- For a comprehensive file and interface map of the backend, reference: `apps/backend/STRUCTURE.md`
- For a comprehensive file and interface map of the frontend, reference: `apps/frontend/STRUCTURE.md`
- For a comprehensive file and interface map of the libs, reference: `apps/libs/STRUCTURE.md`
