const { Pool } = require('pg');
const pool = new Pool({
  user: 'zeehamid',
  database: 'pplcrm',
  password: 'Eternity#1',
  host: 'localhost',
  port: 5432
});

async function run() {
  const res = await pool.query("UPDATE emails SET assigned_to = '2' WHERE id = '29' RETURNING *");
  console.log(res.rows[0].assigned_to);
  process.exit(0);
}
run();
