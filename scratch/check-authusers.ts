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
      .select(['id', 'first_name', 'email', 'tenant_id'])
      .execute();
    console.log('--- authusers ---');
    console.log(users);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await db.destroy();
  }
}

run();
