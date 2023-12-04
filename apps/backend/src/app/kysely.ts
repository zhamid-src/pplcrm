// import { CockroachDialect } from '@cubos/kysely-cockroach';
import { promises as fs } from 'fs';
import { FileMigrationProvider, Kysely, Migrator, PostgresDialect } from 'kysely';
import * as path from 'path';
import { Pool } from 'pg';
import { postgres } from '../env';
import { Database } from './kyselySchema/db.schema';

const dialect = new PostgresDialect({
  pool: new Pool(postgres),
});

// Database interface is passed to Kysely's constructor, and from now on, Kysely
// knows your database structure.
// Dialect is passed to Kysely's constructor, and from now on, Kysely knows how
// to communicate with your database.
export const db = new Kysely<Database>({
  dialect,
});

const migrationFolder = path.join(__dirname, './migrations');

export const migrator = new Migrator({
  db,
  provider: new FileMigrationProvider({
    fs,
    path,
    migrationFolder,
  }),
});

async function migrateToLatest() {
  const { error, results } = await migrator.migrateToLatest();

  results?.forEach((it) => {
    if (it.status === 'Success') {
      console.log(`migration up:"${it.migrationName}" was executed successfully`);
    } else if (it.status === 'Error') {
      console.error(`failed to execute migration up"${it.migrationName}"`);
    }
  });

  if (error) {
    console.error('failed to migrate up');
    console.error(error);
    process.exit(1);
  }

  // await dbLocal.destroy()
}

export async function migrateDown() {
  const { error, results } = await migrator.migrateDown();

  results?.forEach((it) => {
    if (it.status === 'Success') {
      console.log(`migration down"${it.migrationName}" was executed successfully`);
    } else if (it.status === 'Error') {
      console.error(`failed to execute migration down"${it.migrationName}"`);
    }
  });

  if (error) {
    console.error('failed to migrate down');
    console.error(error);
    process.exit(1);
  }

  // await dbLocal.destroy()
}

migrateToLatest();
