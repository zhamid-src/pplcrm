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
    const folders = await db.selectFrom('email_folders')
      .selectAll()
      .where('tenant_id', '=', '1')
      .execute();
    console.log('Email folders in DB:');
    folders.forEach((f: any) => {
      console.log(`ID: ${f.id} | Name: ${f.name} | Tenant: ${f.tenant_id} | Icon: ${f.icon}`);
    });
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await db.destroy();
  }
}

run();
