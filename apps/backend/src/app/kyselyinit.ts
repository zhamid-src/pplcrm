import { BaseRepository } from './lib/base.repo';
import '../env';

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
const isMain =
  typeof process !== 'undefined' &&
  process.argv[1] &&
  (process.argv[1].endsWith('kyselyinit.ts') || process.argv[1].endsWith('kyselyinit.js'));
if (isMain) {
  void migrateToLatest();
}
