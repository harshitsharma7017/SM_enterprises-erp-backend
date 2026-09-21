import { pool } from '../../config/database.js';

export const fobValueRepository = {
  findAll: async ({ search, status, sort, direction, page = 1, limit = 15 }) => {
    let query = `
      SELECT id, name, status, remarks, created_at, updated_at
      FROM fob_values
      WHERE deleted_at IS NULL
    `;

    const params = [];

    if (search) {
      query += ` AND (name LIKE ? OR remarks LIKE ?)`;
      const term = `%${search}%`;
      params.push(term, term);
    }

    if (status === 'active' || status === 'inactive') {
      query += ` AND status = ?`;
      params.push(status);
    }

    // Whitelisted sort columns. An unrecognized/absent `sort` falls back to
    // newest-first (id DESC), matching Filterable::scopeSort()'s latest('id').
    const allowedSortFields = {
      'id': 'id',
      'name': 'name',
      'status': 'status',
      'created_at': 'created_at'
    };

    const sortColumn = allowedSortFields[sort];
    const sortField = sortColumn || 'id';
    const sortDirection = sortColumn
      ? (String(direction).toUpperCase() === 'DESC' ? 'DESC' : 'ASC')
      : 'DESC';

    query += ` ORDER BY ${sortField} ${sortDirection}`;

    const [countRows] = await pool.query(`SELECT COUNT(*) as total FROM (${query}) as t`, params);
    const total = countRows[0].total;

    const safeLimit = Number(limit) > 0 ? Number(limit) : 15;
    const safePage = Number(page) > 0 ? Number(page) : 1;
    const offset = (safePage - 1) * safeLimit;

    query += ` LIMIT ? OFFSET ?`;
    params.push(safeLimit, offset);

    const [rows] = await pool.query(query, params);

    return {
      data: rows,
      total,
      page: safePage,
      limit: safeLimit
    };
  },

  findById: async (id) => {
    const [rows] = await pool.query(
      'SELECT id, name, status, remarks, created_by, updated_by, created_at, updated_at, deleted_at FROM fob_values WHERE id = ? AND deleted_at IS NULL',
      [id]
    );
    return rows[0] || null;
  },

  findByIdIncludingRelations: async (id) => {
    const [rows] = await pool.query(
      `SELECT
        f.id, f.name, f.status, f.remarks, f.created_by, f.updated_by, f.created_at, f.updated_at,
        u1.name AS creator_name,
        u2.name AS updater_name
      FROM fob_values f
      LEFT JOIN users u1 ON u1.id = f.created_by
      LEFT JOIN users u2 ON u2.id = f.updated_by
      WHERE f.id = ? AND f.deleted_at IS NULL`,
      [id]
    );
    return rows[0] || null;
  },

  /**
   * Uniqueness deliberately does NOT exclude soft-deleted rows — the
   * database index does not either, matching Store/UpdateFobValueRequest.
   */
  nameExists: async (name, ignoreId = null) => {
    let query = 'SELECT 1 FROM fob_values WHERE name = ?';
    const params = [name];
    if (ignoreId) {
      query += ' AND id != ?';
      params.push(ignoreId);
    }
    const [rows] = await pool.query(query, params);
    return rows.length > 0;
  },

  create: async (data) => {
    const [result] = await pool.query(
      `INSERT INTO fob_values (name, status, remarks, created_by, updated_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
      [data.name, data.status, data.remarks, data.created_by, data.updated_by]
    );
    return result.insertId;
  },

  update: async (id, data) => {
    await pool.query(
      `UPDATE fob_values SET name = ?, status = ?, remarks = ?, updated_by = ?, updated_at = NOW()
       WHERE id = ? AND deleted_at IS NULL`,
      [data.name, data.status, data.remarks, data.updated_by, id]
    );
  },

  toggleStatus: async (id, newStatus, userId) => {
    await pool.query(
      'UPDATE fob_values SET status = ?, updated_by = ?, updated_at = NOW() WHERE id = ? AND deleted_at IS NULL',
      [newStatus, userId, id]
    );
  },

  softDelete: async (id) => {
    await pool.query(
      'UPDATE fob_values SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL',
      [id]
    );
  }
};
