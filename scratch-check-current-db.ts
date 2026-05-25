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
    const settings = await db.selectFrom('settings')
      .selectAll()
      .where('tenant_id', '=', '1')
      .where('key', 'like', 'communications.smtp_%')
      .execute();
    console.log('Tenant 1 SMTP settings in DB:');
    console.log(settings);

    const email74Body = await db.selectFrom('email_bodies')
      .select('body_html')
      .where('email_id', '=', '74')
      .executeTakeFirst();
    console.log('Email 74 body html:');
    console.log(email74Body?.body_html);

    const attachments = await db.selectFrom('email_attachments')
      .selectAll()
      .orderBy('id', 'desc')
      .limit(10)
      .execute();
    console.log('Latest email attachments in DB:');
    console.log(attachments);
    
    const files = await db.selectFrom('files')
      .selectAll()
      .orderBy('id', 'desc')
      .limit(10)
      .execute();
    console.log('Latest files in DB:');
    console.log(files);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await db.destroy();
  }
}

run();
