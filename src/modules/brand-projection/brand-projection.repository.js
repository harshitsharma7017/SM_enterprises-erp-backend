import { pool } from '../../config/database.js';
import { companyScope } from '../../services/company-scope.service.js';

const isSet = (v) => v !== undefined && v !== null && v !== '';

export const brandProjectionRepository = {
  findAll: async ({ search, status, company_id, brand_id, period_from, period_to, page = 1, limit = 15 }) => {
    let query = `
      SELECT bp.id, bp.company_id, bp.brand_id, bp.projection_no, bp.financial_year, bp.title,
             bp.period_start, bp.period_end, bp.status, bp.created_at, bp.updated_at,
             br.code AS brand_code, br.name AS brand_name,
             cmp.code AS company_code, COALESCE(cmp.short_name, cmp.name) AS company_label,
             (SELECT COUNT(*) FROM brand_projection_items bpi WHERE bpi.brand_projection_id = bp.id) AS items_count,
             (SELECT COUNT(*) FROM material_requirements mr WHERE mr.brand_projection_id = bp.id) AS requirements_count
      FROM brand_projections bp
      LEFT JOIN brands br ON br.id = bp.brand_id
      LEFT JOIN companies cmp ON cmp.id = bp.company_id
      WHERE bp.deleted_at IS NULL
    `;
    const params = [];

    if (search) {
      query += ' AND (bp.projection_no LIKE ? OR bp.title LIKE ? OR br.name LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term);
    }
    if (status === 'draft' || status === 'finalized') {
      query += ' AND bp.status = ?';
      params.push(status);
    }
    if (isSet(brand_id)) {
      query += ' AND bp.brand_id = ?';
      params.push(Number(brand_id));
    }
    // Period filter: projections whose period overlaps the requested range.
    if (isSet(period_from)) {
      query += ' AND bp.period_end >= ?';
      params.push(period_from);
    }
    if (isSet(period_to)) {
      query += ' AND bp.period_start <= ?';
      params.push(period_to);
    }
    const companyFilter = companyScope.filterSql('bp.company_id', companyScope.parseFilter(company_id));
    query += companyFilter.sql;
    params.push(...companyFilter.params);

    query += ' ORDER BY bp.id DESC';

    const [countRows] = await pool.query(`SELECT COUNT(*) as total FROM (${query}) as t`, params);
    const safeLimit = Number(limit) > 0 ? Number(limit) : 15;
    const safePage = Number(page) > 0 ? Number(page) : 1;
    query += ' LIMIT ? OFFSET ?';
    params.push(safeLimit, (safePage - 1) * safeLimit);

    const [rows] = await pool.query(query, params);
    return { data: rows, total: countRows[0].total, page: safePage, limit: safeLimit };
  },

  /** Header only, for validation and state checks. */
  findHeader: async (id, executor = pool) => {
    const [rows] = await executor.query(
      'SELECT * FROM brand_projections WHERE id = ? AND deleted_at IS NULL',
      [id]
    );
    return rows[0] || null;
  },

  findById: async (id) => {
    const [rows] = await pool.query(`
      SELECT bp.*,
             br.code AS brand_code, br.name AS brand_name, br.status AS brand_status,
             cmp.code AS company_code, COALESCE(cmp.short_name, cmp.name) AS company_label,
             u1.name AS creator_name, u2.name AS updater_name, u3.name AS finalizer_name
      FROM brand_projections bp
      LEFT JOIN brands br ON br.id = bp.brand_id
      LEFT JOIN companies cmp ON cmp.id = bp.company_id
      LEFT JOIN users u1 ON u1.id = bp.created_by
      LEFT JOIN users u2 ON u2.id = bp.updated_by
      LEFT JOIN users u3 ON u3.id = bp.finalized_by
      WHERE bp.id = ? AND bp.deleted_at IS NULL
    `, [id]);
    if (rows.length === 0) return null;
    const projection = rows[0];

    const [items] = await pool.query(`
      SELECT bpi.id, bpi.sort_order, bpi.product_id, bpi.uom_id, bpi.quantity, bpi.remarks,
             p.name AS product_name, p.item_group_code, p.status AS product_status,
             mt.name AS material_type_name,
             u.code AS uom_code, u.name AS uom_name, u.decimal_places AS uom_decimal_places,
             mr.id AS requirement_id, mr.requirement_no, mr.status AS requirement_status
      FROM brand_projection_items bpi
      LEFT JOIN products p ON p.id = bpi.product_id
      LEFT JOIN material_types mt ON mt.id = p.material_type_id
      LEFT JOIN uoms u ON u.id = bpi.uom_id
      LEFT JOIN material_requirements mr ON mr.brand_projection_item_id = bpi.id
      WHERE bpi.brand_projection_id = ?
      ORDER BY bpi.sort_order ASC, bpi.id ASC
    `, [id]);

    projection.items = items;
    return projection;
  },

  create: async (connection, data) => {
    const [result] = await connection.query(`
      INSERT INTO brand_projections (
        company_id, brand_id, projection_no, financial_year, title, period_start, period_end,
        status, remarks, created_by, updated_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?, NOW(), NOW())
    `, [
      data.company_id, data.brand_id, data.projection_no, data.financial_year, data.title,
      data.period_start, data.period_end, data.remarks, data.created_by, data.updated_by,
    ]);
    return result.insertId;
  },

  update: async (connection, id, data) => {
    await connection.query(`
      UPDATE brand_projections SET
        company_id = ?, brand_id = ?, title = ?, period_start = ?, period_end = ?, remarks = ?,
        updated_by = ?, updated_at = NOW()
      WHERE id = ? AND deleted_at IS NULL
    `, [data.company_id, data.brand_id, data.title, data.period_start, data.period_end, data.remarks, data.updated_by, id]);
  },

  /** Delete-then-recreate, like the inquiry/OC item sync — only ever called on a draft. */
  replaceItems: async (connection, projectionId, items) => {
    await connection.query('DELETE FROM brand_projection_items WHERE brand_projection_id = ?', [projectionId]);
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      await connection.query(`
        INSERT INTO brand_projection_items (brand_projection_id, sort_order, product_id, uom_id, quantity, remarks)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [projectionId, i, item.product_id, item.uom_id, item.quantity, item.remarks || null]);
    }
  },

  setStatus: async (connection, id, status, userId) => {
    const finalizing = status === 'finalized';
    await connection.query(`
      UPDATE brand_projections SET
        status = ?, finalized_at = ${finalizing ? 'NOW()' : 'NULL'}, finalized_by = ?,
        updated_by = ?, updated_at = NOW()
      WHERE id = ?
    `, [status, finalizing ? userId : null, userId, id]);
  },

  softDelete: async (id) => {
    await pool.query('UPDATE brand_projections SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL', [id]);
  },

  countItems: async (connection, id) => {
    const [rows] = await connection.query('SELECT COUNT(*) as cnt FROM brand_projection_items WHERE brand_projection_id = ?', [id]);
    return rows[0].cnt;
  },

  countRequirements: async (connection, id) => {
    const [rows] = await connection.query('SELECT COUNT(*) as cnt FROM material_requirements WHERE brand_projection_id = ?', [id]);
    return rows[0].cnt;
  },

  // -- Lookups for validation --

  findBrand: async (id) => {
    const [rows] = await pool.query(
      'SELECT id, company_id, status FROM brands WHERE id = ? AND deleted_at IS NULL',
      [id]
    );
    return rows[0] || null;
  },

  /** Products with the facts projection lines are validated against. */
  findProductsForValidation: async (ids) => {
    if (ids.length === 0) return [];
    const [rows] = await pool.query(`
      SELECT p.id, p.name, p.company_id, p.status, p.uom_id, p.material_type_id,
             mt.company_id AS material_type_company_id,
             u.id AS uom_exists, u.decimal_places AS uom_decimal_places
      FROM products p
      LEFT JOIN material_types mt ON mt.id = p.material_type_id
      LEFT JOIN uoms u ON u.id = p.uom_id AND u.deleted_at IS NULL
      WHERE p.id IN (?) AND p.deleted_at IS NULL
    `, [ids]);
    return rows;
  },

  /** Line facts of a saved projection, re-checked on finalize. */
  findItemsForValidation: async (connection, projectionId) => {
    const [rows] = await connection.query(`
      SELECT bpi.product_id, bpi.quantity, p.name, p.company_id, p.status, p.deleted_at,
             p.uom_id, bpi.uom_id AS line_uom_id
      FROM brand_projection_items bpi
      LEFT JOIN products p ON p.id = bpi.product_id
      WHERE bpi.brand_projection_id = ?
    `, [projectionId]);
    return rows;
  },

  // -- Form data --

  /** Active brands of every company (plus `includeBrandId`); the form narrows by company. */
  getBrandsForForm: async (includeBrandId = null) => {
    const params = [];
    let query = `SELECT id, company_id, code, name, status FROM brands WHERE deleted_at IS NULL AND (status = 'active'`;
    if (includeBrandId) {
      query += ' OR id = ?';
      params.push(includeBrandId);
    }
    query += ') ORDER BY name ASC';
    const [rows] = await pool.query(query, params);
    return rows;
  },

  /** Active, company-owned products that have a UOM — the only ones a projection line may use. */
  getProductsForForm: async () => {
    const [rows] = await pool.query(`
      SELECT p.id, p.company_id, p.name, p.item_group_code,
             mt.name AS material_type_name,
             u.id AS uom_id, u.code AS uom_code, u.name AS uom_name, u.decimal_places AS uom_decimal_places
      FROM products p
      JOIN uoms u ON u.id = p.uom_id AND u.deleted_at IS NULL
      LEFT JOIN material_types mt ON mt.id = p.material_type_id
      WHERE p.deleted_at IS NULL AND p.status = 'active' AND p.company_id IS NOT NULL
      ORDER BY p.name ASC
    `);
    return rows;
  },
};
