import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';

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
  try {
    const folders = await db.selectFrom('email_folders')
      .selectAll()
      .execute();
    console.log('All email folders in DB:');
    console.log(folders);

    const emailCount = await db.selectFrom('emails')
      .select(db.fn.count('id').as('count'))
      .groupBy('folder_id')
      .select('folder_id')
      .execute();
    console.log('Email counts by folder ID:');
    console.log(emailCount);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await db.destroy();
  }
}

run();
