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
  queueLimit: 0
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
