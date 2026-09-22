import { pool } from '../../config/database.js';
import bcrypt from 'bcryptjs';

// Original ERP: User::scopeSearch()/scopeWithRole() — free-text search across
// name/email/phone, plus an exact role-name filter and a status filter.
const buildListFilters = ({ search, role, status }) => {
  const joins = [];
  const conditions = [];
  const params = [];

  if (search) {
    conditions.push('(u.name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  if (role) {
    joins.push('INNER JOIN user_roles ur_f ON ur_f.user_id = u.id INNER JOIN roles r_f ON r_f.id = ur_f.role_id AND r_f.name = ?');
    params.push(role);
  }

  if (status === '1' || status === '0') {
    conditions.push('u.is_active = ?');
    params.push(status === '1' ? 1 : 0);
  }

  return { joins, conditions, params };
};

export const userRepository = {
  findAll: async (filters, limit, offset) => {
    const { joins, conditions, params } = buildListFilters(filters);
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const joinClause = joins.join(' ');

    const [rows] = await pool.query(`
      SELECT u.id, u.name, u.email, u.phone, u.is_active, u.created_at, u.updated_at
      FROM users u
      ${joinClause}
      ${whereClause}
      ORDER BY u.id DESC
      LIMIT ? OFFSET ?
    `, [...params, limit, offset]);

    const [countRows] = await pool.query(`
      SELECT COUNT(DISTINCT u.id) as total
      FROM users u
      ${joinClause}
      ${whereClause}
    `, params);

    if (rows.length > 0) {
      const [roleRows] = await pool.query(`
        SELECT ur.user_id, r.id, r.name FROM roles r
        INNER JOIN user_roles ur ON ur.role_id = r.id
        WHERE ur.user_id IN (?)
      `, [rows.map((r) => r.id)]);

      const rolesByUser = new Map();
      for (const row of roleRows) {
        if (!rolesByUser.has(row.user_id)) rolesByUser.set(row.user_id, []);
        rolesByUser.get(row.user_id).push({ id: row.id, name: row.name });
      }
      for (const user of rows) {
        user.roles = rolesByUser.get(user.id) || [];
      }
    }

    return { data: rows, total: countRows[0].total };
  },

  findById: async (id) => {
    const [rows] = await pool.query(`
      SELECT id, name, email, phone, is_active, created_at, updated_at
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
      INSERT INTO users (name, email, phone, password, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, NOW(), NOW())
    `, [data.name, data.email, data.phone || null, hash, data.is_active !== undefined ? data.is_active : 1]);

    const userId = res.insertId;
    if (data.role_ids && data.role_ids.length > 0) {
      for (const roleId of data.role_ids) {
        await connection.query('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)', [userId, roleId]);
      }
    }
    return userId;
  },

  update: async (connection, id, data) => {
    const fields = ['name = ?', 'email = ?', 'phone = ?', 'is_active = ?', 'updated_at = NOW()'];
    const values = [data.name, data.email, data.phone || null, data.is_active];

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
