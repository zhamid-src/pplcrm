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
    const tables = await db.introspection.getTables();
    for (const tableName of ['task_comments', 'task_subtasks', 'task_attachments']) {
      const table = tables.find(t => t.name === tableName);
      if (table) {
        console.log(`Table: ${tableName}`);
        console.log('Columns:', table.columns.map(c => `${c.name} (${c.dataType})`));
      } else {
        console.log(`Table: ${tableName} NOT FOUND`);
      }
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await db.destroy();
  }
}

run();
