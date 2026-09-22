import mysql from 'mysql2/promise';
import { config } from './env.js';

const pool = mysql.createPool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.name,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // Without this, mysql2 hands back DATE/DATETIME columns as JS Date objects
  // built at local-server-midnight; Express's default JSON serialization then
  // calls toISOString() (always UTC), which silently shifts a plain calendar
  // date backward by a day whenever the server's timezone is ahead of UTC
  // (e.g. IST). DATE-only columns (inquiry_date, oc_date, po_date, etc.) have
  // no time component to begin with, so returning them as plain "YYYY-MM-DD"
  // strings removes the ambiguity entirely instead of round-tripping through
  // a timezone-bearing Date object. Discovered via a real off-by-one-day bug
  // on Inquiry's date fields while verifying Phase 4A.
  dateStrings: true
});

export async function testConnection() {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query('SELECT 1 as result');
    if (rows[0].result === 1) {
      console.log(`✅ Successfully connected to MySQL database: ${config.db.name}`);
    }
    connection.release();
  } catch (error) {
    console.error('❌ Database connection failed. Please check your credentials and ensure MySQL is running.');
    console.error('Error message:', error.message);
    process.exit(1);
  }
}

export { pool };
