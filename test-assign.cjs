const { Pool } = require('pg');
const pool = new Pool({
  host: 'localhost',
  user: 'zhamid',
  database: 'pplcrm',
  password: 'Etenrity#1'
});

async function main() {
  try {
    const res = await pool.query('SELECT id, assigned_to FROM emails LIMIT 1');
    console.log('Before:', res.rows[0]);
    if (res.rows.length > 0) {
      const emailId = res.rows[0].id;
      const res2 = await pool.query('UPDATE emails SET assigned_to = 1 WHERE id = $1 RETURNING *', [emailId]);
      console.log('After:', res2.rows[0]);
    }
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

main();
