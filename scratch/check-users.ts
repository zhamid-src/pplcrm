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
    const users = await db.selectFrom('authusers')
      .selectAll()
      .execute();
    console.log('--- authusers ---');
    console.log(users);

    const profiles = await db.selectFrom('profiles')
      .selectAll()
      .execute();
    console.log('--- profiles ---');
    console.log(profiles);

    const tasks = await db.selectFrom('tasks')
      .selectAll()
      .execute();
    console.log('--- tasks ---');
    console.log(tasks);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await db.destroy();
  }
}

run();
