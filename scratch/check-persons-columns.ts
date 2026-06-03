import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';

const dialect = new PostgresDialect({
  pool: new Pool({
    user: 'pplcrm',
    database: 'pplcrm',
    password: '[REDACTED]',
    port: 5432,
    host: 'localhost',
  }),
});

const db = new Kysely<any>({ dialect });

async function run() {
  try {
    const columns = await db.selectFrom('information_schema.columns')
      .select(['column_name', 'data_type'])
      .where('table_name', '=', 'persons')
      .execute();
    console.log('Columns of persons table:');
    console.log(columns);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await db.destroy();
  }
}

run();
