import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { FileMigrationProvider, Kysely, Migrator, sql, PostgresDialect } from 'kysely';
import { Pool } from 'pg';

/**
 * Vitest globalSetup for the backend suite.
 *
 * Backend specs run against a REAL Postgres database — there is no mocking
 * layer, and most specs are controller/service-level, so they call methods that
 * open their own pool connections and can't be wrapped in a rolled-back
 * `useTestTransaction()`. To keep those specs from ever touching real data, the
 * whole suite runs against a dedicated, disposable `pplcrm_test` database
 * (provisioned once by apps/backend/scripts/setup-test-db.sh).
 *
 * This runs once, in the main Vitest process, before any worker:
 *   1. HARD GUARDRAIL — abort unless the target DB name ends in `_test`, so a
 *      misconfigured .env.test can never migrate/truncate the dev or prod DB.
 *   2. Bring the schema to latest (runs `0001_baseline` + any dated migrations
 *      as the owner role), so the test DB tracks migrations automatically.
 *   3. TRUNCATE every base table to a clean slate, so rows leaked by a crashed
 *      previous run never accumulate or cross-contaminate.
 *
 * Creds are read straight from process.env (loaded from .env.test by
 * vite.config.ts) rather than importing the app's `env` module, to avoid
 * import-time env-parse ordering issues in the harness.
 */

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MIGRATION_FOLDER = path.resolve(HERE, '../app/_migrations');
const ENV_TEST_PATH = path.resolve(HERE, '../../../../.env.test');

// Kysely-managed tables must survive the truncate, or migration state is lost.
const PRESERVE_TABLES = new Set(['kysely_migration', 'kysely_migration_lock']);

function loadEnvIfNeeded(): void {
  if (!process.env['DB_NAME'] && typeof process.loadEnvFile === 'function') {
    try {
      process.loadEnvFile(ENV_TEST_PATH);
    } catch {
      // vite.config.ts is the primary loader; ignore if the file is absent here.
    }
  }
}

/** Owner-role connection: migrations create objects and TRUNCATE needs owner rights. */
function ownerPool(database: string): Pool {
  return new Pool({
    host: process.env['DB_HOST'] ?? 'localhost',
    port: Number(process.env['DB_PORT'] ?? 5432),
    database,
    user: process.env['DB_MIGRATION_USER'] ?? process.env['DB_USER'],
    password: process.env['DB_MIGRATION_PASSWORD'] ?? process.env['DB_PASSWORD'],
    ssl: process.env['DB_SSL'] === 'true' ? { rejectUnauthorized: false } : false,
    max: 2,
    application_name: 'pplcrm-test-globalsetup',
  });
}

export default async function setup(): Promise<void> {
  loadEnvIfNeeded();

  const database = process.env['DB_NAME'] ?? '';
  if (!/_test$/.test(database)) {
    throw new Error(
      `Refusing to run the backend test suite against database "${database}": the Vitest globalSetup ` +
        `migrates and TRUNCATEs its target, so it only runs against a database whose name ends in "_test". ` +
        `Fix DB_NAME in .env.test (expected e.g. "pplcrm_test"; run apps/backend/scripts/setup-test-db.sh first).`,
    );
  }

  const db = new Kysely<Record<string, unknown>>({
    dialect: new PostgresDialect({ pool: ownerPool(database) }),
  });

  try {
    // 1. Schema to latest.
    const migrator = new Migrator({
      db,
      provider: new FileMigrationProvider({ fs, path, migrationFolder: MIGRATION_FOLDER }),
    });
    const { error, results } = await migrator.migrateToLatest();
    if (error) {
      throw error instanceof Error ? error : new Error(String(error));
    }
    const applied = (results ?? []).filter((r) => r.status === 'Success').length;
    if (applied > 0) {
      // eslint-disable-next-line no-console
      console.log(`[test-db] applied ${applied} migration(s) to ${database}`);
    }

    // 2. Clean slate — truncate every base table except the migration ledger.
    const tables = await sql<{ tablename: string }>`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    `.execute(db);

    const truncatable = tables.rows.map((r) => r.tablename).filter((t) => !PRESERVE_TABLES.has(t));

    if (truncatable.length > 0) {
      const list = truncatable.map((t) => `public.${t}`).join(', ');
      await sql.raw(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`).execute(db);
    }
  } finally {
    await db.destroy();
  }
}
