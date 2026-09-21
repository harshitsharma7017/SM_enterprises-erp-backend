import { pool } from '../../config/database.js';

export const buyerRepository = {
  findAll: async ({ search, status, category_id, sort, direction, page = 1, limit = 15 }) => {
    let query = `
      SELECT
        b.id, b.display_code, b.company_name, b.name_on_export_invoice, b.contact_person,
        b.email, b.mobile, b.status, b.created_at, b.updated_at,
        co.name AS country_name, co.iso_code AS country_iso_code,
        a.name AS agent_name, a.display_code AS agent_display_code,
        (SELECT COUNT(*) FROM buyer_category bc WHERE bc.buyer_id = b.id) AS categories_count
      FROM buyers b
      LEFT JOIN countries co ON co.id = b.country_id
      LEFT JOIN agents a ON a.id = b.agent_id
      WHERE b.deleted_at IS NULL
    `;

    const params = [];

    if (search) {
      query += ` AND (
        b.display_code LIKE ? OR b.company_name LIKE ? OR b.name_on_export_invoice LIKE ?
        OR b.contact_person LIKE ? OR b.email LIKE ?
      )`;
      const term = `%${search}%`;
      params.push(term, term, term, term, term);
    }

    if (status === 'active' || status === 'inactive') {
      query += ` AND b.status = ?`;
      params.push(status);
    }

    if (category_id !== undefined && category_id !== null && category_id !== '') {
      query += ` AND EXISTS (SELECT 1 FROM buyer_category bc2 WHERE bc2.buyer_id = b.id AND bc2.category_id = ?)`;
      params.push(Number(category_id));
    }

    // Whitelisted sort columns. An unrecognized/absent `sort` falls back to
    // newest-first (id DESC), matching Filterable::scopeSort()'s latest('id').
    const allowedSortFields = {
      'id': 'b.id',
      'display_code': 'b.display_code',
      'company_name': 'b.company_name',
      'status': 'b.status',
      'created_at': 'b.created_at'
    };

    const sortColumn = allowedSortFields[sort];
    const sortField = sortColumn || 'b.id';
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
      'SELECT * FROM buyers WHERE id = ? AND deleted_at IS NULL',
      [id]
    );
    return rows[0] || null;
  },

  findByIdIncludingRelations: async (id) => {
    const [rows] = await pool.query(
      `SELECT
        b.*,
        co.name AS country_name, co.iso_code AS country_iso_code,
        p.name AS port_name,
        a.name AS agent_name, a.display_code AS agent_display_code,
        pt.name AS payment_term_name,
        it.code AS incoterm_code, it.name AS incoterm_name,
        cur.iso_code AS currency_iso_code, cur.name AS currency_name,
        sm.name AS shipment_method_name,
        u1.name AS creator_name,
        u2.name AS updater_name
      FROM buyers b
      LEFT JOIN countries co ON co.id = b.country_id
      LEFT JOIN ports p ON p.id = b.port_id
      LEFT JOIN agents a ON a.id = b.agent_id
      LEFT JOIN payment_terms pt ON pt.id = b.payment_term_id
      LEFT JOIN incoterms it ON it.id = b.incoterm_id
      LEFT JOIN currencies cur ON cur.id = b.currency_id
      LEFT JOIN shipment_methods sm ON sm.id = b.shipment_method_id
      LEFT JOIN users u1 ON u1.id = b.created_by
      LEFT JOIN users u2 ON u2.id = b.updated_by
      WHERE b.id = ? AND b.deleted_at IS NULL`,
      [id]
    );
    return rows[0] || null;
  },

  create: async (connection, data) => {
    const [result] = await connection.query(
      `INSERT INTO buyers (
        display_code, company_name, name_on_export_invoice, contact_person, email, mobile,
        gst_vat_no, address, country_id, pincode, port_id, agent_id,
        agent_commission_type, agent_commission_value, payment_term_id, incoterm_id, currency_id,
        shipment_method_id, bank_name, account_number, swift_code, status, remarks,
        created_by, updated_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        data.display_code, data.company_name, data.name_on_export_invoice, data.contact_person, data.email, data.mobile,
        data.gst_vat_no, data.address, data.country_id, data.pincode, data.port_id, data.agent_id,
        data.agent_commission_type, data.agent_commission_value, data.payment_term_id, data.incoterm_id, data.currency_id,
        data.shipment_method_id, data.bank_name, data.account_number, data.swift_code, data.status, data.remarks,
        data.created_by, data.updated_by
      ]
    );
    return result.insertId;
  },

  update: async (connection, id, data) => {
    await connection.query(
      `UPDATE buyers SET
        company_name = ?, name_on_export_invoice = ?, contact_person = ?, email = ?, mobile = ?,
        gst_vat_no = ?, address = ?, country_id = ?, pincode = ?, port_id = ?, agent_id = ?,
        agent_commission_type = ?, agent_commission_value = ?, payment_term_id = ?, incoterm_id = ?, currency_id = ?,
        shipment_method_id = ?, bank_name = ?, account_number = ?, swift_code = ?, status = ?, remarks = ?,
        updated_by = ?, updated_at = NOW()
      WHERE id = ? AND deleted_at IS NULL`,
      [
        data.company_name, data.name_on_export_invoice, data.contact_person, data.email, data.mobile,
        data.gst_vat_no, data.address, data.country_id, data.pincode, data.port_id, data.agent_id,
        data.agent_commission_type, data.agent_commission_value, data.payment_term_id, data.incoterm_id, data.currency_id,
        data.shipment_method_id, data.bank_name, data.account_number, data.swift_code, data.status, data.remarks,
        data.updated_by, id
      ]
    );
  },

  toggleStatus: async (id, newStatus, userId) => {
    await pool.query(
      'UPDATE buyers SET status = ?, updated_by = ?, updated_at = NOW() WHERE id = ? AND deleted_at IS NULL',
      [newStatus, userId, id]
    );
  },

  softDelete: async (id) => {
    await pool.query(
      'UPDATE buyers SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL',
      [id]
    );
  },

  // -- Existence checks for FK validation. Raw table checks, matching
  // Laravel's Rule::exists() — not scoped by any soft-delete concern, except
  // where BuyerRequest itself explicitly adds one (agent_id — see below).

  categoryExists: async (id) => {
    const [rows] = await pool.query('SELECT 1 FROM categories WHERE id = ?', [id]);
    return rows.length > 0;
  },

  countryExists: async (id) => {
    const [rows] = await pool.query('SELECT 1 FROM countries WHERE id = ?', [id]);
    return rows.length > 0;
  },

  portExists: async (id) => {
    const [rows] = await pool.query('SELECT 1 FROM ports WHERE id = ?', [id]);
    return rows.length > 0;
  },

  // BuyerRequest's agent_id rule explicitly adds ->where('agent_type','buyer')
  // and ->whereNull('deleted_at') on top of the bare exists check.
  agentExistsAsBuyerType: async (id) => {
    const [rows] = await pool.query(
      "SELECT 1 FROM agents WHERE id = ? AND agent_type = 'buyer' AND deleted_at IS NULL",
      [id]
    );
    return rows.length > 0;
  },

  paymentTermExists: async (id) => {
    const [rows] = await pool.query('SELECT 1 FROM payment_terms WHERE id = ?', [id]);
    return rows.length > 0;
  },

  incotermExists: async (id) => {
    const [rows] = await pool.query('SELECT 1 FROM incoterms WHERE id = ?', [id]);
    return rows.length > 0;
  },

  currencyExists: async (id) => {
    const [rows] = await pool.query('SELECT 1 FROM currencies WHERE id = ?', [id]);
    return rows.length > 0;
  },

  shipmentMethodExists: async (id) => {
    const [rows] = await pool.query('SELECT 1 FROM shipment_methods WHERE id = ?', [id]);
    return rows.length > 0;
  },

  // contacts.*.designation_id explicitly requires status = active.
  designationExistsActive: async (id) => {
    const [rows] = await pool.query("SELECT 1 FROM designations WHERE id = ? AND status = 'active'", [id]);
    return rows.length > 0;
  },

  // -- Category pivot (many-to-many, no timestamps) --

  syncCategories: async (connection, buyerId, categoryIds) => {
    await connection.query('DELETE FROM buyer_category WHERE buyer_id = ?', [buyerId]);
    if (Array.isArray(categoryIds) && categoryIds.length > 0) {
      const values = categoryIds.map((cid) => [buyerId, cid]);
      await connection.query('INSERT INTO buyer_category (buyer_id, category_id) VALUES ?', [values]);
    }
  },

  getCategories: async (buyerId) => {
    const [rows] = await pool.query(
      `SELECT c.id, c.name
       FROM buyer_category bc
       JOIN categories c ON c.id = bc.category_id
       WHERE bc.buyer_id = ?
       ORDER BY c.name ASC`,
      [buyerId]
    );
    return rows;
  },

  // -- Carton markings: full delete-and-reinsert, business logic in the service --

  deleteCartonMarkings: async (connection, buyerId) => {
    await connection.query('DELETE FROM buyer_carton_markings WHERE buyer_id = ?', [buyerId]);
  },

  insertCartonMarking: async (connection, buyerId, row) => {
    await connection.query(
      `INSERT INTO buyer_carton_markings (buyer_id, line_no, label, value, is_required, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
      [buyerId, row.line_no, row.label, row.value, row.is_required ? 1 : 0]
    );
  },

  getCartonMarkings: async (buyerId) => {
    const [rows] = await pool.query(
      'SELECT id, line_no, label, value, is_required FROM buyer_carton_markings WHERE buyer_id = ? ORDER BY line_no ASC',
      [buyerId]
    );
    return rows;
  },

  // -- Contacts: full delete-and-reinsert, business logic in the service --

  deleteContacts: async (connection, buyerId) => {
    await connection.query('DELETE FROM buyer_contacts WHERE buyer_id = ?', [buyerId]);
  },

  insertContact: async (connection, buyerId, row) => {
    await connection.query(
      `INSERT INTO buyer_contacts (buyer_id, name, designation_id, mobile, email, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
      [buyerId, row.name, row.designation_id, row.mobile, row.email]
    );
  },

  getContacts: async (buyerId) => {
    const [rows] = await pool.query(
      `SELECT bc.id, bc.name, bc.designation_id, bc.mobile, bc.email, d.name AS designation_name
       FROM buyer_contacts bc
       LEFT JOIN designations d ON d.id = bc.designation_id
       WHERE bc.buyer_id = ?
       ORDER BY bc.id ASC`,
      [buyerId]
    );
    return rows;
  },

  // -- Lookup/dropdown data for the create/edit forms. Active-only, no
  // current-value union — matches Laravel's formData() exactly (unlike
  // Product's asymmetric union behavior, which does not apply to Buyer).

  getActiveCategories: async () => {
    const [rows] = await pool.query(
      "SELECT id, name FROM categories WHERE deleted_at IS NULL AND status = 'active' ORDER BY name ASC"
    );
    return rows;
  },

  getActiveAgentsByType: async (agentType) => {
    const [rows] = await pool.query(
      "SELECT id, name, display_code FROM agents WHERE agent_type = ? AND status = 'active' AND deleted_at IS NULL ORDER BY name ASC",
      [agentType]
    );
    return rows;
  },

  getActiveCountries: async () => {
    const [rows] = await pool.query(
      "SELECT id, iso_code, name, dial_code FROM countries WHERE status = 'active' ORDER BY name ASC"
    );
    return rows;
  },

  getActivePorts: async () => {
    const [rows] = await pool.query(
      "SELECT id, code, name, country_id FROM ports WHERE status = 'active' ORDER BY name ASC"
    );
    return rows;
  },

  getActiveDesignations: async () => {
    const [rows] = await pool.query(
      "SELECT id, name FROM designations WHERE status = 'active' ORDER BY name ASC"
    );
    return rows;
  },

  getPaymentTermsForSide: async (side) => {
    const [rows] = await pool.query(
      "SELECT id, name, days FROM payment_terms WHERE applies_to IN (?, 'both') AND status = 'active' ORDER BY name ASC",
      [side]
    );
    return rows;
  },

  getActiveIncoterms: async () => {
    const [rows] = await pool.query(
      "SELECT id, code, name FROM incoterms WHERE status = 'active' ORDER BY code ASC"
    );
    return rows;
  },

  getActiveCurrencies: async () => {
    const [rows] = await pool.query(
      "SELECT id, iso_code, name, symbol FROM currencies WHERE status = 'active' ORDER BY iso_code ASC"
    );
    return rows;
  },

  // Not part of Laravel's current formData() (shipment_method is free text
  // there), but needed here since the locked schema represents shipment
  // method as an FK — see buyer.service.js / the final report for the
  // shipment-method handling rationale.
  getActiveShipmentMethods: async () => {
    const [rows] = await pool.query(
      "SELECT id, name FROM shipment_methods WHERE status = 'active' ORDER BY name ASC"
    );
    return rows;
  },

  // -- Payment-term quick-add (writes to payment_terms only) --

  findPaymentTermByName: async (name) => {
    const [rows] = await pool.query('SELECT id, name FROM payment_terms WHERE name = ?', [name]);
    return rows[0] || null;
  },

  createPaymentTerm: async (name) => {
    const [result] = await pool.query(
      "INSERT INTO payment_terms (name, applies_to, status, created_at, updated_at) VALUES (?, 'buyer', 'active', NOW(), NOW())",
      [name]
    );
    return result.insertId;
  },

  // -- Designation quick-add (writes to designations only) --

  findDesignationByName: async (name) => {
    const [rows] = await pool.query('SELECT id, name FROM designations WHERE name = ?', [name]);
    return rows[0] || null;
  },

  createDesignation: async (name) => {
    const [result] = await pool.query(
      "INSERT INTO designations (name, status, created_at, updated_at) VALUES (?, 'active', NOW(), NOW())",
      [name]
    );
    return result.insertId;
  }
};
