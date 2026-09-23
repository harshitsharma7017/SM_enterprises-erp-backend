import { pool } from '../../config/database.js';
import { companyScope } from '../../services/company-scope.service.js';

export const supplierRepository = {
  findAll: async ({ search, status, party_type, category_id, company_id, sort, direction, page = 1, limit = 15 }) => {
    let query = `
      SELECT
        s.id, s.display_code, s.party_type, s.company_name, s.name_on_bill,
        s.credit_days, s.status, s.created_at, s.updated_at,
        s.company_id, cmp.code AS company_code, COALESCE(cmp.short_name, cmp.name) AS company_label,
        ci.name AS city_name, st.name AS state_name,
        sty.name AS supplier_type_name,
        a.name AS agent_name, a.display_code AS agent_display_code,
        (SELECT COUNT(*) FROM supplier_category sc2 WHERE sc2.supplier_id = s.id) AS categories_count,
        (SELECT sc.name FROM supplier_contacts sc WHERE sc.supplier_id = s.id AND sc.is_primary = 1 LIMIT 1) AS primary_contact_name,
        (SELECT d.name FROM supplier_contacts sc JOIN designations d ON d.id = sc.designation_id
         WHERE sc.supplier_id = s.id AND sc.is_primary = 1 LIMIT 1) AS primary_contact_designation_name
      FROM suppliers s
      LEFT JOIN cities ci ON ci.id = s.city_id
      LEFT JOIN states st ON st.id = s.state_id
      LEFT JOIN supplier_types sty ON sty.id = s.supplier_type_id
      LEFT JOIN agents a ON a.id = s.agent_id
      LEFT JOIN companies cmp ON cmp.id = s.company_id
      WHERE s.deleted_at IS NULL
    `;

    const params = [];

    // A company filter also returns shared (company_id NULL) suppliers,
    // since those are usable by every company.
    const companyFilter = companyScope.filterSql('s.company_id', companyScope.parseFilter(company_id), { includeShared: true });
    query += companyFilter.sql;
    params.push(...companyFilter.params);

    // ofParty(): blank/unrecognized party_type applies no filter; 'both'
    // matches only 'both'; supplier/jobber matches itself plus 'both'.
    if (party_type === 'both') {
      query += ` AND s.party_type = ?`;
      params.push('both');
    } else if (party_type === 'supplier' || party_type === 'jobber') {
      query += ` AND s.party_type IN (?, 'both')`;
      params.push(party_type);
    }

    if (search) {
      query += ` AND (
        s.display_code LIKE ? OR s.company_name LIKE ? OR s.name_on_bill LIKE ?
        OR s.gst_number LIKE ? OR s.pan_number LIKE ?
        OR EXISTS (SELECT 1 FROM states st2 WHERE st2.id = s.state_id AND st2.name LIKE ?)
        OR EXISTS (SELECT 1 FROM cities ci2 WHERE ci2.id = s.city_id AND ci2.name LIKE ?)
        OR EXISTS (SELECT 1 FROM supplier_contacts sc3 WHERE sc3.supplier_id = s.id AND sc3.name LIKE ?)
      )`;
      const term = `%${search}%`;
      params.push(term, term, term, term, term, term, term, term);
    }

    if (status === 'active' || status === 'inactive') {
      query += ` AND s.status = ?`;
      params.push(status);
    }

    if (category_id !== undefined && category_id !== null && category_id !== '') {
      query += ` AND EXISTS (SELECT 1 FROM supplier_category sc4 WHERE sc4.supplier_id = s.id AND sc4.category_id = ?)`;
      params.push(Number(category_id));
    }

    // Whitelisted sort columns. An unrecognized/absent `sort` falls back to
    // newest-first (id DESC), matching Filterable::scopeSort()'s latest('id').
    const allowedSortFields = {
      'id': 's.id',
      'display_code': 's.display_code',
      'company_name': 's.company_name',
      'credit_days': 's.credit_days',
      'status': 's.status',
      'created_at': 's.created_at'
    };

    const sortColumn = allowedSortFields[sort];
    const sortField = sortColumn || 's.id';
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
      'SELECT * FROM suppliers WHERE id = ? AND deleted_at IS NULL',
      [id]
    );
    return rows[0] || null;
  },

  findByIdIncludingRelations: async (id) => {
    const [rows] = await pool.query(
      `SELECT
        s.*,
        co.name AS country_name, co.iso_code AS country_iso_code,
        st.name AS state_name,
        ci.name AS city_name,
        sty.name AS supplier_type_name, sty.is_registered AS supplier_type_is_registered,
        a.name AS agent_name, a.display_code AS agent_display_code,
        u1.name AS creator_name,
        u2.name AS updater_name,
        cmp.code AS company_code, COALESCE(cmp.short_name, cmp.name) AS company_label
      FROM suppliers s
      LEFT JOIN countries co ON co.id = s.country_id
      LEFT JOIN states st ON st.id = s.state_id
      LEFT JOIN cities ci ON ci.id = s.city_id
      LEFT JOIN supplier_types sty ON sty.id = s.supplier_type_id
      LEFT JOIN agents a ON a.id = s.agent_id
      LEFT JOIN users u1 ON u1.id = s.created_by
      LEFT JOIN users u2 ON u2.id = s.updated_by
      LEFT JOIN companies cmp ON cmp.id = s.company_id
      WHERE s.id = ? AND s.deleted_at IS NULL`,
      [id]
    );
    return rows[0] || null;
  },

  getCategories: async (supplierId) => {
    const [rows] = await pool.query(
      `SELECT c.id, c.name
       FROM supplier_category sc
       JOIN categories c ON c.id = sc.category_id
       WHERE sc.supplier_id = ?
       ORDER BY c.name ASC`,
      [supplierId]
    );
    return rows;
  },

  getProducts: async (supplierId) => {
    const [rows] = await pool.query(
      `SELECT p.id, p.name, p.item_group_code
       FROM supplier_product sp
       JOIN products p ON p.id = sp.product_id
       WHERE sp.supplier_id = ?
       ORDER BY p.name ASC`,
      [supplierId]
    );
    return rows;
  },

  getBuyers: async (supplierId) => {
    const [rows] = await pool.query(
      `SELECT b.id, b.company_name, b.display_code
       FROM supplier_buyer sb
       JOIN buyers b ON b.id = sb.buyer_id
       WHERE sb.supplier_id = ?
       ORDER BY b.company_name ASC`,
      [supplierId]
    );
    return rows;
  },

  getContacts: async (supplierId) => {
    const [rows] = await pool.query(
      `SELECT sc.id, sc.name, sc.designation_id, sc.mobile, sc.email, sc.is_primary, d.name AS designation_name
       FROM supplier_contacts sc
       LEFT JOIN designations d ON d.id = sc.designation_id
       WHERE sc.supplier_id = ?
       ORDER BY sc.is_primary DESC, sc.id ASC`,
      [supplierId]
    );
    return rows;
  },

  /**
   * Uniqueness deliberately INCLUDES soft-deleted rows, matching Laravel:
   * the unique index has no knowledge of deleted_at, so a deleted
   * supplier's/jobber's code permanently blocks reuse.
   */
  displayCodeExists: async (code, ignoreId = null) => {
    let query = 'SELECT 1 FROM suppliers WHERE display_code = ?';
    const params = [code];
    if (ignoreId) {
      query += ' AND id != ?';
      params.push(ignoreId);
    }
    const [rows] = await pool.query(query, params);
    return rows.length > 0;
  },

  // -- Raw existence checks for FK validation (Rule::exists semantics) --

  categoryExists: async (id) => {
    const [rows] = await pool.query('SELECT 1 FROM categories WHERE id = ?', [id]);
    return rows.length > 0;
  },

  productExists: async (id) => {
    const [rows] = await pool.query('SELECT 1 FROM products WHERE id = ?', [id]);
    return rows.length > 0;
  },

  buyerExists: async (id) => {
    const [rows] = await pool.query('SELECT 1 FROM buyers WHERE id = ?', [id]);
    return rows.length > 0;
  },

  countryExists: async (id) => {
    const [rows] = await pool.query('SELECT 1 FROM countries WHERE id = ?', [id]);
    return rows.length > 0;
  },

  stateExistsForCountry: async (id, countryId) => {
    const [rows] = await pool.query('SELECT 1 FROM states WHERE id = ? AND country_id = ?', [id, countryId]);
    return rows.length > 0;
  },

  cityExistsForState: async (id, stateId) => {
    const [rows] = await pool.query('SELECT 1 FROM cities WHERE id = ? AND state_id = ?', [id, stateId]);
    return rows.length > 0;
  },

  supplierTypeExistsActive: async (id) => {
    const [rows] = await pool.query("SELECT 1 FROM supplier_types WHERE id = ? AND status = 'active'", [id]);
    return rows.length > 0;
  },

  /**
   * "An unknown id resolves to null and is treated as 'not registered'" —
   * a nonexistent/blank id naturally yields false here (no matching row).
   */
  supplierTypeIsRegistered: async (id) => {
    if (id === undefined || id === null || id === '' || Number.isNaN(Number(id))) return false;
    const [rows] = await pool.query('SELECT is_registered FROM supplier_types WHERE id = ?', [Number(id)]);
    return rows.length > 0 && !!rows[0].is_registered;
  },

  designationExistsActive: async (id) => {
    const [rows] = await pool.query("SELECT 1 FROM designations WHERE id = ? AND status = 'active'", [id]);
    return rows.length > 0;
  },

  agentExistsForSides: async (id, sides) => {
    if (!Array.isArray(sides) || sides.length === 0) return false;
    const placeholders = sides.map(() => '?').join(',');
    const [rows] = await pool.query(
      `SELECT 1 FROM agents WHERE id = ? AND agent_type IN (${placeholders}) AND deleted_at IS NULL`,
      [id, ...sides]
    );
    return rows.length > 0;
  },

  // -- Create / update / status / delete --

  create: async (connection, data) => {
    const [result] = await connection.query(
      `INSERT INTO suppliers (
        company_id, display_code, party_type, company_name, name_on_bill, supplier_type_id,
        gst_number, pan_number, is_msme, msme_registration_no,
        address, country_id, state_id, city_id, pincode,
        discount_percent, credit_days, bank_name, account_number, ifsc_code,
        agent_id, agent_commission_type, agent_commission_value,
        we_supply_material, requires_sample_approval, default_delivery_mode,
        status, remarks, created_by, updated_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        data.company_id, data.display_code, data.party_type, data.company_name, data.name_on_bill, data.supplier_type_id,
        data.gst_number, data.pan_number, data.is_msme ? 1 : 0, data.msme_registration_no,
        data.address, data.country_id, data.state_id, data.city_id, data.pincode,
        data.discount_percent, data.credit_days, data.bank_name, data.account_number, data.ifsc_code,
        data.agent_id, data.agent_commission_type, data.agent_commission_value,
        data.we_supply_material ? 1 : 0, data.requires_sample_approval ? 1 : 0, data.default_delivery_mode,
        data.status, data.remarks, data.created_by, data.updated_by
      ]
    );
    return result.insertId;
  },

  update: async (connection, id, data) => {
    await connection.query(
      `UPDATE suppliers SET
        company_id = ?, display_code = ?, party_type = ?, company_name = ?, name_on_bill = ?, supplier_type_id = ?,
        gst_number = ?, pan_number = ?, is_msme = ?, msme_registration_no = ?,
        address = ?, country_id = ?, state_id = ?, city_id = ?, pincode = ?,
        discount_percent = ?, credit_days = ?, bank_name = ?, account_number = ?, ifsc_code = ?,
        agent_id = ?, agent_commission_type = ?, agent_commission_value = ?,
        we_supply_material = ?, requires_sample_approval = ?, default_delivery_mode = ?,
        status = ?, remarks = ?, updated_by = ?, updated_at = NOW()
      WHERE id = ? AND deleted_at IS NULL`,
      [
        data.company_id, data.display_code, data.party_type, data.company_name, data.name_on_bill, data.supplier_type_id,
        data.gst_number, data.pan_number, data.is_msme ? 1 : 0, data.msme_registration_no,
        data.address, data.country_id, data.state_id, data.city_id, data.pincode,
        data.discount_percent, data.credit_days, data.bank_name, data.account_number, data.ifsc_code,
        data.agent_id, data.agent_commission_type, data.agent_commission_value,
        data.we_supply_material ? 1 : 0, data.requires_sample_approval ? 1 : 0, data.default_delivery_mode,
        data.status, data.remarks, data.updated_by, id
      ]
    );
  },

  toggleStatus: async (id, newStatus, userId) => {
    await pool.query(
      'UPDATE suppliers SET status = ?, updated_by = ?, updated_at = NOW() WHERE id = ? AND deleted_at IS NULL',
      [newStatus, userId, id]
    );
  },

  softDelete: async (id) => {
    await pool.query(
      'UPDATE suppliers SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL',
      [id]
    );
  },

  // -- Pivots: delete-then-bulk-insert, no timestamps on any of the three --

  syncCategories: async (connection, supplierId, categoryIds) => {
    await connection.query('DELETE FROM supplier_category WHERE supplier_id = ?', [supplierId]);
    if (Array.isArray(categoryIds) && categoryIds.length > 0) {
      const values = categoryIds.map((cid) => [supplierId, cid]);
      await connection.query('INSERT INTO supplier_category (supplier_id, category_id) VALUES ?', [values]);
    }
  },

  syncProducts: async (connection, supplierId, productIds) => {
    await connection.query('DELETE FROM supplier_product WHERE supplier_id = ?', [supplierId]);
    if (Array.isArray(productIds) && productIds.length > 0) {
      const values = productIds.map((pid) => [supplierId, pid]);
      await connection.query('INSERT INTO supplier_product (supplier_id, product_id) VALUES ?', [values]);
    }
  },

  syncBuyers: async (connection, supplierId, buyerIds) => {
    await connection.query('DELETE FROM supplier_buyer WHERE supplier_id = ?', [supplierId]);
    if (Array.isArray(buyerIds) && buyerIds.length > 0) {
      const values = buyerIds.map((bid) => [supplierId, bid]);
      await connection.query('INSERT INTO supplier_buyer (supplier_id, buyer_id) VALUES ?', [values]);
    }
  },

  // -- Contacts: full delete-and-reinsert, primary-first order built by the service --

  deleteContacts: async (connection, supplierId) => {
    await connection.query('DELETE FROM supplier_contacts WHERE supplier_id = ?', [supplierId]);
  },

  insertContact: async (connection, supplierId, row) => {
    await connection.query(
      `INSERT INTO supplier_contacts (supplier_id, name, designation_id, mobile, email, is_primary, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [supplierId, row.name, row.designation_id, row.mobile, row.email, row.is_primary ? 1 : 0]
    );
  },

  // -- Lookup/dropdown data. Active-only, no current-value union — matches
  // Laravel's formData() exactly (same as Buyer, unlike Product).

  getActiveSupplierTypes: async () => {
    const [rows] = await pool.query(
      "SELECT id, name, is_registered FROM supplier_types WHERE status = 'active' ORDER BY id ASC"
    );
    return rows;
  },

  getActiveDesignations: async () => {
    const [rows] = await pool.query("SELECT id, name FROM designations WHERE status = 'active' ORDER BY name ASC");
    return rows;
  },

  getActiveCategories: async () => {
    const [rows] = await pool.query(
      "SELECT id, name FROM categories WHERE deleted_at IS NULL AND status = 'active' ORDER BY name ASC"
    );
    return rows;
  },

  getActiveProducts: async () => {
    const [rows] = await pool.query(
      "SELECT id, name, item_group_code FROM products WHERE deleted_at IS NULL AND status = 'active' ORDER BY name ASC"
    );
    return rows;
  },

  getActiveBuyersForDropdown: async () => {
    const [rows] = await pool.query(
      "SELECT id, company_name, display_code FROM buyers WHERE deleted_at IS NULL AND status = 'active' ORDER BY company_name ASC"
    );
    return rows;
  },

  getAgentsForSides: async (sides) => {
    if (!Array.isArray(sides) || sides.length === 0) return [];
    const placeholders = sides.map(() => '?').join(',');
    const [rows] = await pool.query(
      `SELECT id, name, display_code FROM agents WHERE agent_type IN (${placeholders}) AND status = 'active' AND deleted_at IS NULL ORDER BY name ASC`,
      sides
    );
    return rows;
  },

  getActiveCountries: async () => {
    const [rows] = await pool.query(
      "SELECT id, iso_code, name, dial_code FROM countries WHERE status = 'active' ORDER BY name ASC"
    );
    return rows;
  },

  getIndiaCountryId: async () => {
    const [rows] = await pool.query("SELECT id FROM countries WHERE iso_code = 'IN'");
    return rows[0] ? rows[0].id : null;
  },

  getStatesForCountry: async (countryId) => {
    const [rows] = await pool.query(
      "SELECT id, name, code FROM states WHERE country_id = ? AND status = 'active' ORDER BY name ASC",
      [countryId]
    );
    return rows;
  },

  getCitiesForState: async (stateId) => {
    const [rows] = await pool.query(
      "SELECT id, name FROM cities WHERE state_id = ? AND status = 'active' ORDER BY name ASC",
      [stateId]
    );
    return rows;
  },

  // -- Supplier type quick-add (writes to supplier_types only) --

  findSupplierTypeByName: async (name) => {
    const [rows] = await pool.query('SELECT id, name FROM supplier_types WHERE name = ?', [name]);
    return rows[0] || null;
  },

  supplierTypeCodeExists: async (code) => {
    const [rows] = await pool.query('SELECT 1 FROM supplier_types WHERE code = ?', [code]);
    return rows.length > 0;
  },

  createSupplierType: async (code, name) => {
    const [result] = await pool.query(
      "INSERT INTO supplier_types (code, name, is_registered, status, created_at, updated_at) VALUES (?, ?, 0, 'active', NOW(), NOW())",
      [code, name]
    );
    return result.insertId;
  }
};
