---
name: pplcrm-trpc-backend
description: "How PeopleCRM builds tRPC backend endpoints: procedure/router/controller/repo layering, throwing AppError subclasses (not raw TRPCError), the error-sanitization boundary, Kysely transactions via repo.transaction(), and the background_jobs transactional-outbox pattern. USE WHEN adding or changing a backend endpoint, wiring a tRPC procedure, deciding which error to throw, wrapping a multi-table write in a transaction, or enqueuing background work. EXAMPLES: 'add a tRPC procedure to the teams router', 'this mutation needs to update two tables atomically', 'which TRPCError code should I throw for a duplicate name', 'how do I send an email from a mutation without a ghost job', 'add a backend endpoint that returns the team by id'."
---

# tRPC Backend Endpoints (PeopleCRM)

## The layering — 4 files, not 1

A backend feature is split across a module folder `apps/backend/src/app/modules/<name>/` (see `teams/`):

- `trpc.router.ts` — thin. Declares procedures, attaches Zod input, delegates to the controller. No business logic.
- `controller.ts` — business logic, validation, transactions. Extends `BaseController`.
- `repositories/*.repo.ts` — Kysely queries. Extends `BaseRepository`.

Routers are composed into the **root tRPC router** in `apps/backend/src/app/modules/trpc.ts` (`export const trpcRouter = router({ ... teams: TeamsRouter ... })`, trpc.ts:34,45). Do **not** register tRPC routers in `apps/backend/src/app/routes.ts` — that file is only for public REST/webhook routes (Stripe, OAuth callbacks, file downloads).

### Router skeleton (abridged from the real `teams/trpc.router.ts` — read that file for the full version)

```ts
import { z } from 'zod';

import { AddTeamObj, UpdateTeamObj, idSchema } from '../../../../../../libs/common/src';
import { authProcedure, router } from '../../../trpc';
import { TeamsController } from './controller';

const controller = new TeamsController();

function add() {
  return authProcedure.input(AddTeamObj).mutation(({ ctx, input }) => controller.addTeam(ctx.auth, input));
}
function update() {
  return authProcedure
    .input(z.object({ id: idSchema, data: UpdateTeamObj }))
    .mutation(({ ctx, input }) => controller.updateTeam(ctx.auth, input.id, input.data));
}

export const TeamsRouter = router({ add: add(), update: update() /* getAll, getById, delete ... */ });
```

- **Pick the right procedure builder** (all from `apps/backend/src/trpc.ts`): `publicProcedure` (no auth), `authProcedure` (requires `ctx.auth`; also blocks `viewer` role from mutations, trpc.ts:110-122), `adminOrOwnerProcedure` (admin/owner only, trpc.ts:134-143). Almost everything uses `authProcedure`.
- `ctx.auth` (`IAuthKeyPayload`) carries `tenant_id`, `user_id`, `role`. Pass it into the controller; every query must be scoped by `tenant_id` — that is `pplcrm-tenant-safety`'s territory, not repeated here.
- `.query()` for reads, `.mutation()` for writes. `.input(...)` takes a Zod schema — schema conventions (the `AddXObj`/`UpdateXObj` triad from `@common`) belong to `pplcrm-schemas-validation`; here just know the parsed, typed value arrives as `input`.

## Errors: throw AppError subclasses, not raw TRPCError

Every procedure is wrapped by `errorMappingMiddleware` (trpc.ts:69-75), which catches whatever you throw and runs it through `toTRPCError` (`apps/backend/src/app/errors/to-trpc-errors.ts`). So in controllers/services, throw the semantic classes from `apps/backend/src/app/errors/app-errors.ts` — they carry the HTTP status that maps to the tRPC code:

| Throw (app-errors.ts)                    | HTTP | tRPC code (to-trpc-errors.ts) |
| ---------------------------------------- | ---- | ----------------------------- |
| `BadRequestError`                        | 400  | `BAD_REQUEST`                 |
| `UnauthorizedError`                      | 401  | `UNAUTHORIZED`                |
| `ForbiddenError`                         | 403  | `FORBIDDEN`                   |
| `NotFoundError`                          | 404  | `NOT_FOUND`                   |
| `ConflictError`                          | 409  | `CONFLICT`                    |
| `PreconditionFailedError`                | 412  | `PRECONDITION_FAILED`         |
| `TooManyRequestsError`                   | 429  | `TOO_MANY_REQUESTS`           |
| `InternalError` / `ServerMisconfigError` | 500  | `INTERNAL_SERVER_ERROR`       |

By actual usage, the codes thrown across `modules/**` are dominated by `BAD_REQUEST`, `NOT_FOUND`, and `INTERNAL_SERVER_ERROR`, then `TOO_MANY_REQUESTS`, `FORBIDDEN`, `CONFLICT`, `UNAUTHORIZED` (grep `code: '...'` over `modules/`).

Real example, `teams/controller.ts:37,43,57`:

```ts
if (volunteers.length !== volunteerIds.length) throw new BadRequestError('Volunteers must have the Volunteer tag');
...
if (!created) throw new NotFoundError('Failed to create team');
```

Raw `new TRPCError({ code, message })` is also acceptable and is used directly in the auth/permission middleware (trpc.ts:87,117,137) and in some controllers (e.g. `donations/controller.ts:117`). Prefer the `AppError` subclass in domain code — it keeps controllers transport-agnostic and testable. `toTRPCError` passes an already-thrown `TRPCError` through untouched (to-trpc-errors.ts:6).

### The sanitization boundary (what actually happens)

`toTRPCError` is the leak guard. For an **unknown/unexpected** throw it returns the fixed message `'Something went wrong, please try again'` with `INTERNAL_SERVER_ERROR` and never exposes the raw error (to-trpc-errors.ts:47-59). Only when `NODE_ENV !== 'production'` does it append `(Cause: ...)`. Separately, the tRPC `errorFormatter` logs the full error and its cause server-side via **Pino** (`apps/backend/src/app/logger.ts`) before the sanitized shape goes out (trpc.ts:15-18).

**Honest caveat on `correlationId`:** CLAUDE.md describes a `correlationId` + Pino sanitization pattern, but in the current code a correlationId is **only** generated in the background-job worker for permanently-failed syncs, not in the tRPC request path. Real example, `lib/jobs/worker.ts:568-579`:

```ts
const correlationId = Math.random().toString(36).slice(2, 10).toUpperCase();
logger.error({ err, correlationId, userId: payload.userId }, 'MS sync permanently failed');
...
await oauthSvc.recordSyncError(payload.userId, `Sync failed — support code: ${correlationId}`);
```

That is the pattern to copy if you need a user-facing support code: log the full error + code with Pino, surface only the code. The tRPC path today sanitizes by generic message only (no id). Don't claim a correlationId round-trips through tRPC — it doesn't yet.

## Insert/Update payload types: use `OperationDataType`, not hand-rolled interfaces

The repo doesn't take Kysely's `Insertable`/`Updateable` directly — it wraps them as `OperationDataType<T, 'insert' | 'update'>` (defined in `libs/common/src/lib/kysely.models.ts:109-140`):

```ts
insert: Insertable<Models[K]> & { tenant_id: string }; // tenant_id is mandatory on inserts
update: Updateable<Models[K]>;
```

`BaseRepository.add({ row })` / `.addMany({ rows })` / `.update({ tenant_id, id, row })` all take these (base.repo.ts:74,83,264). Build the row and assert the shape, as in `teams/controller.ts:46-54`:

```ts
const row = { tenant_id: auth.tenant_id, name: input.name, createdby_id: auth.user_id, updatedby_id: auth.user_id }
  as OperationDataType<'teams', 'insert'>;
const created = await repo.add({ row }, trx);
```

## Transactions: `repo.transaction().execute(async (trx) => …)`

`BaseRepository.transaction()` returns the Kysely transaction builder (base.repo.ts:260). Wrap **every multi-table write** in one and thread the `trx` through all repo calls and nested-repo calls so they enlist in the same transaction. Repo methods take an optional trailing `trx?: Transaction<Models>`.

Real multi-table write, `teams/controller.ts:30-124` (`addTeam` — inserts the team, its volunteer mappings, its list mappings, and the volunteer tag, all atomically):

```ts
return repo.transaction().execute(async (trx) => {
  await this.ensureVolunteerTag(auth.tenant_id, volunteerIds, auth.user_id, trx);
  const created = await repo.add({ row }, trx);
  await this.mapRepo.replaceVolunteers(
    {
      /* ... */
    },
    trx,
  );
  await this.mapListsRepo.replaceLists(
    {
      /* ... */
    },
    trx,
  );
  return {
    /* assembled DTO */
  };
});
```

Throwing an `AppError` inside the callback (e.g. line 37) rolls the whole transaction back. `updateTeam` (controller.ts:225-356) is the same shape for updates.

## Transactional outbox: enqueue jobs inside the same trx

Heavy/async work (email, syncs) is not done inline — it's queued into the `background_jobs` table **inside the business transaction**, so a rollback also discards the job (no ghost jobs). `TransactionalMailService.enqueueMail(options, trx)` does the insert (`lib/mail/transactional-mail.service.ts:192-211`); pass it the same `trx`.

Real call site, `modules/auth/controller.ts:118-134` (`cancelAccountDeletion` — clears a column on `authusers` AND queues the confirmation email in one transaction):

```ts
await this.getRepo()
  .transaction()
  .execute(async (trx) => {
    await trx.updateTable('authusers').set({ deletion_scheduled_at: null }).where('id', '=', authUser.id).execute();
    await this.mailService.enqueueMail(
      { to: authUser.email, tenant_id: auth.tenant_id, subject: '...', text: '...', html: '...' },
      trx,
    );
  });
```

A separate worker (`lib/jobs/worker.ts`) polls `background_jobs` (and LISTENs on `background_jobs_channel`) and runs the handlers. You only insert; you don't run the work in the request. Other outbox producers: `modules/auth/controller.ts:91`, `modules/settings/controller.ts:179`, `lib/jobs/handlers/**`.

## Non-goals — owned by other skills

- **Tenant scoping** (every query `.where('tenant_id', ...)`, the `no-unscoped-db-query` lint rule): `pplcrm-tenant-safety`.
- **Zod schema conventions** (`AddXObj`/`UpdateXObj`/`XObj`, `@common` helpers): `pplcrm-schemas-validation`.
- **Migrations / schema changes** for new tables: `pplcrm-migrations`.
- **Scaffolding a whole new entity** end-to-end (schema→migration→router→frontend): `pplcrm-add-entity` — this skill is the tRPC-layer detail it links to.
- **Lint/commit gate** (`no-floating-promises`, `no-misused-promises`, nx-lint vs pre-commit): `pplcrm-quality-gate`. After changes, run `/verify` then the quality gate.
