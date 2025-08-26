import { BaseRepository } from './lib/base.repo';
import '../env';

/**
 * Rolls back the most recent database migration.
 *
 * This is useful for undoing the last migration applied, especially in
 * testing or development environments. Logs results and exits on failure.
 *
 * @returns {Promise<void>}
 */
export async function migrateDown(): Promise<void> {
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

/**
 * Runs all pending database migrations to bring the schema up to date.
 *
 * This function uses the migrator from the BaseRepository to execute
 * all unapplied migrations. It logs the result of each migration and
 * exits the process with code 1 on error.
 *
 * @returns {Promise<void>}
 */
export async function migrateToLatest(): Promise<void> {
  console.log('Migration starting');

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
migrateToLatest();
