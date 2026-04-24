import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import { Models } from 'common/src/lib/kysely.models';

const db = new Kysely<Models>({
  dialect: new PostgresDialect({
    pool: new Pool({
      user: 'postgres',
      database: 'pplcrm',
      host: 'localhost',
      port: 5432
    })
  })
});

async function run() {
  const q = db.updateTable('emails').set({ assigned_to: '1' }).where('id', '=', '1');
  console.log(q.compile().sql);
  console.log(q.compile().parameters);
  process.exit(0);
}
run();
