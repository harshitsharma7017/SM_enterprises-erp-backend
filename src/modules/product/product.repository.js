import { pool } from '../../config/database.js';
import { companyScope } from '../../services/company-scope.service.js';

export const productRepository = {
  findAll: async ({ search, status, category_id, company_id, sort, direction, page = 1, limit = 10 }) => {
    let query = `
      SELECT
        p.id, p.category_id, p.item_group_code, p.name, p.name_on_export_document,
        p.barcode, p.unit_po, p.unit_export, p.hsn_code, p.status,
        p.created_at, p.updated_at,
        c.name AS category_name,
        gr.rate AS gst_rate,
        p.company_id, co.code AS company_code, COALESCE(co.short_name, co.name) AS company_label
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN gst_rates gr ON gr.id = p.gst_rate_id
      LEFT JOIN companies co ON co.id = p.company_id
      WHERE p.deleted_at IS NULL
    `;

    const params = [];

    if (search) {
      query += ` AND (
        p.item_group_code LIKE ? OR p.name LIKE ? OR p.name_on_export_document LIKE ?
        OR p.hsn_code LIKE ? OR p.barcode LIKE ? OR p.unit_po LIKE ?
      )`;
      const term = `%${search}%`;
      params.push(term, term, term, term, term, term);
    }

    if (status === 'active' || status === 'inactive') {
      query += ` AND p.status = ?`;
      params.push(status);
    }

    if (category_id !== undefined && category_id !== null && category_id !== '') {
      query += ` AND p.category_id = ?`;
      params.push(Number(category_id));
    }

    const companyFilter = companyScope.filterSql('p.company_id', companyScope.parseFilter(company_id));
    query += companyFilter.sql;
    params.push(...companyFilter.params);

    // Whitelisted sort columns. An unrecognized/absent `sort` falls back to
    // newest-first (id DESC), matching Filterable::scopeSort()'s latest('id').
    const allowedSortFields = {
      'id': 'p.id',
      'item_group_code': 'p.item_group_code',
      'name': 'p.name',
      'status': 'p.status',
      'created_at': 'p.created_at'
    };

    const sortColumn = allowedSortFields[sort];
    const sortField = sortColumn || 'p.id';
    const sortDirection = sortColumn
      ? (String(direction).toUpperCase() === 'DESC' ? 'DESC' : 'ASC')
      : 'DESC';

    query += ` ORDER BY ${sortField} ${sortDirection}`;

    const [countRows] = await pool.query(`SELECT COUNT(*) as total FROM (${query}) as t`, params);
    const total = countRows[0].total;

    const safeLimit = Number(limit) > 0 ? Number(limit) : 10;
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
      'SELECT * FROM products WHERE id = ? AND deleted_at IS NULL',
      [id]
    );
    return rows[0] || null;
  },

  findByIdIncludingRelations: async (id) => {
    const [rows] = await pool.query(
      `SELECT
        p.*,
        c.name AS category_name,
        pb.code AS price_band_code, pb.name AS price_band_name,
        gr.rate AS gst_rate,
        u1.name AS creator_name,
        u2.name AS updater_name,
        co.code AS company_code, COALESCE(co.short_name, co.name) AS company_label
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN price_bands pb ON pb.id = p.price_band_id
      LEFT JOIN gst_rates gr ON gr.id = p.gst_rate_id
      LEFT JOIN companies co ON co.id = p.company_id
      LEFT JOIN users u1 ON u1.id = p.created_by
      LEFT JOIN users u2 ON u2.id = p.updated_by
      WHERE p.id = ? AND p.deleted_at IS NULL`,
      [id]
    );

    if (rows.length === 0) return null;
    const product = rows[0];

    const [incentives] = await pool.query(
      `SELECT id, scheme, percent_1, percent_2, cap_value, calculation_basis_id
       FROM product_incentives WHERE product_id = ? ORDER BY id ASC`,
      [id]
    );

    const [bomItems] = await pool.query(
      `SELECT id, sort_order, component_name, qty, unit, is_custom, remarks
       FROM product_bom_items WHERE product_id = ? ORDER BY sort_order ASC`,
      [id]
    );

    return { ...product, incentives, bom_items: bomItems };
  },

  /**
   * Uniqueness deliberately INCLUDES soft-deleted rows, matching Laravel:
   * the unique index has no knowledge of deleted_at, so a deleted product's
   * code/name permanently blocks reuse.
   */
  itemGroupCodeExists: async (code, ignoreId = null) => {
    let query = 'SELECT 1 FROM products WHERE item_group_code = ?';
    const params = [code];
    if (ignoreId) {
      query += ' AND id != ?';
      params.push(ignoreId);
    }
    const [rows] = await pool.query(query, params);
    return rows.length > 0;
  },

  nameExists: async (name, ignoreId = null) => {
    let query = 'SELECT 1 FROM products WHERE name = ?';
    const params = [name];
    if (ignoreId) {
      query += ' AND id != ?';
      params.push(ignoreId);
    }
    const [rows] = await pool.query(query, params);
    return rows.length > 0;
  },

  /**
   * Raw existence checks for FK validation, matching Laravel's
   * Rule::exists() — a direct table check that is NOT scoped by any
   * model's soft-delete global scope.
   */
  categoryExists: async (id) => {
    const [rows] = await pool.query('SELECT 1 FROM categories WHERE id = ?', [id]);
    return rows.length > 0;
  },

  priceBandExists: async (id) => {
    const [rows] = await pool.query('SELECT 1 FROM price_bands WHERE id = ?', [id]);
    return rows.length > 0;
  },

  gstRateExists: async (id) => {
    const [rows] = await pool.query('SELECT 1 FROM gst_rates WHERE id = ?', [id]);
    return rows.length > 0;
  },

  calculationBasisExists: async (id) => {
    const [rows] = await pool.query('SELECT 1 FROM calculation_bases WHERE id = ?', [id]);
    return rows.length > 0;
  },

  create: async (connection, data) => {
    const [result] = await connection.query(
      `INSERT INTO products (
        company_id, category_id, item_group_code, name, name_on_export_document, barcode,
        unit_po, unit_export, hsn_code, drawback_sr_no, price_band_id, gst_rate_id,
        fabric_length_mtr, fabric_width_inch, sq_mtr_per_unit, description, status, remarks,
        created_by, updated_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        data.company_id, data.category_id, data.item_group_code, data.name, data.name_on_export_document,
        data.barcode, data.unit_po, data.unit_export, data.hsn_code,
        data.drawback_sr_no, data.price_band_id, data.gst_rate_id,
        data.fabric_length_mtr, data.fabric_width_inch, data.sq_mtr_per_unit,
        data.description, data.status, data.remarks,
        data.created_by, data.updated_by
      ]
    );
    return result.insertId;
  },

  update: async (connection, id, data) => {
    await connection.query(
      `UPDATE products SET
        company_id = ?, category_id = ?, item_group_code = ?, name = ?, name_on_export_document = ?, barcode = ?,
        unit_po = ?, unit_export = ?, hsn_code = ?, drawback_sr_no = ?, price_band_id = ?, gst_rate_id = ?,
        fabric_length_mtr = ?, fabric_width_inch = ?, sq_mtr_per_unit = ?, description = ?, status = ?, remarks = ?,
        updated_by = ?, updated_at = NOW()
      WHERE id = ? AND deleted_at IS NULL`,
      [
        data.company_id, data.category_id, data.item_group_code, data.name, data.name_on_export_document, data.barcode,
        data.unit_po, data.unit_export, data.hsn_code, data.drawback_sr_no, data.price_band_id, data.gst_rate_id,
        data.fabric_length_mtr, data.fabric_width_inch, data.sq_mtr_per_unit, data.description, data.status, data.remarks,
        data.updated_by, id
      ]
    );
  },

  toggleStatus: async (id, newStatus, userId) => {
    await pool.query(
      'UPDATE products SET status = ?, updated_by = ?, updated_at = NOW() WHERE id = ? AND deleted_at IS NULL',
      [newStatus, userId, id]
    );
  },

  softDelete: async (id) => {
    await pool.query(
      'UPDATE products SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL',
      [id]
    );
  },

  // -- Export incentives: per-scheme upsert/delete, not delete-and-reinsert --

  upsertIncentive: async (connection, productId, scheme, data) => {
    await connection.query(
      `INSERT INTO product_incentives (
        product_id, scheme, percent_1, percent_2, cap_value, calculation_basis_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
      ON DUPLICATE KEY UPDATE
        percent_1 = VALUES(percent_1),
        percent_2 = VALUES(percent_2),
        cap_value = VALUES(cap_value),
        calculation_basis_id = VALUES(calculation_basis_id),
        updated_at = NOW()`,
      [productId, scheme, data.percent_1, data.percent_2, data.cap_value, data.calculation_basis_id]
    );
  },

  deleteIncentiveByScheme: async (connection, productId, scheme) => {
    await connection.query(
      'DELETE FROM product_incentives WHERE product_id = ? AND scheme = ?',
      [productId, scheme]
    );
  },

  // -- BOM: full delete-and-reinsert, per Laravel's syncBomItems() --

  deleteBomItems: async (connection, productId) => {
    await connection.query('DELETE FROM product_bom_items WHERE product_id = ?', [productId]);
  },

  insertBomItem: async (connection, productId, row) => {
    await connection.query(
      `INSERT INTO product_bom_items (
        product_id, sort_order, component_name, qty, unit, is_custom, remarks, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [productId, row.sort_order, row.component_name, row.qty, row.unit, row.is_custom ? 1 : 0, row.remarks]
    );
  },

  // -- Lookup/dropdown data for the create/edit forms --

  getCategoriesForForm: async (includeId = null) => {
    const params = ['active'];
    let query = `SELECT id, name FROM categories WHERE deleted_at IS NULL AND (status = ?`;
    if (includeId) {
      query += ' OR id = ?';
      params.push(includeId);
    }
    query += ') ORDER BY name ASC';
    const [rows] = await pool.query(query, params);
    return rows;
  },

  getPriceBandsForForm: async (includeId = null) => {
    const params = ['active'];
    let query = `SELECT id, code, name FROM price_bands WHERE (status = ?`;
    if (includeId) {
      query += ' OR id = ?';
      params.push(includeId);
    }
    query += ') ORDER BY code ASC';
    const [rows] = await pool.query(query, params);
    return rows;
  },

  getGstRatesForForm: async (includeId = null) => {
    const params = ['active'];
    let query = `SELECT id, rate FROM gst_rates WHERE (status = ?`;
    if (includeId) {
      query += ' OR id = ?';
      params.push(includeId);
    }
    query += ') ORDER BY rate ASC';
    const [rows] = await pool.query(query, params);
    return rows;
  },

  // Laravel's formData() does NOT union the current product's calculation
  // basis in here — calculation_basis_id lives on each incentive row, not
  // on the product itself, and the source never applies this pattern to it.
  getActiveCalculationBases: async () => {
    const [rows] = await pool.query(
      'SELECT id, name FROM calculation_bases WHERE status = ? ORDER BY name ASC',
      ['active']
    );
    return rows;
  },

  getDistinctUnits: async () => {
    const [rows] = await pool.query(
      "SELECT DISTINCT name FROM document_format_units WHERE name IS NOT NULL AND name <> '' ORDER BY name ASC"
    );
    return rows.map((r) => r.name);
  },

  // -- GST rate quick-add (writes to gst_rates only, never to products) --

  findGstRateByRate: async (rate) => {
    const [rows] = await pool.query('SELECT id, rate, status FROM gst_rates WHERE rate = ?', [rate]);
    return rows[0] || null;
  },

  createGstRate: async (rate) => {
    const [result] = await pool.query(
      'INSERT INTO gst_rates (rate, status, created_at, updated_at) VALUES (?, ?, NOW(), NOW())',
      [rate, 'active']
    );
    return result.insertId;
  }
};
