import { pool } from '../../config/database.js';
import bcrypt from 'bcryptjs';

export const userRepository = {
  findAll: async (limit, offset) => {
    const [rows] = await pool.query(`
      SELECT id, name, email, is_active, created_at, updated_at
      FROM users
      ORDER BY id DESC
      LIMIT ? OFFSET ?
    `, [limit, offset]);
    
    const [countRows] = await pool.query('SELECT COUNT(*) as total FROM users');
    return { data: rows, total: countRows[0].total };
  },

  findById: async (id) => {
    const [rows] = await pool.query(`
      SELECT id, name, email, is_active, created_at, updated_at
      FROM users WHERE id = ?
    `, [id]);
    if (rows.length === 0) return null;

    const user = rows[0];
    const [roles] = await pool.query(`
      SELECT r.id, r.name FROM roles r
      INNER JOIN user_roles ur ON ur.role_id = r.id
      WHERE ur.user_id = ?
    `, [id]);
    user.roles = roles;

    return user;
  },

  create: async (connection, data) => {
    const hash = await bcrypt.hash(data.password, 10);
    const [res] = await connection.query(`
      INSERT INTO users (name, email, password, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, NOW(), NOW())
    `, [data.name, data.email, hash, data.is_active !== undefined ? data.is_active : 1]);
    
    const userId = res.insertId;
    if (data.role_ids && data.role_ids.length > 0) {
      for (const roleId of data.role_ids) {
        await connection.query('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)', [userId, roleId]);
      }
    }
    return userId;
  },

  update: async (connection, id, data) => {
    const fields = ['name = ?', 'email = ?', 'is_active = ?', 'updated_at = NOW()'];
    const values = [data.name, data.email, data.is_active];
    
    if (data.password) {
      const hash = await bcrypt.hash(data.password, 10);
      fields.push('password = ?');
      values.push(hash);
    }
    
    values.push(id);
    await connection.query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
    
    if (data.role_ids) {
      await connection.query('DELETE FROM user_roles WHERE user_id = ?', [id]);
      for (const roleId of data.role_ids) {
        await connection.query('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)', [id, roleId]);
      }
    }
  },

  toggleStatus: async (id) => {
    await pool.query('UPDATE users SET is_active = NOT is_active WHERE id = ?', [id]);
  },

  delete: async (id) => {
    await pool.query('DELETE FROM users WHERE id = ?', [id]);
  }
};
