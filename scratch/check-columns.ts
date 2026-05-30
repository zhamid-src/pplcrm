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
    const tables = ['emails', 'email_headers', 'email_bodies', 'email_recipients'];
    for (const table of tables) {
      const cols = await db.selectFrom('information_schema.columns')
        .select(['column_name', 'data_type', 'is_nullable'])
        .where('table_name', '=', table)
        .execute();
      console.log(`\nTable: ${table}`);
      console.log(cols.map(c => `${c.column_name} (${c.data_type}, nullable: ${c.is_nullable})`).join('\n'));
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await db.destroy();
  }
}

run();
