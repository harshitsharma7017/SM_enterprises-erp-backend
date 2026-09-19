import { pool } from '../src/config/database.js';
import bcrypt from 'bcryptjs';

async function initDb() {
  try {
    console.log('Creating users table if not exists...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ users table ready.');

    const email = 'user@example.com';
    const password = 'password123';
    
    // Check if user exists
    const [rows] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (rows.length === 0) {
      console.log('Seeding default test user...');
      const hash = await bcrypt.hash(password, 10);
      await pool.query(
        'INSERT INTO users (name, email, password_hash, is_active) VALUES (?, ?, ?, ?)',
        ['Test User', email, hash, true]
      );
      console.log(`✅ Test user created. Email: ${email} | Password: ${password}`);
    } else {
      console.log('✅ Test user already exists.');
    }
  } catch (error) {
    console.error('❌ Failed to initialize database:', error);
  } finally {
    await pool.end();
  }
}

initDb();
