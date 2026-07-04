---
name: pplcrm-tenant-safety
description: "Explains the custom no-unscoped-db-query ESLint rule that is the multi-tenant safety net — what trips it, the ignoreTables allow-list and why each table is on it, the query shapes it silently cannot catch, and how to add a table to the allow-list as a reviewed security decision. USE WHEN a lint error says 'no-unscoped-db-query' or 'has no .where(tenant_id) filter', when writing/reviewing any backend Kysely query that could leak across tenants, when tempted to add an eslint-disable for this rule, or when changing the ignoreTables list. EXAMPLES: 'lint fails with local/no-unscoped-db-query on my query', 'is this query safe across tenants?', 'can I add ms_graph_tokens to the ignore list?', 'why does the rule not catch my query built in two steps?', 'the rule flagged my subquery but tenant_id is filtered inside'."
---

# Multi-tenant query safety (`no-unscoped-db-query`)

The rule is a **tripwire, not a proof.** It catches the common mistake (a Kysely chain with no
tenant scope) but has real blind spots. A green lint does not mean a query is tenant-safe — you
still owe the manual checks below. A cross-tenant leak here is a real data breach, so treat every
`eslint-disable` of this rule as a security decision that needs a reviewer, not a lint annoyance.

## Where it lives and where it actually runs

- Rule source: `tools/eslint-rules/rules/no-unscoped-db-query.cjs`
- Registered as `local/no-unscoped-db-query` in `tools/eslint-rules/index.cjs:17`
- **Only enabled for backend module files:** `apps/backend/eslint.config.cjs:45-46` scopes it to
  `files: ['**/src/app/modules/**/*.ts']`, `ignores: ['**/*.spec.ts']`; enabled at severity
  `error` at line 51.

So the rule does **not** run on: `apps/backend/src/app/lib/base.repo.ts` (outside `modules/**`),
`*.spec.ts`, migrations, or any frontend/common code. Queries in those files get **zero**
tenant-scope enforcement — they are the manual-review frontier.

### Gotcha: plain `eslint` from the repo root does NOT enable this rule

The root `eslint.config.cjs` registers the `local` plugin (`eslint.config.cjs:69`) but never turns
the rule on. Only `apps/backend/eslint.config.cjs:51` enables it. Verified: running
`npx eslint apps/backend/src/app/modules/persons/foo.ts` from root reports only unrelated warnings;
the tenant rule stays silent. To actually exercise it:

```bash
npx nx lint backend
# or, to check one file with the backend config explicitly:
npx eslint --config apps/backend/eslint.config.cjs <path-to-a-modules-file>.ts
```

If you "test" your query with bare `npx eslint file.ts`, you get a false all-clear.

## What trips it

The rule fires when a **single contiguous** method chain:

1. contains a scope starter — `selectFrom` / `updateTable` / `deleteFrom`
   (`SCOPE_METHODS`, rule line 51), AND
2. ends in a terminal — `execute` / `executeTakeFirst` / `executeTakeFirstOrThrow` / `stream`
   (`EXECUTE_METHODS`, rule lines 43-48), AND
3. has no `.where(...)` in that chain whose first string argument contains the substring
   `tenant_id` (rule lines 156-161), AND
4. the table (first arg of the scope method, if a string literal) is not on `ignoreTables`.

Minimal repro that fails `npx nx lint backend`:

```ts
// ❌ inside apps/backend/src/app/modules/**  → "Kysely query on 'persons' has no
//    .where('tenant_id', …) filter"
db.selectFrom('persons').selectAll().execute();
```

Fix — add the scope. Real correctly-scoped example,
`apps/backend/src/app/modules/teams/controller.ts:97-102`:

```ts
const rawLists = await trx
  .selectFrom('lists')
  .select(['id', 'name', 'description', 'object', 'is_dynamic'])
  .where('tenant_id', '=', auth.tenant_id)
  .where('id', 'in', finalListIds)
  .execute();
```

Note the matching is a substring check (rule lines 81-91): `.where('lists.tenant_id', ...)` also
satisfies it. And it only checks that _some_ `.where` mentions `tenant_id` — it does **not** verify
the operator or value. `.where('tenant_id', 'is not', null)` would pass the linter while scoping
nothing. The rule proves a `tenant_id` filter is _present_, never that it is _correct_.

## What it silently CANNOT catch — the dangerous part

`collectChain` (rule lines 60-75) walks `callee.object` step by step and **stops** the moment the
chain is anything other than a `CallExpression` on a `MemberExpression`. Consequences:

1. **Broken-up chains pass silently.** Assigning the builder to an intermediate variable severs the
   walk, so the `selectFrom` is never found and the rule never fires — even with no tenant scope
   anywhere:

   ```ts
   // ⚠️ NOT flagged, and NOT tenant-safe. The rule can't see selectFrom from the .execute() call.
   const q = db.selectFrom('persons').selectAll();
   return q.execute();
   ```

   When you review or write a query split across statements, you must confirm the `tenant_id`
   scope yourself — lint gives you nothing here.

2. **Subquery/callback table forms produce false positives, not silence.** When the table is a
   callback (`selectFrom((qb) => ...)`) instead of a string literal, the outer chain has no literal
   table and no outer `tenant_id` where, so the rule _flags_ it even though `tenant_id` is filtered
   inside the subquery. This is the legitimate reason for the disables in the repo. Real example,
   `apps/backend/src/app/modules/persons/repositories/persons.repo.ts:415-431`:

   ```ts
   public async getDuplicateCount(tenant_id: string): Promise<number> {
     // NOTE: unscoped by design — tenant_id filtered inside subquery
     // eslint-disable-next-line local/no-unscoped-db-query
     const countResult = await this.db
       .selectFrom((qb) =>
         qb.selectFrom('potential_duplicates')
           .innerJoin('persons', 'potential_duplicates.person_id', 'persons.id')
           .where('potential_duplicates.tenant_id', '=', tenant_id)
           // ...
           .as('sub'),
       )
       .select([sql<number>`count(group_key)`.as('total')])
       .executeTakeFirst();
   }
   ```

   The near-identical pattern is at
   `apps/backend/src/app/modules/households/repositories/households.repo.ts:471-487`. There are 11
   such `eslint-disable-next-line local/no-unscoped-db-query` sites in the backend today
   (`grep -rn "eslint-disable-next-line local/no-unscoped-db-query" apps/backend/src` to list
   them); most pair the disable with a `NOTE:` explaining where the real scope lives. Match the
   best of them: never add a bare disable — write the `// NOTE:` sentence proving the tenant
   filter exists, then have a reviewer confirm it.

## The ignore-list (allow-list) and why each table is on it

The rule's built-in default (`tools/eslint-rules/rules/no-unscoped-db-query.cjs:126`) is
`['authusers', 'sessions', 'tenants', 'tags']`, but **the enforced list is set by the config
override**, not the default. The live list is 3 tables
(`apps/backend/eslint.config.cjs:65`):

| Table       | Why cross-tenant access is intentional                                                                                                                                                                                                |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `authusers` | Login is by email before any tenant is known. See `apps/backend/src/app/modules/auth/passkey.controller.ts:30` — `.selectFrom('authusers').where('email', '=', …)`. It _selects_ `tenant_id` to establish scope for everything after. |
| `sessions`  | Sign-out / session lookup is by `session_id` hash; the token carries no tenant.                                                                                                                                                       |
| `tenants`   | The tenant table itself is looked up by `id`; scoping it by `tenant_id` is circular.                                                                                                                                                  |

The pattern: a table is safe to allow-list only if its natural key is **globally unique and not
tenant-derived** (email, session hash, the tenant id itself). If the table has a `tenant_id`
column and queries key on it, it does not belong on the list.

### Cautionary tale: three tables used to be on this list and shouldn't have been

Until 2026-07-04 the list also carried `tags`, `ms_oauth_tokens`, and `google_oauth_tokens` — and
all three rationales had rotted:

- `tags` was justified as "scoping happens at the join level," but every real module query already
  scoped `tenant_id` directly (e.g. `apps/backend/src/app/modules/donations/controller.ts:601`,
  `apps/backend/src/app/modules/auth/onboarding-seed.ts:116`). Removing it surfaced zero lint
  errors — the entry was pure dead risk.
- The two OAuth-token tables were justified as "keyed by `user_id` (globally unique)" — true when
  written, but migration `2026-06-26-email-sync-per-tenant.ts` re-keyed both tables on
  `UNIQUE (tenant_id)` and made `user_id` nullable. These tables hold access/refresh token
  secrets; an unscoped `selectFrom('ms_oauth_tokens')` would have returned every tenant's tokens
  with no lint warning. Removing them surfaced two queries still keying on `user_id` alone
  (`emails-api.route.ts`), which were fixed by adding the tenant scope.

The lesson: **allow-list rationales rot silently when the schema changes.** A migration that
changes a table's keying must re-check whether that table is on this list. If you're touching the
schema of an allow-listed table, re-justify or remove its entry in the same PR.

## Adding a table to the ignore-list — a security review, not a lint fix

Adding a table silences the rule for **every** query against it, forever, everywhere in
`modules/**`. Before editing `ignoreTables` in `apps/backend/eslint.config.cjs`:

1. Prove the table has no `tenant_id` column, OR that every legitimate query genuinely must span
   tenants (auth/session/tenant-lookup shaped). If the table has a `tenant_id`, the answer is
   almost always "scope the query," not "allow-list the table."
2. Prefer the narrowest tool. A one-off intentional cross-tenant query should be a per-line
   `// eslint-disable-next-line local/no-unscoped-db-query` **with a `// NOTE:` proving safety**
   (see the 11 existing sites) — not a global allow-list entry.
3. Add a one-line justification in the config comment block above `ignoreTables` in the same style
   as the existing entries, naming the safe key. An entry with no rationale is a review reject.
4. Get a second reviewer. This is the one lint change where "it makes the error go away" is exactly
   the wrong reason to merge it.

After changing the list, re-run `npx nx lint backend` and confirm nothing _else_ newly passes that
should not have.

**Known baseline:** as of this writing `npx nx lint backend` is NOT clean — it has 2 pre-existing
`no-unscoped-db-query` errors on `donation_pledges`
(`apps/backend/src/app/modules/donations/controller.ts:560` and
`.../donations/repositories/pledges.repo.ts:51`) awaiting a dedicated fix. If you see exactly
those two, they're not yours.

## Non-goals

- General Kysely query building, `Insertable`/`Updateable`, transactions, TRPCError, the
  transactional outbox → **`pplcrm-trpc-backend`**.
- Writing/altering migrations and the `schema.sql` baseline (the rule ignores migrations) →
  **`pplcrm-migrations`**.
- The full pre-commit-vs-`nx lint` gap and the general lint command sequence →
  **`pplcrm-quality-gate`**. This skill only covers the one wrinkle that this rule is off in the
  root config and on only in the backend config.
- Running a broad review/verify pass → the `/code-review`, `/security-review`, and `/verify`
  slash-command skills.
