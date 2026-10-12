import bcrypt from 'bcryptjs';
import { pool } from '../src/config/database.js';
import { config } from '../src/config/env.js';

const email = process.argv[2] || config.superAdminEmail || 'admin@yourcompany.com';
const password = process.argv[3] || 'Admin@123';
const name = process.argv[4] || 'Admin';

async function createAdmin() {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const hashedPassword = bcrypt.hashSync(password, 10);

    // Check if user exists
    const [existing] = await connection.query('SELECT id FROM users WHERE email = ?', [email]);
    let userId;

    if (existing.length > 0) {
      userId = existing[0].id;
      await connection.query(
        'UPDATE users SET password = ?, is_active = 1, updated_at = NOW() WHERE id = ?',
        [hashedPassword, userId]
      );
      console.log(`ℹ️ Updated password and activated existing user with ID ${userId}.`);
    } else {
      const [result] = await connection.query(
        'INSERT INTO users (name, email, password, is_active, created_at, updated_at) VALUES (?, ?, ?, 1, NOW(), NOW())',
        [name, email, hashedPassword]
      );
      userId = result.insertId;
      console.log(`✅ Created new user with ID ${userId}.`);
    }

    // Assign Super Admin role
    const [roles] = await connection.query('SELECT id FROM roles WHERE name = ?', ['Super Admin']);
    if (roles.length > 0) {
      await connection.query(
        'INSERT IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)',
        [userId, roles[0].id]
      );
      console.log(`✅ Assigned 'Super Admin' role.`);
    } else {
      console.warn(`⚠️ 'Super Admin' role not found. Ensure 'npm run seed:rbac' has been executed.`);
    }

    await connection.commit();
    console.log('\n--- Admin Credentials ---');
    console.log(`Name:     ${name}`);
    console.log(`Email:    ${email}`);
    console.log(`Password: ${password}`);
    console.log('-------------------------\n');
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('❌ Failed to create admin user:', error.message);
    process.exit(1);
  } finally {
    if (connection) connection.release();
    process.exit(0);
  }
}

createAdmin();
