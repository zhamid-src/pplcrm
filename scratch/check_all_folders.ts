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
      .execute();
    console.log('All email folders in DB:');
    folders.forEach((f: any) => {
      console.log(`ID: ${f.id} | Name: ${f.name} | Tenant: ${f.tenant_id} | Icon: ${f.icon}`);
    });

    const tenants = await db.selectFrom('tenants').select('id').execute();
    console.log('Tenants in DB:', tenants);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await db.destroy();
  }
}

run();
