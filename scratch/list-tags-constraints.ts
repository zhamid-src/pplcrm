import { Kysely, PostgresDialect } from 'kysely';
import pg from 'pg';
const { Pool } = pg;

const dialect = new PostgresDialect({
  pool: new Pool({
    user: process.env.DB_USER || 'postgres',
    database: process.env.DB_NAME || 'pplcrm',
    password: process.env.DB_PASSWORD || 'postgres',
    port: Number(process.env.DB_PORT || 5432),
    host: process.env.DB_HOST || 'localhost',
  }),
});

const db = new Kysely<any>({ dialect });

async function run() {
  try {
    const result = await db.selectFrom('information_schema.table_constraints')
      .select(['constraint_name', 'constraint_type'])
      .where('table_name', '=', 'tags')
      .execute();
    console.log('Constraints on tags table:');
    console.log(result);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await db.destroy();
  }
}

run();
