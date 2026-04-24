import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import { Models } from 'common/src/lib/kysely.models';

const db = new Kysely<Models>({
  dialect: new PostgresDialect({
    pool: new Pool()
  })
});

const query = db.updateTable('emails').set({ assigned_to: '1' }).where('id', '=', '1').where('tenant_id', '=', '1');

console.log(query.compile().sql);
console.log(query.compile().parameters);
