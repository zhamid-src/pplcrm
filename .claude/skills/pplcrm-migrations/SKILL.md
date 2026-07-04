---
name: pplcrm-migrations
description: "How to add and run Kysely SQL migrations in the PeopleCRM backend, the filename convention that controls run order, the never-edit-an-applied-migration rule, and how the schema baseline works. USE WHEN adding or changing a database table/column, writing a migration file, debugging 'corrupt migration'/'relation already exists' errors on startup, or regenerating the schema baseline. EXAMPLES: 'add a migration to add a column to persons', 'create a new table with a migration', 'schema change for tenant settings', 'how do I regenerate schema_dump.sql', 'migration failed with corrupt migrations error'."
---

# PeopleCRM Database Migrations

Migrations are plain Kysely SQL files run by Kysely's `Migrator` + `FileMigrationProvider`. There is **no codegen and no separate `migrate` npm script** — migrations run automatically when the backend boots.

## The non-obvious rules first

1. **The baseline file is `schema.sql`, NOT `schema_dump.sql`.** The only file that exists is `apps/backend/src/app/_migrations/schema.sql` (~172 KB), and `0001_baseline.ts:12` reads `path.join(__dirname, 'schema.sql')`. CLAUDE.md §5 has been corrected, but stale `schema_dump.sql` references survive in `apps/backend/STRUCTURE.md` and the repomix ignore-globs (root `package.json` / `apps/backend/project.json`) — trust the code, not those.

2. **Never edit or rename a migration that has already run.** Kysely records each applied migration by name in the `kysely_migration` table. An already-recorded migration is never re-run, so editing its `up()` silently changes nothing on any DB that already ran it. Renaming or deleting one is worse: Kysely finds a recorded name with no matching file and aborts with a **corrupt migrations** error. Proof this bites in practice: `kyselyinit.ts:6-22` (`ensureMigrationTableUpdated`) exists solely to `UPDATE kysely_migration SET name = ...` after some migrations were renamed. Don't create that mess — add a new file instead.

3. **`tools/ai-migrations/` is unrelated.** It contains only `@nx/vite/23.0.0/ai-instructions-*.md` (Nx package-upgrade notes) and is referenced nowhere in the codebase. It is NOT a migration tool. Ignore it.

## Naming convention (verified from real filenames)

Files live in `apps/backend/src/app/_migrations/`. Kysely runs them in **lexicographic filename order**, so the name is load-bearing:

- Regular migrations: `YYYY-MM-DD-short-description.ts` — e.g. `2026-06-27-person-opt-in.ts`, `2026-06-26-passkey-setup-dismissed.ts`.
- The squashed baseline is `0001_baseline.ts` — the `0001_` numeric prefix sorts before every dated file so it always runs first.
- **Same-day tie-break:** when two migrations share a date, disambiguate order with a letter segment: `2026-07-01-a-schema-improvements`, `2026-07-01-b-security-ops-improvements` (see the recorded names in `kyselyinit.ts:10,16`). Use this if you add a second migration on a day that already has one.

Every file must export `up(db: Kysely<any>)` and `down(db: Kysely<any>)`.

## How migrations run

- Registered via `BaseRepository.migrator` — `Migrator` + `FileMigrationProvider` pointed at `apps/backend/src/app/_migrations` (resolved from `process.cwd()`; see the real call with `fs`/`path` at `apps/backend/src/app/lib/base.repo.ts:45,53-60`).
- Applied automatically on backend startup: `apps/backend/src/main.ts:14` calls `migrateToLatest()` from `kyselyinit.ts:42`. Starting the backend brings the DB to latest.
- State is tracked in the Kysely-managed tables `kysely_migration` and `kysely_migration_lock` (referenced in `kyselyinit.ts:9` and `0001_baseline.ts:25`). Never write to these by hand except through the existing rename shim.

## Worked example — add a table

Model your file on `apps/backend/src/app/_migrations/2026-06-25-person-newsletter-engagements.ts` (trimmed here to the shape — the real file has more columns and indexes; open it for the full version):

```ts
import type { Kysely } from 'kysely';
import { sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    CREATE TABLE public.person_newsletter_engagements (
      tenant_id     bigint  NOT NULL,
      newsletter_id bigint  NOT NULL,
      email         text    NOT NULL,
      PRIMARY KEY (tenant_id, newsletter_id, email)
    )
  `.execute(db);
  await sql`CREATE INDEX idx_pne_tenant_email ON public.person_newsletter_engagements (tenant_id, email)`.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`DROP TABLE IF EXISTS public.person_newsletter_engagements`.execute(db);
}
```

For column additions, use idempotent `ADD COLUMN IF NOT EXISTS` / `DROP COLUMN IF EXISTS` — see `2026-06-27-person-opt-in.ts:9-15`. Note tables carry a `tenant_id` for multi-tenant scoping (see `pplcrm-tenant-safety`).

## After the migration: update the Kysely types by hand

There is **no `kysely-codegen`** (grep of `package.json` for codegen is empty). The `Models` interface is maintained manually in `libs/common/src/lib/kysely.models.ts`. Its header comment (`libs/common/src/lib/kysely.models.ts:5-6`) says: "When adding a new table … Add a model and add it to the interface Models." So a migration that adds/changes a table is not finished until you add/edit the corresponding model interface and register it in the `Models` map (`kysely.models.ts:31`). Without this, Kysely queries against the new table won't type-check.

## Regenerating the schema baseline (`schema.sql`)

`0001_baseline.ts` bootstraps a **fresh** database by executing `schema.sql`; it does not run on databases that already have the schema. Regenerate it only after significant schema changes so new/fresh databases start current.

- **There is no script that does this** — no `pg_dump` npm script or shell script exists in the repo (the only `pg_dump` mentions are in docs/comments). It is a manual, schema-only dump: `pg_dump --schema-only` of a fully-migrated database, written to `apps/backend/src/app/_migrations/schema.sql`.
- `0001_baseline.ts:16-52` shows what the loader tolerates/strips at run time: psql `\` meta-commands, the `search_path` `set_config` line, PG17-only `transaction_timeout`, and any `kysely_migration`/`kysely_migration_lock` DDL. You don't need to hand-edit those out — the loader filters them — but do **not** add data (no `COPY`/`INSERT`); schema only.
- Do not delete or renumber applied migration files when regenerating; the baseline coexists with the dated files.

## Non-goals

- **Kysely query/repository patterns, `Insertable`/`Updateable`, transactions, transactional outbox** → `pplcrm-trpc-backend`.
- **Zod schema triad (`AddXObj`/`UpdateXObj`/`XObj`)** that usually accompanies a new table → `pplcrm-schemas-validation`.
- **The full "add a new entity end-to-end" chain** (schema → migration → types → router → frontend) → `pplcrm-add-entity`; this skill owns only the migration + baseline step.
- **`tenant_id` scoping and the `no-unscoped-db-query` rule** → `pplcrm-tenant-safety`.
