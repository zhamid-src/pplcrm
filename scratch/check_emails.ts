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
    const emails = await db.selectFrom('emails')
      .select(['id', 'folder_id', 'subject', 'preview', 'status', 'from_email', 'to_email'])
      .where('tenant_id', '=', '1')
      .execute();
    console.log(`Total emails in DB: ${emails.length}`);
    emails.forEach((e: any) => {
      console.log(`ID: ${e.id} | Folder: ${e.folder_id} | Status: ${e.status} | From: ${e.from_email} | To: ${e.to_email} | Subj: ${e.subject} | Preview: ${e.preview}`);
    });
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await db.destroy();
  }
}

run();
