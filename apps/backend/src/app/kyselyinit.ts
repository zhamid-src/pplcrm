import { config } from 'dotenv';
import { BaseOperator } from './db.operators/base.operator';

// import configs from env via dotenv
config();

// Run the migrations

// Migration function
async function migrateToLatest() {
  const { error, results } = await BaseOperator.migrator.migrateToLatest();

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
  const { error, results } = await BaseOperator.migrator.migrateDown();

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
