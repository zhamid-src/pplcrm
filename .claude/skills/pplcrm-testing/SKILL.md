---
name: pplcrm-testing
description: "Write and run Vitest unit tests in this repo, and understand why a spec can pass `nx lint` yet be rejected by the pre-commit hook. USE WHEN adding or editing a `*.spec.ts`, running project tests, mocking with `vi.spyOn`/`vi.fn`, or debugging a spec that lints clean under nx but fails on commit. EXAMPLES: 'write a test for the tasks router', 'add a vitest spec for this component', 'my spec passes nx lint but the commit hook rejects it', 'how do I run just one test file', 'mock the mail service in a backend test'."
---

# Testing in PeopleCRM (Vitest)

## The runner: Vitest is live, Jest is dead weight

Every `test` target runs **`vitest run`** in the project's own directory:

- Backend: `apps/backend/project.json:75-83` → `"command": "vitest run"`, `"cwd": "apps/backend"`
- Frontend: `apps/frontend/project.json:85-93` → same
- uxcommon: `libs/uxcommon/project.json` `test` target → same
- Root `nx test` fans out to all three: `nx.json:5` → `"test": { "executor": "nx:noop", "dependsOn": ["frontend:test", "backend:test", "uxcommon:test"] }`

Per-project Vitest config lives in `apps/backend/vite.config.ts`, `apps/frontend/vite.config.ts`, `libs/uxcommon/vite.config.mts`. The root `vitest.config.ts` only aggregates frontend + uxcommon for editor/workspace runs. Backend runs `environment: 'node'`; frontend runs `environment: 'jsdom'` with `setupFiles: ['src/test-setup.ts']` (`apps/frontend/vite.config.ts`). Verified live: `npx vitest run` reports `RUN v4.1.9`.

**Jest is vestigial — do not use it.** `jest.config.ts`, `jest.preset.cjs`, and per-project `apps/{backend,frontend}/jest.config.ts` still exist (Angular generator leftovers; `nx.json:44` still defaults `unitTestRunner: jest`), but **nothing invokes them**: no `project.json` has a jest target (`grep -rn jest apps/*/project.json libs/*/project.json` → none), no `package.json` script runs jest, and `@nx/jest` is not in `nx.json` `plugins`. Ignore those files; write Vitest.

## Where specs live and how to run them

Specs sit **next to their source** as `<name>.spec.ts` (not in a separate `__tests__` dir). Vitest `include` glob is `{src,tests}/**/*.{test,spec}.{...ts...}` (`apps/backend/vite.config.ts`). Real examples:

- `apps/backend/src/app/modules/tasks/trpc.router.spec.ts` (beside `trpc.router.ts`)
- `apps/frontend/src/app/experiences/users/ui/user-view.spec.ts` (beside `user-view.ts`)

Run commands:

```bash
npx nx test backend            # whole backend suite
npx nx test frontend           # whole frontend suite
npx nx test                    # all three projects
# single file — run vitest from the project dir (matches the configured cwd):
cd apps/frontend && npx vitest run src/app/layout/favourite-toggle/favourite-toggle.spec.ts
```

Backend specs need Postgres reachable — DB env is injected by `apps/backend/vite.config.ts` (`test.env`), so the DB in that block must exist locally.

## Mocking conventions (copy these — they're real)

**Backend, no TestBed** — mock with `vi.spyOn` / `vi.fn().mockReturnThis()` and drive tRPC through `Router.createCaller(...)`. From `apps/backend/src/app/modules/tasks/trpc.router.spec.ts:6-38`:

```ts
import { vi, describe, it, expect, beforeEach } from 'vitest';
// ...
vi.spyOn(BaseRepository, 'dbInstance', 'get').mockReturnValue({
  selectFrom: vi.fn().mockReturnValue(mockQB),
} as any);
// ...
const caller = TasksRouter.createCaller({ auth: { tenant_id: '1', user_id: '1', session_id: 's1' } as any } as any);
const result = await caller.update({ id: '1', data: { assigned_to: '3' } });
```

**Frontend components** — Angular `TestBed.configureTestingModule` with `providers: [{ provide: Service, useValue: mockObj }]`, mocks built from `vi.fn()`. See `apps/frontend/src/app/experiences/users/ui/user-view.spec.ts:12-75`. Standalone components go in `imports:`, not `declarations:`.

`as any` casts are intentionally allowed in specs — the root ESLint config turns off `no-explicit-any` for `**/*.spec.ts` (`eslint.config.cjs:93-98`). That exemption is spec-only; the promise rules below are **not** exempted.

### The async-callback gotcha (this is where specs break the commit)

Specs are full of callbacks passed into void-return slots (`mockImplementation`, event handlers, array callbacks). Passing an `async`/Promise-returning function there trips `@typescript-eslint/no-misused-promises`. **The fix that this repo already uses**: give the callback an explicit `: void` return and do the work synchronously. Real example, `apps/backend/src/app/modules/auth/trpc.router.spec.ts:469`:

```ts
const mailSpy = vi.spyOn((controller as any).mailService, 'sendMail').mockImplementation((msg: any): void => {
  const match = String(msg?.text ?? '').match(/\b(\d{6})\b/);
  if (match) sentOtp = match[1];
});
```

Only reach for `async` in `mockImplementation` when the caller actually awaits the result (e.g. `apps/frontend/src/app/experiences/settings/settings-page.spec.ts:37`, a mocked `upsert` whose return value is awaited).

## Why a spec passes `nx lint` but the commit hook rejects it

This is the single most common surprise. **It is not a special-case exclusion of spec files — it's config divergence**, and it applies to every `.ts` file, but bites specs hardest because of the async-callback pattern above.

- The type-aware promise rules `@typescript-eslint/no-floating-promises` and `@typescript-eslint/no-misused-promises` are declared in the root `eslint.config.cjs:75-76`. The pre-commit hook runs plain `eslint` from the repo root (`package.json` `lint-staged`: `"*.{ts,html}": "eslint --fix ..."`), which resolves the **root** config and enforces them.
- `npx nx lint <project>` runs eslint with the **project-local** config instead. Whether the promise rules fire there depends on the project: `apps/backend/eslint.config.cjs:19` and `libs/common/eslint.config.cjs:19` spread the root config in (`...require('../../eslint.config.cjs')`), so `nx lint backend`/`nx lint common` DO enforce them. `apps/frontend/eslint.config.cjs` and `libs/uxcommon/eslint.config.cjs` do **not**, so for frontend and uxcommon specs those rules never fire under `nx lint` — that's where the gap still lives.

Verified in this repo: a `Promise`-returning call left floating in a scratch file under `apps/frontend/src` was **flagged by `npx eslint <file>`** (`no-floating-promises` error) but **not reported by `npx nx lint frontend`** — and the same held for a non-spec `.ts`, confirming the gap is the config, not the filename. The identical file under `apps/backend/src` is flagged by both paths.

**Practical rule:** before committing a spec, run the hook's actual command on it, not `nx lint`:

```bash
npx eslint <your-spec>.spec.ts --report-unused-disable-directives-severity=off
```

If that exits 0, the pre-commit hook will pass. Green `nx lint` alone does not guarantee it.

## Non-goals

- **The three promise/async rules in depth** (before/after fixes, the full nx-lint-vs-hook command sequence): owned by `pplcrm-quality-gate`. This skill only covers how that gap manifests _in specs_ and the one-line verify command.
- **Multi-tenant query scoping** (`local/no-unscoped-db-query`): owned by `pplcrm-tenant-safety`. Note that rule ignores `**/*.spec.ts` (`apps/backend/eslint.config.cjs:39`), so tenant scoping is not lint-enforced in tests — scope test cleanup yourself.
- **What to build** (schemas, routers, components you're writing tests _for_): `pplcrm-schemas-validation`, `pplcrm-trpc-backend`, `pplcrm-angular-components`.
- **Running/verifying the app end-to-end**: use the `/verify` and `/run` commands.
