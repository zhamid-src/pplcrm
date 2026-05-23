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
    const emails = await db.selectFrom('emails')
      .select(['id', 'subject', 'preview', 'created_at'])
      .orderBy('id', 'desc')
      .limit(10)
      .execute();
    console.log('Latest emails in DB:');
    console.log(emails);

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
