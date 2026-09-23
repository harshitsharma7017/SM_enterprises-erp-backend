import { pool } from '../../config/database.js';
import { companyScope } from '../../services/company-scope.service.js';

export const materialTypeRepository = {
  findAll: async ({ search, status, company_id, page = 1, limit = 15 }) => {
    let query = `
      SELECT mt.id, mt.company_id, mt.code, mt.name, mt.status, mt.created_at, mt.updated_at,
             cmp.code AS company_code, COALESCE(cmp.short_name, cmp.name) AS company_label,
             (SELECT COUNT(*) FROM products p WHERE p.material_type_id = mt.id AND p.deleted_at IS NULL) AS products_count
      FROM material_types mt
      LEFT JOIN companies cmp ON cmp.id = mt.company_id
      WHERE mt.deleted_at IS NULL
    `;
    const params = [];

    if (search) {
      query += ' AND (mt.code LIKE ? OR mt.name LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term);
    }

    if (status === 'active' || status === 'inactive') {
      query += ' AND mt.status = ?';
      params.push(status);
    }

    const companyFilter = companyScope.filterSql('mt.company_id', companyScope.parseFilter(company_id));
    query += companyFilter.sql;
    params.push(...companyFilter.params);

    query += ' ORDER BY mt.name ASC';

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
      SELECT mt.*, cmp.code AS company_code, COALESCE(cmp.short_name, cmp.name) AS company_label,
             u1.name AS creator_name, u2.name AS updater_name
      FROM material_types mt
      LEFT JOIN companies cmp ON cmp.id = mt.company_id
      LEFT JOIN users u1 ON u1.id = mt.created_by
      LEFT JOIN users u2 ON u2.id = mt.updated_by
      WHERE mt.id = ? AND mt.deleted_at IS NULL
    `, [id]);
    return rows[0] || null;
  },

  /**
   * Uniqueness is per company and deliberately includes soft-deleted rows,
   * matching the (company_id, code|name) unique indexes.
   */
  fieldExists: async (companyId, field, value, ignoreId = null) => {
    let query = `SELECT 1 FROM material_types WHERE company_id = ? AND ${field} = ?`;
    const params = [companyId, value];
    if (ignoreId) {
      query += ' AND id != ?';
      params.push(ignoreId);
    }
    const [rows] = await pool.query(query, params);
    return rows.length > 0;
  },

  create: async (data) => {
    const [result] = await pool.query(`
      INSERT INTO material_types (company_id, code, name, status, created_by, updated_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
    `, [data.company_id, data.code, data.name, data.status, data.created_by, data.updated_by]);
    return result.insertId;
  },

  update: async (id, data) => {
    await pool.query(`
      UPDATE material_types SET company_id = ?, code = ?, name = ?, status = ?, updated_by = ?, updated_at = NOW()
      WHERE id = ? AND deleted_at IS NULL
    `, [data.company_id, data.code, data.name, data.status, data.updated_by, id]);
  },

  toggleStatus: async (id, newStatus, userId) => {
    await pool.query(
      'UPDATE material_types SET status = ?, updated_by = ?, updated_at = NOW() WHERE id = ? AND deleted_at IS NULL',
      [newStatus, userId, id]
    );
  },

  /** Products (including soft-deleted ones, which still hold the FK) using this type. */
  countProducts: async (id) => {
    const [rows] = await pool.query('SELECT COUNT(*) as cnt FROM products WHERE material_type_id = ?', [id]);
    return rows[0].cnt;
  },

  softDelete: async (id) => {
    await pool.query('UPDATE material_types SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL', [id]);
  },
};
