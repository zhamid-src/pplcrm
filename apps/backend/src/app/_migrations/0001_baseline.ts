// tsco: ignore

import type { Kysely} from 'kysely';
import { sql } from 'kysely';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function up(db: Kysely<any>): Promise<void> {
  // Read the schema_dump.sql file from the same directory
  const schemaPath = path.join(__dirname, 'schema.sql');
  const rawSql = fs.readFileSync(schemaPath, 'utf8');

  // Strip psql meta-commands (\restrict etc.) and PG17-only SET params that
  // don't exist on older servers (transaction_timeout added in PG17).
  const pg17OnlyParams = new Set(['transaction_timeout']);

  // Kysely's migrator creates and manages its own bookkeeping tables
  // (kysely_migration / kysely_migration_lock) before any migration runs.
  // pg_dump captures those tables into the schema dump, so executing them
  // here would collide ("relation already exists"). Skip any DDL block that
  // targets them. A block starts at a CREATE/ALTER TABLE referencing the
  // table and continues until the statement-terminating ';'.
  const kyselyBlockStart = /^(CREATE TABLE|ALTER TABLE(\s+ONLY)?)\s+(public\.)?kysely_migration(_lock)?\b/i;
  let skippingKyselyBlock = false;

  const schemaSql = rawSql
    .split('\n')
    .filter((line) => {
      const t = line.trimStart();
      if (t.startsWith('\\')) return false;
      // pg_dump empties the session search_path; if left in, every subsequent
      // unqualified statement on this connection (including Kysely's own INSERT
      // into kysely_migration) fails with "relation does not exist".
      if (/^SELECT\s+pg_catalog\.set_config\(\s*'search_path'/i.test(t)) return false;
      const setMatch = t.match(/^SET\s+(\w+)\s*=/i);
      if (setMatch && setMatch[1] && pg17OnlyParams.has(setMatch[1].toLowerCase())) return false;

      if (skippingKyselyBlock) {
        // Drop lines until we reach the end of the current statement.
        if (t.endsWith(';')) skippingKyselyBlock = false;
        return false;
      }
      if (kyselyBlockStart.test(t)) {
        // Single-line statement ends immediately; otherwise keep skipping.
        skippingKyselyBlock = !t.endsWith(';');
        return false;
      }
      return true;
    })
    .join('\n');

  await sql.raw(schemaSql).execute(db);
}

export async function down(_db: Kysely<any>): Promise<void> {
  // A squashed baseline migration generally shouldn't be rolled back,
  // as dropping the entire public schema is highly destructive.
  // We throw an error here to prevent accidental database wiping.
  throw new Error('This is a baseline migration and cannot be safely rolled back.');
}
