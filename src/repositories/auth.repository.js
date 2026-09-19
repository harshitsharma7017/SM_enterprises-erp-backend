import { pool } from '../config/database.js';

export const authRepository = {
  findUserByEmail: async (email) => {
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
    return rows[0] || null;
  },

  findUserById: async (id) => {
    const [rows] = await pool.query('SELECT id, name, email, is_active, created_at, updated_at FROM users WHERE id = ? LIMIT 1', [id]);
    return rows[0] || null;
  }
};
