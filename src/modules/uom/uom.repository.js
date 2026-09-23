import { pool } from '../../config/database.js';

export const uomRepository = {
  findAll: async ({ search, status, page = 1, limit = 15 }) => {
    let query = `
      SELECT u.id, u.code, u.name, u.decimal_places, u.status, u.created_at, u.updated_at,
             (SELECT COUNT(*) FROM products p WHERE p.uom_id = u.id AND p.deleted_at IS NULL) AS products_count
      FROM uoms u
      WHERE u.deleted_at IS NULL
    `;
    const params = [];

    if (search) {
      query += ' AND (u.code LIKE ? OR u.name LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term);
    }

    if (status === 'active' || status === 'inactive') {
      query += ' AND u.status = ?';
      params.push(status);
    }

    query += ' ORDER BY u.code ASC';

    const [countRows] = await pool.query(`SELECT COUNT(*) as total FROM (${query}) as t`, params);

    const safeLimit = Number(limit) > 0 ? Number(limit) : 15;
    const safePage = Number(page) > 0 ? Number(page) : 1;
    query += ' LIMIT ? OFFSET ?';
    params.push(safeLimit, (safePage - 1) * safeLimit);

    const [rows] = await pool.query(query, params);
    return { data: rows, total: countRows[0].total, page: safePage, limit: safeLimit };
  },

  findById: async (id) => {
    const [rows] = await pool.query(`
      SELECT u.*, u1.name AS creator_name, u2.name AS updater_name
      FROM uoms u
      LEFT JOIN users u1 ON u1.id = u.created_by
      LEFT JOIN users u2 ON u2.id = u.updated_by
      WHERE u.id = ? AND u.deleted_at IS NULL
    `, [id]);
    return rows[0] || null;
  },

  /** Deliberately includes soft-deleted rows, matching the unique indexes. */
  fieldExists: async (field, value, ignoreId = null) => {
    let query = `SELECT 1 FROM uoms WHERE ${field} = ?`;
    const params = [value];
    if (ignoreId) {
      query += ' AND id != ?';
      params.push(ignoreId);
    }
    const [rows] = await pool.query(query, params);
    return rows.length > 0;
  },

  create: async (data) => {
    const [result] = await pool.query(`
      INSERT INTO uoms (code, name, decimal_places, status, created_by, updated_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
    `, [data.code, data.name, data.decimal_places, data.status, data.created_by, data.updated_by]);
    return result.insertId;
  },

  update: async (id, data) => {
    await pool.query(`
      UPDATE uoms SET code = ?, name = ?, decimal_places = ?, status = ?, updated_by = ?, updated_at = NOW()
      WHERE id = ? AND deleted_at IS NULL
    `, [data.code, data.name, data.decimal_places, data.status, data.updated_by, id]);
  },

  toggleStatus: async (id, newStatus, userId) => {
    await pool.query(
      'UPDATE uoms SET status = ?, updated_by = ?, updated_at = NOW() WHERE id = ? AND deleted_at IS NULL',
      [newStatus, userId, id]
    );
  },

  /** Products (including soft-deleted ones, which still hold the FK) using this unit. */
  countProducts: async (id) => {
    const [rows] = await pool.query('SELECT COUNT(*) as cnt FROM products WHERE uom_id = ?', [id]);
    return rows[0].cnt;
  },

  softDelete: async (id) => {
    await pool.query('UPDATE uoms SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL', [id]);
  },
};
