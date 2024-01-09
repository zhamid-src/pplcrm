import { config } from 'dotenv';
import { promises as fs } from 'fs';
import { FileMigrationProvider, Kysely, Migrator, PostgresDialect } from 'kysely';
import path from 'path';
import { Pool } from 'pg';
import { Models } from '../../../../common/src/lib/kysely.models';

// import configs from env via dotenv
config();

const dialect = new PostgresDialect({
  pool: new Pool({
    // connectionString: process.env["DATABASE_URL"],
    user: 'zeehamid',
    database: 'pplcrm',
    password: 'Eternity#1',
    port: 5432,
    host: 'localhost',
    ssl: false,
  }),
});

//TODO: Move to base operator and not export it?
export const db = new Kysely<Models>({
  dialect,
});

// Run the migrations
const migrationFolder = path.join(__dirname, './kysely.migrations');
export const migrator = new Migrator({
  db,
  provider: new FileMigrationProvider({
    fs,
    path,
    migrationFolder,
  }),
});

// Migration function
async function migrateToLatest() {
  const { error, results } = await migrator.migrateToLatest();

  results?.forEach((it) => {
    if (it.status === 'Success') {
      console.log(`migration up:"${it.migrationName}" successful`);
    } else if (it.status === 'Error') {
      console.error(`failed to execute migration up"${it.migrationName}"`);
    }
  });

  if (error) {
    console.error('failed to migrate up: ', error);
    process.exit(1);
  }
}

/**
 * Migrate down to the previous version
 */
export async function migrateDown() {
  const { error, results } = await migrator.migrateDown();

  results?.forEach((it) => {
    if (it.status === 'Success') {
      console.log(`migration down"${it.migrationName}" successsful`);
    } else if (it.status === 'Error') {
      console.error(`failed to execute migration down"${it.migrationName}"`);
    }
  });

  if (error) {
    console.error('failed to migrate down: ', error);
    process.exit(1);
  }
}

migrateToLatest();
