import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function test() {
  try {
    console.log('Testing connection to:', process.env.DATABASE_URL ? process.env.DATABASE_URL.split('@').pop() : 'NOT SET');
    const res = await pool.query('SELECT NOW()');
    console.log('Success:', res.rows[0]);
    process.exit(0);
  } catch (err) {
    console.error('Failure:', err);
    process.exit(1);
  }
}

test();
