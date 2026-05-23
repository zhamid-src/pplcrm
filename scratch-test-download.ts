import { StorageService } from './apps/backend/src/app/lib/storage.service';
import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';

process.env.DB_USER = 'zeehamid';
process.env.DB_NAME = 'pplcrm';
process.env.DB_PASSWORD = 'Eternity#1';
process.env.DB_PORT = '5432';
process.env.DB_HOST = 'localhost';
process.env.SHARED_SECRET = 'dev-secret';

const dialect = new PostgresDialect({
  pool: new Pool({
    user: 'zeehamid',
    database: 'pplcrm',
    password: 'Eternity#1',
    port: 5432,
    host: 'localhost',
  }),
});

const db = new Kysely<any>({ dialect });

async function run() {
  const storage = new StorageService();
  try {
    const files = await db.selectFrom('files').selectAll().execute();
    console.log(`Found ${files.length} files in DB.`);
    for (const file of files) {
      console.log(`Downloading ${file.filename} (key: ${file.storage_key})...`);
      try {
        const buffer = await storage.download(file.storage_key);
        console.log(`Success! Buffer size: ${buffer.length}`);
      } catch (err) {
        console.error(`Download failed:`, err);
      }
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await db.destroy();
  }
}

run();
