import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import bcrypt from 'bcrypt';

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
    const hash = bcrypt.hashSync('StrongPassword123!', 10);
    const result = await db.updateTable('authusers')
      .set({ password: hash })
      .where('email', '=', 'zhamid@gmail.com')
      .execute();
    console.log('Password updated successfully for zhamid@gmail.com:', result);
  } catch (err) {
    console.error('Error updating password:', err);
  } finally {
    await db.destroy();
  }
}

run();
