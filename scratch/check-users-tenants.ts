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
      .select(['id', 'email', 'first_name', 'tenant_id'])
      .execute();
    console.log('Users in DB with tenant_id:');
    console.log(users);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await db.destroy();
  }
}

run();
