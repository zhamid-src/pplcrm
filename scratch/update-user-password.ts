import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import bcrypt from 'bcrypt';

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
    const hash = bcrypt.hashSync('StrongPassword123!', 10);
    const result = await db.updateTable('authusers')
      .set({ password: hash })
      .where('email', '=', 'hello@pplcrm.com')
      .execute();
    console.log('Password updated successfully for hello@pplcrm.com:', result);
  } catch (err) {
    console.error('Error updating password:', err);
  } finally {
    await db.destroy();
  }
}

run();
