import { pool } from '../../config/database.js';

const HEADER_COLUMNS = `
  i.id, i.inquiry_no, i.financial_year, i.inquiry_date, i.buyer_ref, i.source_id,
  i.buyer_id, i.category_id, i.document_format_id, i.agent_id,
  i.agent_commission_type, i.agent_commission_value, i.currency_id, i.exchange_rate,
  i.expected_shipment_date, i.delivery_details, i.packing_details, i.remarks,
  i.status, i.converted_at, i.created_by, i.updated_by, i.created_at, i.updated_at, i.deleted_at
`;

export const inquiryRepository = {
  findAll: async ({ search, status, buyer_id, sort, direction, page = 1, limit = 15 }) => {
    let query = `
      SELECT ${HEADER_COLUMNS},
        b.company_name AS buyer_company_name, b.display_code AS buyer_display_code,
        c.name AS category_name,
        df.name AS format_name,
        (SELECT COUNT(*) FROM inquiry_items ii WHERE ii.inquiry_id = i.id) AS items_count
      FROM inquiries i
      LEFT JOIN buyers b ON b.id = i.buyer_id
      LEFT JOIN categories c ON c.id = i.category_id
      LEFT JOIN document_formats df ON df.id = i.document_format_id
      WHERE i.deleted_at IS NULL
    `;

    const params = [];

    if (search) {
      query += ` AND (i.inquiry_no LIKE ? OR i.buyer_ref LIKE ? OR i.remarks LIKE ? OR b.company_name LIKE ?)`;
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }

    const VALID_STATUSES = ['draft', 'price_working', 'quote_sent', 'confirmed', 'converted_to_oc', 'lost'];
    if (VALID_STATUSES.includes(status)) {
      query += ` AND i.status = ?`;
      params.push(status);
    }

    if (buyer_id !== undefined && buyer_id !== null && buyer_id !== '') {
      query += ` AND i.buyer_id = ?`;
      params.push(Number(buyer_id));
    }

    const allowedSortFields = {
      id: 'i.id',
      inquiry_no: 'i.inquiry_no',
      inquiry_date: 'i.inquiry_date',
      status: 'i.status',
      created_at: 'i.created_at'
    };

    const sortColumn = allowedSortFields[sort];
    const sortField = sortColumn || 'i.id';
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

    return { data: rows, total, page: safePage, limit: safeLimit };
  },

  /**
   * Counted across every non-deleted inquiry, not the filtered page —
   * matches InquiryController::index()'s $byStatus strip exactly.
   */
  getStatusStats: async () => {
    const [rows] = await pool.query(
      `SELECT status, COUNT(*) as count FROM inquiries WHERE deleted_at IS NULL GROUP BY status`
    );

    const byStatus = {};
    for (const row of rows) byStatus[row.status] = Number(row.count);

    const total = Object.values(byStatus).reduce((sum, n) => sum + n, 0);

    return {
      total,
      draft: byStatus.draft || 0,
      price_working: byStatus.price_working || 0,
      quote_sent: byStatus.quote_sent || 0,
      confirmed: (byStatus.confirmed || 0) + (byStatus.converted_to_oc || 0)
    };
  },

  findById: async (id) => {
    const [rows] = await pool.query(
      `SELECT ${HEADER_COLUMNS} FROM inquiries i WHERE i.id = ? AND i.deleted_at IS NULL`,
      [id]
    );
    return rows[0] || null;
  },

  findByIdIncludingRelations: async (id) => {
    const [headerRows] = await pool.query(
      `SELECT ${HEADER_COLUMNS},
        b.company_name AS buyer_company_name, b.display_code AS buyer_display_code,
        c.name AS category_name,
        df.name AS format_name,
        ag.name AS agent_name, ag.display_code AS agent_display_code,
        cur.iso_code AS currency_iso_code, cur.name AS currency_name, cur.symbol AS currency_symbol,
        src.name AS source_name,
        u1.name AS creator_name, u2.name AS updater_name
      FROM inquiries i
      LEFT JOIN buyers b ON b.id = i.buyer_id
      LEFT JOIN categories c ON c.id = i.category_id
      LEFT JOIN document_formats df ON df.id = i.document_format_id
      LEFT JOIN agents ag ON ag.id = i.agent_id
      LEFT JOIN currencies cur ON cur.id = i.currency_id
      LEFT JOIN inquiry_sources src ON src.id = i.source_id
      LEFT JOIN users u1 ON u1.id = i.created_by
      LEFT JOIN users u2 ON u2.id = i.updated_by
      WHERE i.id = ? AND i.deleted_at IS NULL`,
      [id]
    );
    const inquiry = headerRows[0];
    if (!inquiry) return null;

    const [items] = await pool.query(
      `SELECT ii.*, p.name AS product_name, p.item_group_code, s.company_name AS supplier_company_name,
        fv.name AS fob_value_name
       FROM inquiry_items ii
       LEFT JOIN products p ON p.id = ii.product_id
       LEFT JOIN suppliers s ON s.id = ii.supplier_id
       LEFT JOIN fob_values fv ON fv.id = ii.fob_value_id
       WHERE ii.inquiry_id = ?
       ORDER BY ii.sort_order ASC, ii.id ASC`,
      [id]
    );

    if (items.length > 0) {
      const itemIds = items.map((it) => it.id);

      const [colours] = await pool.query(
        `SELECT * FROM inquiry_item_colours WHERE inquiry_item_id IN (?) ORDER BY sort_order ASC, id ASC`,
        [itemIds]
      );

      const colourIds = colours.map((c) => c.id);
      let sizes = [];
      if (colourIds.length > 0) {
        [sizes] = await pool.query(
          `SELECT * FROM inquiry_item_sizes WHERE inquiry_item_colour_id IN (?) ORDER BY sort_order ASC, id ASC`,
          [colourIds]
        );
      }

      const [bomLines] = await pool.query(
        `SELECT * FROM inquiry_item_bom_lines WHERE inquiry_item_id IN (?) ORDER BY sort_order ASC, id ASC`,
        [itemIds]
      );

      for (const item of items) {
        item.colours = colours
          .filter((c) => c.inquiry_item_id === item.id)
          .map((c) => ({ ...c, sizes: sizes.filter((sz) => sz.inquiry_item_colour_id === c.id) }));
        item.bom_lines = bomLines.filter((l) => l.inquiry_item_id === item.id);
      }
    }

    const [followUps] = await pool.query(
      `SELECT f.*, u.name AS creator_name
       FROM inquiry_follow_ups f
       LEFT JOIN users u ON u.id = f.created_by
       WHERE f.inquiry_id = ?
       ORDER BY f.follow_up_date DESC, f.id DESC`,
      [id]
    );

    return { ...inquiry, items, follow_ups: followUps };
  },

  create: async (connection, data) => {
    const [result] = await connection.query(
      `INSERT INTO inquiries (
        inquiry_no, financial_year, inquiry_date, buyer_ref, source_id,
        buyer_id, category_id, document_format_id, agent_id,
        agent_commission_type, agent_commission_value, currency_id, exchange_rate,
        expected_shipment_date, delivery_details, packing_details, remarks, status,
        created_by, updated_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        data.inquiry_no, data.financial_year, data.inquiry_date, data.buyer_ref, data.source_id,
        data.buyer_id, data.category_id, data.document_format_id, data.agent_id,
        data.agent_commission_type, data.agent_commission_value, data.currency_id, data.exchange_rate,
        data.expected_shipment_date, data.delivery_details, data.packing_details, data.remarks, data.status,
        data.created_by, data.updated_by
      ]
    );
    return result.insertId;
  },

  update: async (connection, id, data) => {
    await connection.query(
      `UPDATE inquiries SET
        inquiry_date = ?, buyer_ref = ?, source_id = ?,
        buyer_id = ?, category_id = ?, document_format_id = ?, agent_id = ?,
        agent_commission_type = ?, agent_commission_value = ?, currency_id = ?, exchange_rate = ?,
        expected_shipment_date = ?, delivery_details = ?, packing_details = ?, remarks = ?, status = ?,
        updated_by = ?, updated_at = NOW()
      WHERE id = ? AND deleted_at IS NULL`,
      [
        data.inquiry_date, data.buyer_ref, data.source_id,
        data.buyer_id, data.category_id, data.document_format_id, data.agent_id,
        data.agent_commission_type, data.agent_commission_value, data.currency_id, data.exchange_rate,
        data.expected_shipment_date, data.delivery_details, data.packing_details, data.remarks, data.status,
        data.updated_by, id
      ]
    );
  },

  softDelete: async (id) => {
    await pool.query('UPDATE inquiries SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL', [id]);
  },

  // -- Item sync (delete-then-recreate at the item level, matching
  // InquiryService::syncItems() exactly) --

  deleteItems: async (connection, inquiryId) => {
    // Cascades to colours/sizes/bom lines via FK ON DELETE CASCADE.
    await connection.query('DELETE FROM inquiry_items WHERE inquiry_id = ?', [inquiryId]);
  },

  insertItem: async (connection, inquiryId, data) => {
    // qty/amount are deliberately not set here — they default to 0 at the
    // DB level and are filled in by updateItemTotals() once sizes have been
    // synced and the real total is known; never trust a caller-supplied
    // value for either.
    const [result] = await connection.query(
      `INSERT INTO inquiry_items (
        inquiry_id, sort_order, design_no, description, product_id, supplier_id, unit,
        fob_value_id, price, cost_price, remarks, custom_values, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        inquiryId, data.sort_order, data.design_no, data.description, data.product_id, data.supplier_id, data.unit,
        data.fob_value_id, data.price, data.cost_price, data.remarks,
        data.custom_values === null ? null : JSON.stringify(data.custom_values), data.status
      ]
    );
    return result.insertId;
  },

  updateItemTotals: async (connection, itemId, qty, amount) => {
    await connection.query('UPDATE inquiry_items SET qty = ?, amount = ? WHERE id = ?', [qty, amount, itemId]);
  },

  insertColour: async (connection, itemId, data) => {
    const [result] = await connection.query(
      `INSERT INTO inquiry_item_colours (inquiry_item_id, colour, sort_order) VALUES (?, ?, ?)`,
      [itemId, data.colour, data.sort_order]
    );
    return result.insertId;
  },

  insertSize: async (connection, colourId, data) => {
    await connection.query(
      `INSERT INTO inquiry_item_sizes (inquiry_item_colour_id, size, qty, sort_order) VALUES (?, ?, ?, ?)`,
      [colourId, data.size, data.qty, data.sort_order]
    );
  },

  insertBomLine: async (connection, itemId, data) => {
    await connection.query(
      `INSERT INTO inquiry_item_bom_lines (
        inquiry_item_id, sort_order, component_name, qty, unit, is_custom, remarks
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [itemId, data.sort_order, data.component_name, data.qty, data.unit, data.is_custom ? 1 : 0, data.remarks]
    );
  },

  // -- Follow-up diff sync (append/delete only, no update — matches
  // InquiryService::syncFollowUps() exactly) --

  getFollowUpIds: async (connection, inquiryId) => {
    const [rows] = await connection.query('SELECT id FROM inquiry_follow_ups WHERE inquiry_id = ?', [inquiryId]);
    return rows.map((r) => r.id);
  },

  deleteFollowUpsNotIn: async (connection, inquiryId, keepIds) => {
    if (keepIds.length === 0) {
      await connection.query('DELETE FROM inquiry_follow_ups WHERE inquiry_id = ?', [inquiryId]);
      return;
    }
    await connection.query(
      `DELETE FROM inquiry_follow_ups WHERE inquiry_id = ? AND id NOT IN (?)`,
      [inquiryId, keepIds]
    );
  },

  insertFollowUp: async (connection, inquiryId, data, userId) => {
    await connection.query(
      `INSERT INTO inquiry_follow_ups (inquiry_id, follow_up_date, comment, created_by, created_at)
       VALUES (?, ?, ?, ?, NOW())`,
      [inquiryId, data.date, data.comment, userId]
    );
  },

  // -- Existence checks for FK validation --

  buyerExists: async (id) => {
    const [rows] = await pool.query('SELECT 1 FROM buyers WHERE id = ? AND deleted_at IS NULL', [id]);
    return rows.length > 0;
  },

  categoryExists: async (id) => {
    const [rows] = await pool.query('SELECT 1 FROM categories WHERE id = ? AND deleted_at IS NULL', [id]);
    return rows.length > 0;
  },

  documentFormatExists: async (id) => {
    const [rows] = await pool.query('SELECT 1 FROM document_formats WHERE id = ?', [id]);
    return rows.length > 0;
  },

  agentExists: async (id) => {
    const [rows] = await pool.query('SELECT 1 FROM agents WHERE id = ? AND deleted_at IS NULL', [id]);
    return rows.length > 0;
  },

  currencyExists: async (id) => {
    const [rows] = await pool.query('SELECT 1 FROM currencies WHERE id = ?', [id]);
    return rows.length > 0;
  },

  sourceExists: async (id) => {
    const [rows] = await pool.query('SELECT 1 FROM inquiry_sources WHERE id = ?', [id]);
    return rows.length > 0;
  },

  productExists: async (id) => {
    const [rows] = await pool.query('SELECT 1 FROM products WHERE id = ? AND deleted_at IS NULL', [id]);
    return rows.length > 0;
  },

  supplierExists: async (id) => {
    const [rows] = await pool.query('SELECT 1 FROM suppliers WHERE id = ? AND deleted_at IS NULL', [id]);
    return rows.length > 0;
  },

  fobValueExists: async (id) => {
    const [rows] = await pool.query('SELECT 1 FROM fob_values WHERE id = ? AND deleted_at IS NULL', [id]);
    return rows.length > 0;
  },

  // -- Unit validation support: format chips + product units + legacy units --

  getFormatUnitNames: async (formatId) => {
    const [rows] = await pool.query('SELECT name FROM document_format_units WHERE document_format_id = ?', [formatId]);
    return rows.map((r) => r.name);
  },

  getProductUnitsByIds: async (productIds) => {
    if (productIds.length === 0) return {};
    const [rows] = await pool.query(
      'SELECT id, unit_po, unit_export FROM products WHERE id IN (?)',
      [productIds]
    );
    const byId = {};
    for (const row of rows) byId[row.id] = row;
    return byId;
  },

  getLegacyUnitsForInquiry: async (inquiryId) => {
    const [rows] = await pool.query(
      'SELECT DISTINCT unit FROM inquiry_items WHERE inquiry_id = ? AND unit IS NOT NULL',
      [inquiryId]
    );
    return rows.map((r) => r.unit);
  },

  // -- Lookups / dropdown data (active-only, matching Laravel's formData();
  // buyer/category/agent/currency/fobValue lists carry the fields the create
  // form's cascades and pre-fills need). --

  getActiveBuyersForForm: async () => {
    const [rows] = await pool.query(
      `SELECT id, company_name, display_code, agent_id, agent_commission_type, agent_commission_value, currency_id
       FROM buyers WHERE status = 'active' AND deleted_at IS NULL ORDER BY company_name ASC`
    );
    return rows;
  },

  getActiveCategoriesForForm: async () => {
    const [rows] = await pool.query(
      `SELECT id, name FROM categories WHERE status = 'active' AND deleted_at IS NULL ORDER BY name ASC`
    );
    return rows;
  },

  getActiveAgentsBuyerType: async () => {
    const [rows] = await pool.query(
      `SELECT id, name, display_code FROM agents
       WHERE agent_type = 'buyer' AND status = 'active' AND deleted_at IS NULL ORDER BY name ASC`
    );
    return rows;
  },

  getActiveFobValuesForForm: async () => {
    const [rows] = await pool.query(
      `SELECT id, name FROM fob_values WHERE status = 'active' AND deleted_at IS NULL ORDER BY name ASC`
    );
    return rows;
  },

  getActiveCurrenciesForForm: async () => {
    const [rows] = await pool.query(
      `SELECT id, iso_code, name, symbol FROM currencies WHERE status = 'active' ORDER BY iso_code ASC`
    );
    return rows;
  },

  getActiveSourcesForForm: async () => {
    const [rows] = await pool.query(
      `SELECT id, name FROM inquiry_sources WHERE status = 'active' ORDER BY name ASC`
    );
    return rows;
  },

  // -- Source quick-add --

  findSourceByName: async (name) => {
    const [rows] = await pool.query('SELECT id, name FROM inquiry_sources WHERE name = ?', [name]);
    return rows[0] || null;
  },

  createSource: async (name) => {
    const [result] = await pool.query(
      `INSERT INTO inquiry_sources (name, status, created_at, updated_at) VALUES (?, 'active', NOW(), NOW())`,
      [name]
    );
    return result.insertId;
  },

  // -- products()/suppliers() cascade lookups --

  getProductsForCascade: async (categoryId) => {
    let query = `SELECT id, name, item_group_code, unit_po, unit_export FROM products WHERE status = 'active' AND deleted_at IS NULL`;
    const params = [];
    if (categoryId !== undefined && categoryId !== null && categoryId !== '') {
      query += ' AND category_id = ?';
      params.push(Number(categoryId));
    }
    query += ' ORDER BY name ASC';
    const [products] = await pool.query(query, params);

    if (products.length === 0) return [];

    const [bomRows] = await pool.query(
      `SELECT product_id, component_name, qty, unit, is_custom, remarks
       FROM product_bom_items WHERE product_id IN (?) ORDER BY sort_order ASC`,
      [products.map((p) => p.id)]
    );

    return products.map((p) => ({
      id: p.id,
      text: p.item_group_code ? `${p.name} (${p.item_group_code})` : p.name,
      unit_po: p.unit_po,
      unit_export: p.unit_export,
      bom: bomRows
        .filter((b) => b.product_id === p.id)
        .map((b) => ({
          component_name: b.component_name,
          qty: Number(b.qty),
          unit: b.unit,
          is_custom: !!b.is_custom,
          remarks: b.remarks
        }))
    }));
  },

  getSuppliersForCascade: async (categoryId) => {
    let query = `
      SELECT DISTINCT s.id, s.company_name
      FROM suppliers s
    `;
    const params = [];

    if (categoryId !== undefined && categoryId !== null && categoryId !== '') {
      query += ` JOIN supplier_category sc ON sc.supplier_id = s.id AND sc.category_id = ?`;
      params.push(Number(categoryId));
    }

    query += ` WHERE s.status = 'active' AND s.deleted_at IS NULL AND s.party_type IN ('supplier', 'both')
               ORDER BY s.company_name ASC`;

    const [rows] = await pool.query(query, params);
    return rows.map((r) => ({ id: r.id, text: r.company_name }));
  }
};
