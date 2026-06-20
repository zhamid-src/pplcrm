import { sql } from 'kysely';
import { BaseRepository } from './lib/base.repo';
import '../env';

async function ensureMigrationTableUpdated(): Promise<void> {
  try {
    await sql`
      UPDATE kysely_migration
      SET name = '2026-07-01-a-schema-improvements'
      WHERE name IN ('2026-06-31-schema-improvements', '2026-07-01-schema-improvements')
    `.execute(BaseRepository.dbInstance);

    await sql`
      UPDATE kysely_migration
      SET name = '2026-07-01-b-security-ops-improvements'
      WHERE name IN ('2026-06-31-security-ops-improvements', '2026-07-01-security-ops-improvements')
    `.execute(BaseRepository.dbInstance);
  } catch (err) {
    // Ignore if table doesn't exist or update fails
  }
}

export async function migrateDown(): Promise<void> {
  await ensureMigrationTableUpdated();
  const { error, results } = await BaseRepository.migrator.migrateDown();

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

export async function migrateToLatest(): Promise<void> {
  console.log('Migration starting');

  await ensureMigrationTableUpdated();
  const { error, results } = await BaseRepository.migrator.migrateToLatest();

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

// Automatically run migration when script is executed directly
const isMain =
  typeof process !== 'undefined' &&
  process.argv[1] &&
  (process.argv[1].endsWith('kyselyinit.ts') || process.argv[1].endsWith('kyselyinit.js'));
if (isMain) {
  void migrateToLatest();
}
