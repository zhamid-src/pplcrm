import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import { Models } from 'common/src/lib/kysely.models';

const db = new Kysely<Models>({
  dialect: new PostgresDialect({
    pool: new Pool({
      user: 'zeehamid',
      database: 'pplcrm',
      password: 'Eternity#1',
      host: 'localhost',
      port: 5432
    })
  })
});

async function run() {
  const q = db.updateTable('emails').set({ assigned_to: '1' }).where('id', '=', '29');
  console.log(q.compile().sql);
  const result = await q.executeTakeFirst();
  console.log(result);
  
  const updatedRow = await db.selectFrom('emails').selectAll().where('id', '=', '29').executeTakeFirst();
  console.log('After update:', updatedRow?.assigned_to);

  process.exit(0);
}
run();
