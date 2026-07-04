---
name: pplcrm-add-entity
description: "Orchestrates adding a whole new CRUD record type across every layer of the pplcrm monorepo (Zod schema triad, DB migration, Kysely model, tRPC router, backend registration, frontend experience with list/detail/edit, breadcrumbs, activity log, tests) as one ordered checklist. USE WHEN adding a new CRUD entity/module/experience, scaffolding a new record type end-to-end, or wiring a new table all the way from Postgres to an Angular list+detail page. EXAMPLES: 'add a new Campaigns entity', 'scaffold a Projects module with a list and detail view', 'I need a new record type end to end', 'create a new experience for donors'."
---

# Add a new CRUD entity (end-to-end orchestration)

This is the **checklist that ties all the layers together**. Each individual layer has its own
deep-dive skill (see Non-goals) — this skill's job is the ordering and the easy-to-forget
registration points. Use `teams` as the canonical reference module throughout: it has a full
controller, repository, tRPC router, service, list grid, detail view, and edit form.

## Gotchas to internalize before you start

1. **tRPC routers are NOT registered in `routes.ts`.** `apps/backend/src/app/routes.ts` is
   Fastify **REST-only** (webhooks, OAuth callbacks, file downloads). Your new entity's router is
   registered in `apps/backend/src/app/modules/trpc.ts:34` (the `trpcRouter` object). Putting it in
   `routes.ts` does nothing.
2. **Three separate `libs/common` files must all be touched** for the type layer — miss one and the
   build breaks in a confusing place: the schema barrel (`lib/schema.ts`), the `z.infer` type
   aliases (`lib/models.ts`), and the Kysely `Models` interface + table interface
   (`lib/kysely.models.ts`).
3. **`modules/trpc.ts` — the `trpcRouter({...})` object (`:34-65`) is the registration that
   matters.** The re-export block below it (`:67-116`) is a convenience convention most routers
   follow, but it is not required for the endpoint to work (`ZapierRouter` is registered in the
   object yet absent from the re-exports).
4. **Every DB query must be tenant-scoped.** `BaseController`/`crud-router` inject `tenant_id`
   automatically, but any hand-written query you add is checked by the `no-unscoped-db-query`
   ESLint rule → see `pplcrm-tenant-safety`.

## Ordered checklist

### 1. Zod schema triad (`libs/common/src/lib/schemas/<entity>.schema.ts`)

Create `Add<Entity>Obj` and `Update<Entity>Obj` using the shared helpers from `core.schema`
(`nameSchema`, `descriptionSchema`, `idSchema`). Real example:
`libs/common/src/lib/schemas/teams.schema.ts:4` (`AddTeamObj`) and `:13` (`UpdateTeamObj`).
Then export it from the barrel: add `export * from './schemas/<entity>.schema';` to
`libs/common/src/lib/schema.ts:5`.
→ Deep dive on the triad, `.partial()` vs hand-written Update, `core.schema` helpers:
`pplcrm-schemas-validation`.

### 2. Inferred TS types (`libs/common/src/lib/models.ts`)

Add `export type Add<Entity>Type = z.infer<typeof Add<Entity>Obj>;` and the Update variant.
Real example: `libs/common/src/lib/models.ts:121` (`AddTeamType`) and `:131` (`UpdateTeamType`).

### 3. Kysely model (`libs/common/src/lib/kysely.models.ts`)

The header comment at `:5-6` states the rule: "When adding a new table … Add a model and add it to
the interface Models". Do both: define `interface <Entity> extends RecordType { ... }` (real
example `interface Teams` at `:242`) and add `<table>: <Entity>;` to the `Models` interface at
`:31` (see `teams: Teams;` at `:42`). Junction/mapping tables use `extends JunctionRecordType`
(`interface MapTeamsPersons` at `:249`).

### 4. Migration (`apps/backend/src/app/_migrations/YYYY-MM-DD-<description>.ts`)

New timestamped file exporting `up(db)` and `down(db)`. Real example:
`apps/backend/src/app/_migrations/2026-06-27-person-opt-in.ts` (uses ``sql`...`.execute(db)``).
Never edit an already-applied migration.
→ Naming convention, the `schema.sql` baseline, the runner: `pplcrm-migrations`.

### 5. Backend module (`apps/backend/src/app/modules/<entity>/`)

- **Repository**: `repositories/<entity>.repo.ts` — `class <Entity>Repo extends BaseRepository<'<table>'>`
  with `super('<table>')`. Real example: `modules/teams/repositories/teams.repo.ts:9,13`.
- **Controller**: `controller.ts` — `class <Entity>Controller extends BaseController<'<table>', <Entity>Repo>`.
  Real example: `modules/teams/controller.ts:18` (and `tags/controller.ts:8`).
- **tRPC router**: `trpc.router.ts`. Two patterns exist:
  - Explicit procedures (`teams/trpc.router.ts:42` — `getAll`/`getById`/`add`/`update`/`delete`
    wired to `authProcedure`), OR
  - `createCrudRouter(controller, Add<Entity>Obj, Update<Entity>Obj)` for standard CRUD, then spread
    it: real example `tags/trpc.router.ts:10-15` using `apps/backend/src/app/lib/crud-router.ts:6`.
    `crud-router` already injects `tenant_id`/`createdby_id`/`updatedby_id` from `ctx.auth`
    (`crud-router.ts:21-28`).
    → TRPCError codes, correlationId+Pino sanitization, transactions, transactional outbox:
    `pplcrm-trpc-backend`.

### 6. Register the router (`apps/backend/src/app/modules/trpc.ts`)

Import it and add `<table>: <Entity>Router,` to the `trpcRouter` object (`:34-65`; see `teams:` at
`:45`) — this is what makes the endpoint callable and type-safe from the frontend. Optionally also
add it to the convenience re-export block (`:67-116`; see `:86`) to match most existing routers.

### 7. Frontend service (`apps/frontend/src/app/experiences/<entity>/services/<entity>-service.ts`)

`@Service() class <Entity>Service extends AbstractAPIService<'<table>', Update<Entity>Type>` with
`endpointName = '<table>'`. Derive row/detail types from `RouterOutputs` rather than re-declaring:
`export type <Entity>Detail = RouterOutputs['<table>']['getById'];`. Real example:
`experiences/teams/services/teams-service.ts:13-19`.

### 8. Frontend experience UI (`apps/frontend/src/app/experiences/<entity>/ui/`)

Mirror teams:

- List grid: `<entity>-grid.ts` (real: `teams/ui/teams-grid.ts` — provides the service via
  `{ provide: AbstractAPIService, useExisting: <Entity>Service }` at `teams-grid.ts:30`).
- Detail view: `<entity>-view.ts` + `.html` (real: `teams/ui/team-view.ts`, `team-view.html`).
- Edit/add form: `<entity>-form.ts` + `.html` (real: `teams/ui/team-form.ts`). Uses Angular's
  signal-forms `form()` from `@angular/forms/signals` (not a project-internal helper) →
  `pplcrm-angular-components`.

### 9. Route wiring (`apps/frontend/src/app/dashboard.routes.ts`)

Add a route block with children: `''` → grid, `'add'` → form, `':id'` → view, `':id/edit'` → form.
Real example: the `people` block at `dashboard.routes.ts:13-34` and `tags` at `:83`. (Top-level
`app.routes.ts` only lazy-loads the dashboard shell and auth pages — experiences live in
`dashboard.routes.ts`.)

### 10. Breadcrumbs (in the detail view component)

Expose a `computed<PcBreadcrumb[]>` and bind it to `[crumbs]` on `<pc-detail-layout>`. Real example:
`team-view.ts:59-62` (the `crumbs` computed) bound at `team-view.html:4`.
→ Detail-layout composition, record prev/next nav, `AlertService` vs confirm-dialog:
`pplcrm-page-layout-ux`.

### 11. Activity log (MANDATORY for any data-modifying entity)

Every detail view must include `<pc-record-activities [entity]="'<table>'" [entityId]="id()!">`.
Real example: `team-view.html:94`. Import `RecordActivities` from
`@experiences/activity/ui/record-activities/record-activities` (`team-view.ts:4,26`).

### 12. Tests (co-located `*.spec.ts`, Vitest)

Spec files live next to source, not in a separate folder. Real examples:
`experiences/teams/ui/team-form.spec.ts`, `experiences/tags/services/tags-service.spec.ts`.
→ Runner specifics and the spec-file lint gap: `pplcrm-testing`.

### 13. Verify

Run `/verify`, then the quality gate before committing → `pplcrm-quality-gate`
(remember: green `nx lint` is necessary but not sufficient; run plain `eslint` on your changed
files, the same command the pre-commit hook uses).

## Non-goals — what this skill deliberately does NOT deep-dive

- tRPC procedure mechanics, TRPCError, Kysely transactions/outbox → **`pplcrm-trpc-backend`**
- The Zod `AddXObj`/`UpdateXObj`/`XObj` triad rationale and `core.schema` helpers → **`pplcrm-schemas-validation`**
- Detail-layout / breadcrumbs / record-nav composition and UX review rules → **`pplcrm-page-layout-ux`**
- Migration naming, the `schema.sql` baseline, the runner → **`pplcrm-migrations`**
- Tenant scoping and the `no-unscoped-db-query` rule → **`pplcrm-tenant-safety`**
- `form()` helper, signals, loading gate, `pc-icon` → **`pplcrm-angular-components`**
- Vitest specifics and the spec-file lint gap → **`pplcrm-testing`**
- Generating project scaffolding via Nx generators → global **`nx-generate`** (no per-entity
  generator exists here; entities are added by hand following this checklist)
