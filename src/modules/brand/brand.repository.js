import { pool } from '../../config/database.js';
import { companyScope } from '../../services/company-scope.service.js';

export const brandRepository = {
  findAll: async ({ search, status, company_id, page = 1, limit = 15 }) => {
    let query = `
      SELECT br.id, br.company_id, br.code, br.name, br.status, br.created_at, br.updated_at,
             cmp.code AS company_code, COALESCE(cmp.short_name, cmp.name) AS company_label
      FROM brands br
      LEFT JOIN companies cmp ON cmp.id = br.company_id
      WHERE br.deleted_at IS NULL
    `;
    const params = [];

    if (search) {
      query += ' AND (br.code LIKE ? OR br.name LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term);
    }

    if (status === 'active' || status === 'inactive') {
      query += ' AND br.status = ?';
      params.push(status);
    }

    const companyFilter = companyScope.filterSql('br.company_id', companyScope.parseFilter(company_id));
    query += companyFilter.sql;
    params.push(...companyFilter.params);

    query += ' ORDER BY br.name ASC';

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
      SELECT br.*, cmp.code AS company_code, COALESCE(cmp.short_name, cmp.name) AS company_label,
             u1.name AS creator_name, u2.name AS updater_name
      FROM brands br
      LEFT JOIN companies cmp ON cmp.id = br.company_id
      LEFT JOIN users u1 ON u1.id = br.created_by
      LEFT JOIN users u2 ON u2.id = br.updated_by
      WHERE br.id = ? AND br.deleted_at IS NULL
    `, [id]);
    return rows[0] || null;
  },

  /**
   * Uniqueness is per company and deliberately includes soft-deleted rows,
   * matching the (company_id, code|name) unique indexes.
   */
  fieldExists: async (companyId, field, value, ignoreId = null) => {
    let query = `SELECT 1 FROM brands WHERE company_id = ? AND ${field} = ?`;
    const params = [companyId, value];
    if (ignoreId) {
      query += ' AND id != ?';
      params.push(ignoreId);
    }
    const [rows] = await pool.query(query, params);
    return rows.length > 0;
  },

  create: async (data, executor = pool) => {
    const [result] = await executor.query(`
      INSERT INTO brands (company_id, code, name, status, created_by, updated_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
    `, [data.company_id, data.code, data.name, data.status, data.created_by, data.updated_by]);
    return result.insertId;
  },

  update: async (id, data) => {
    await pool.query(`
      UPDATE brands SET company_id = ?, code = ?, name = ?, status = ?, updated_by = ?, updated_at = NOW()
      WHERE id = ? AND deleted_at IS NULL
    `, [data.company_id, data.code, data.name, data.status, data.updated_by, id]);
  },

  toggleStatus: async (id, newStatus, userId) => {
    await pool.query(
      'UPDATE brands SET status = ?, updated_by = ?, updated_at = NOW() WHERE id = ? AND deleted_at IS NULL',
      [newStatus, userId, id]
    );
  },

  /** Brand projections (including soft-deleted ones) referencing this brand. */
  countProjections: async (id) => {
    const [rows] = await pool.query('SELECT COUNT(*) as cnt FROM brand_projections WHERE brand_id = ?', [id]);
    return rows[0].cnt;
  },

  softDelete: async (id) => {
    await pool.query('UPDATE brands SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL', [id]);
  },
};
