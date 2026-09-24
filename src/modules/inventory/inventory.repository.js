import { pool } from '../../config/database.js';
import { companyScope } from '../../services/company-scope.service.js';
import { SIGNED_QUANTITY } from './stock-ledger.js';

const isSet = (v) => v !== undefined && v !== null && v !== '';
// An id filter only applies to a positive integer; anything else is ignored rather than reaching SQL as NaN.
const isId = (v) => isSet(v) && Number.isInteger(Number(v)) && Number(v) > 0;

const pageOf = (filters) => {
  const page = parseInt(filters.page, 10) > 0 ? parseInt(filters.page, 10) : 1;
  const limit = parseInt(filters.limit, 10) > 0 ? Math.min(parseInt(filters.limit, 10), 500) : 15;
  return { page, limit };
};

const paginate = async (query, params, filters) => {
  const { page, limit } = pageOf(filters);
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) as total FROM (${query}) as sub`, params);
  const [rows] = await pool.query(`${query} LIMIT ? OFFSET ?`, [...params, limit, (page - 1) * limit]);
  return { rows, total, page, limit };
};

const companyFilter = (column, value) => companyScope.filterSql(column, companyScope.parseFilter(value));

/**
 * Balances: movements summed per company / location / lot / product / UOM,
 * then joined to the lot's traceability (width, supplier, GRN, PO).
 */
const BALANCE_SELECT = `
  SELECT b.company_id, b.location_id, b.lot_id, b.product_id, b.uom_id, b.unit,
         b.quantity, b.received_quantity, b.last_movement_date, b.movements_count,
         CASE WHEN b.quantity > 0 THEN 'available' ELSE 'nil' END AS stock_status,
         l.lot_no, l.width_inch, l.supplier_lot_no, l.received_date, l.supplier_id,
         l.inward_entry_id, l.purchase_order_id, l.quantity AS lot_quantity,
         l.source_type AS lot_source_type, l.processing_record_id AS lot_processing_record_id, lpr.processing_no AS lot_processing_no,
         loc.code AS location_code, loc.name AS location_name,
         p.name AS product_name, p.item_group_code, p.material_type_id, mt.name AS material_type_name,
         s.company_name AS supplier_name, ie.inward_no, po.po_num, po.origin AS purchase_order_origin,
         COALESCE(u.decimal_places, 0) AS uom_decimal_places,
         cmp.code AS company_code, COALESCE(cmp.short_name, cmp.name) AS company_label
  FROM (
    SELECT sm.company_id, sm.location_id, sm.lot_id, sm.product_id, sm.uom_id, sm.unit,
           SUM(${SIGNED_QUANTITY}) AS quantity,
           SUM(CASE WHEN sm.movement_type IN ('QC_ACCEPTED_RECEIPT', 'PRODUCTION_OUTPUT') THEN sm.quantity ELSE 0 END) AS received_quantity,
           MAX(sm.movement_date) AS last_movement_date, COUNT(*) AS movements_count
    FROM stock_movements sm
    GROUP BY sm.company_id, sm.location_id, sm.lot_id, sm.product_id, sm.uom_id, sm.unit
  ) b
  JOIN lots l ON l.id = b.lot_id
  LEFT JOIN processing_records lpr ON lpr.id = l.processing_record_id
  JOIN stock_locations loc ON loc.id = b.location_id
  JOIN products p ON p.id = b.product_id
  LEFT JOIN material_types mt ON mt.id = p.material_type_id
  LEFT JOIN suppliers s ON s.id = l.supplier_id
  LEFT JOIN inward_entries ie ON ie.id = l.inward_entry_id
  LEFT JOIN purchase_orders po ON po.id = l.purchase_order_id
  LEFT JOIN uoms u ON u.id = b.uom_id
  LEFT JOIN companies cmp ON cmp.id = b.company_id
`;

/** Every movement with its running balance per lot + location (computed over ALL movements, before filtering). */
const MOVEMENT_SELECT = `
  SELECT m.*, l.lot_no, l.width_inch, l.inward_entry_id, l.purchase_order_id, l.source_type AS lot_source_type,
         prc.processing_no, prc.material_issue_id AS output_material_issue_id,
         loc.code AS location_code, loc.name AS location_name,
         p.name AS product_name, p.item_group_code,
         qi.qc_no, mi.id AS material_issue_id, mi.issue_no, mi.job_reference, ie.inward_no, po.po_num, po.origin AS purchase_order_origin, s.company_name AS supplier_name,
         COALESCE(u.decimal_places, 0) AS uom_decimal_places,
         cmp.code AS company_code, COALESCE(cmp.short_name, cmp.name) AS company_label,
         usr.name AS creator_name
  FROM (
    SELECT sm.*,
           CASE WHEN sm.direction = 'in' THEN sm.quantity ELSE 0 END AS quantity_in,
           CASE WHEN sm.direction = 'out' THEN sm.quantity ELSE 0 END AS quantity_out,
           SUM(${SIGNED_QUANTITY}) OVER (PARTITION BY sm.lot_id, sm.location_id ORDER BY sm.id) AS balance_after
    FROM stock_movements sm
  ) m
  JOIN lots l ON l.id = m.lot_id
  JOIN stock_locations loc ON loc.id = m.location_id
  JOIN products p ON p.id = m.product_id
  LEFT JOIN quality_inspections qi ON qi.id = m.quality_inspection_id
  LEFT JOIN material_issue_items mii ON mii.id = m.material_issue_item_id
  LEFT JOIN material_issues mi ON mi.id = mii.material_issue_id
  LEFT JOIN processing_records prc ON prc.id = m.processing_record_id
  LEFT JOIN inward_entries ie ON ie.id = l.inward_entry_id
  LEFT JOIN purchase_orders po ON po.id = l.purchase_order_id
  LEFT JOIN suppliers s ON s.id = l.supplier_id
  LEFT JOIN uoms u ON u.id = m.uom_id
  LEFT JOIN companies cmp ON cmp.id = m.company_id
  LEFT JOIN users usr ON usr.id = m.created_by
`;

const LOCATION_SELECT = `
  SELECT loc.*, cmp.code AS company_code, COALESCE(cmp.short_name, cmp.name) AS company_label,
         (SELECT COUNT(*) FROM stock_movements sm WHERE sm.location_id = loc.id) AS movements_count,
         (SELECT COUNT(*) FROM (
            SELECT sm.lot_id FROM stock_movements sm WHERE sm.location_id = loc.id
            GROUP BY sm.lot_id HAVING SUM(${SIGNED_QUANTITY}) > 0
          ) held) AS lots_in_stock
  FROM stock_locations loc
  LEFT JOIN companies cmp ON cmp.id = loc.company_id
`;

/** A completed QC with accepted quantity, whether it is already in stock, and its lot state. */
const QC_STOCK_SOURCE_SELECT = `
  SELECT qi.id, qi.qc_no, qi.company_id, qi.status, qi.result, qi.inspection_date, qi.lot_id,
         qi.product_id, qi.uom_id, qi.unit, qi.accepted_quantity, qi.rejected_quantity,
         l.lot_no, l.width_inch, l.quantity AS lot_quantity, l.status AS lot_status,
         ie.inward_no, po.po_num, p.name AS product_name, s.company_name AS supplier_name,
         COALESCE(u.decimal_places, 0) AS uom_decimal_places,
         cmp.code AS company_code, COALESCE(cmp.short_name, cmp.name) AS company_label,
         sm.id AS stock_movement_id, sm.movement_no AS stock_movement_no
  FROM quality_inspections qi
  JOIN lots l ON l.id = qi.lot_id
  JOIN inward_entries ie ON ie.id = qi.inward_entry_id
  JOIN purchase_orders po ON po.id = qi.purchase_order_id
  LEFT JOIN products p ON p.id = qi.product_id
  LEFT JOIN suppliers s ON s.id = qi.supplier_id
  LEFT JOIN uoms u ON u.id = qi.uom_id
  LEFT JOIN companies cmp ON cmp.id = qi.company_id
  LEFT JOIN stock_movements sm ON sm.quality_inspection_id = qi.id AND sm.movement_type = 'QC_ACCEPTED_RECEIPT'
`;

export const inventoryRepository = {
  // ---------------- Balances ----------------
  findBalances: async (filters = {}) => {
    let query = `${BALANCE_SELECT} WHERE 1 = 1`;
    const params = [];
    for (const [column, value] of [
      ['b.product_id', filters.product_id], ['p.material_type_id', filters.material_type_id],
      ['b.lot_id', filters.lot_id], ['l.supplier_id', filters.supplier_id], ['b.location_id', filters.location_id],
    ]) {
      if (isId(value)) {
        query += ` AND ${column} = ?`;
        params.push(Number(value));
      }
    }
    if (isSet(filters.lot)) {
      query += ' AND l.lot_no LIKE ?';
      params.push(`%${filters.lot}%`);
    }
    if (['grn', 'production'].includes(filters.lot_source)) {
      query += ' AND l.source_type = ?';
      params.push(filters.lot_source);
    }
    if (isSet(filters.date_from)) {
      query += ' AND l.received_date >= ?';
      params.push(filters.date_from);
    }
    if (isSet(filters.date_to)) {
      query += ' AND l.received_date <= ?';
      params.push(filters.date_to);
    }
    if (filters.search) {
      const columns = ['l.lot_no', 'l.supplier_lot_no', 'p.name', 'p.item_group_code', 's.company_name', 'ie.inward_no', 'po.po_num', 'lpr.processing_no', 'loc.code', 'loc.name'];
      query += ` AND (${columns.map((c) => `${c} LIKE ?`).join(' OR ')})`;
      params.push(...columns.map(() => `%${filters.search}%`));
    }
    // Default: lots that currently hold stock; stock_status=all includes emptied balances.
    if (filters.stock_status === 'nil') query += ' AND b.quantity <= 0';
    else if (filters.stock_status !== 'all') query += ' AND b.quantity > 0';
    const cf = companyFilter('b.company_id', filters.company_id);
    query += `${cf.sql} ORDER BY l.received_date DESC, b.lot_id DESC, loc.code`;
    params.push(...cf.params);
    return paginate(query, params, filters);
  },

  /** Stock per product and UOM (never summed across units). */
  findProductTotals: async (filters = {}) => {
    let query = `
      SELECT b.company_id, b.product_id, b.uom_id, b.unit,
             SUM(b.quantity) AS quantity, COUNT(DISTINCT b.lot_id) AS lots_count,
             COUNT(DISTINCT b.location_id) AS locations_count,
             p.name AS product_name, p.item_group_code, mt.name AS material_type_name,
             COALESCE(u.decimal_places, 0) AS uom_decimal_places,
             cmp.code AS company_code, COALESCE(cmp.short_name, cmp.name) AS company_label
      FROM (
        SELECT sm.company_id, sm.location_id, sm.lot_id, sm.product_id, sm.uom_id, sm.unit, SUM(${SIGNED_QUANTITY}) AS quantity
        FROM stock_movements sm
        GROUP BY sm.company_id, sm.location_id, sm.lot_id, sm.product_id, sm.uom_id, sm.unit
        HAVING SUM(${SIGNED_QUANTITY}) > 0
      ) b
      JOIN products p ON p.id = b.product_id
      LEFT JOIN material_types mt ON mt.id = p.material_type_id
      LEFT JOIN uoms u ON u.id = b.uom_id
      LEFT JOIN companies cmp ON cmp.id = b.company_id
      WHERE 1 = 1`;
    const params = [];
    for (const [column, value] of [['b.product_id', filters.product_id], ['p.material_type_id', filters.material_type_id], ['b.location_id', filters.location_id]]) {
      if (isId(value)) {
        query += ` AND ${column} = ?`;
        params.push(Number(value));
      }
    }
    if (filters.search) {
      query += ' AND (p.name LIKE ? OR p.item_group_code LIKE ?)';
      params.push(`%${filters.search}%`, `%${filters.search}%`);
    }
    const cf = companyFilter('b.company_id', filters.company_id);
    query += `${cf.sql} GROUP BY b.company_id, b.product_id, b.uom_id, b.unit ORDER BY p.name`;
    params.push(...cf.params);
    return paginate(query, params, filters);
  },

  /** Balances of one lot per location (including emptied ones). */
  findLotBalances: async (lotId) => {
    const [rows] = await pool.query(`${BALANCE_SELECT} WHERE b.lot_id = ? ORDER BY loc.code`, [lotId]);
    return rows;
  },

  // ---------------- Ledger ----------------
  findMovements: async (filters = {}) => {
    let query = `${MOVEMENT_SELECT} WHERE 1 = 1`;
    const params = [];
    for (const [column, value] of [['m.product_id', filters.product_id], ['m.lot_id', filters.lot_id], ['m.location_id', filters.location_id], ['m.quality_inspection_id', filters.quality_inspection_id], ['m.processing_record_id', filters.processing_record_id]]) {
      if (isId(value)) {
        query += ` AND ${column} = ?`;
        params.push(Number(value));
      }
    }
    if (['QC_ACCEPTED_RECEIPT', 'STOCK_ADJUSTMENT', 'MATERIAL_ISSUE', 'PRODUCTION_OUTPUT'].includes(filters.movement_type)) {
      query += ' AND m.movement_type = ?';
      params.push(filters.movement_type);
    }
    if (['quality_inspection', 'stock_adjustment', 'material_issue', 'processing_record'].includes(filters.source_type)) {
      query += ' AND m.source_type = ?';
      params.push(filters.source_type);
    }
    if (isSet(filters.lot)) {
      query += ' AND l.lot_no LIKE ?';
      params.push(`%${filters.lot}%`);
    }
    if (isSet(filters.source)) {
      query += ' AND (qi.qc_no LIKE ? OR mi.issue_no LIKE ? OR prc.processing_no LIKE ? OR ie.inward_no LIKE ? OR po.po_num LIKE ?)';
      params.push(...Array(5).fill(`%${filters.source}%`));
    }
    if (isSet(filters.date_from)) {
      query += ' AND m.movement_date >= ?';
      params.push(filters.date_from);
    }
    if (isSet(filters.date_to)) {
      query += ' AND m.movement_date <= ?';
      params.push(filters.date_to);
    }
    if (filters.search) {
      const columns = ['m.movement_no', 'l.lot_no', 'p.name', 'qi.qc_no', 'mi.issue_no', 'mi.job_reference', 'prc.processing_no', 'm.reason', 'loc.code'];
      query += ` AND (${columns.map((c) => `${c} LIKE ?`).join(' OR ')})`;
      params.push(...columns.map(() => `%${filters.search}%`));
    }
    const cf = companyFilter('m.company_id', filters.company_id);
    query += `${cf.sql} ORDER BY m.id DESC`;
    params.push(...cf.params);
    return paginate(query, params, filters);
  },

  findMovement: async (id) => {
    const [rows] = await pool.query(`${MOVEMENT_SELECT} WHERE m.id = ?`, [id]);
    return rows[0] || null;
  },

  findLotMovements: async (lotId) => {
    const [rows] = await pool.query(`${MOVEMENT_SELECT} WHERE m.lot_id = ? ORDER BY m.id`, [lotId]);
    return rows;
  },

  // ---------------- QC → stock ----------------
  /** Completed QCs (of one company, or all) with accepted quantity not yet posted to stock. */
  findPostableInspections: async (companyId) => {
    const cf = companyFilter('qi.company_id', companyId);
    const [rows] = await pool.query(`${QC_STOCK_SOURCE_SELECT}
      WHERE qi.status = 'completed' AND qi.accepted_quantity > 0 AND sm.id IS NULL${cf.sql}
      ORDER BY qi.id DESC LIMIT 200`, cf.params);
    return rows;
  },

  findQcStockSource: async (executor, qcId) => {
    const [rows] = await executor.query(`${QC_STOCK_SOURCE_SELECT} WHERE qi.id = ?`, [qcId]);
    return rows[0] || null;
  },

  findQcRef: async (qcId) => {
    const [rows] = await pool.query('SELECT id, lot_id FROM quality_inspections WHERE id = ?', [qcId]);
    return rows[0] || null;
  },

  /** Every stock mutation of a lot takes this lock first (then the QC, then reads). */
  lockLot: async (connection, lotId) => {
    const [rows] = await connection.query(`
      SELECT l.*, ie.receipt_status, ie.entry_type, ie.deleted_at AS grn_deleted_at,
             p.company_id AS product_company_id, COALESCE(u.decimal_places, 0) AS uom_decimal_places
      FROM lots l
      LEFT JOIN inward_entries ie ON ie.id = l.inward_entry_id
      LEFT JOIN products p ON p.id = l.product_id
      LEFT JOIN uoms u ON u.id = l.uom_id
      WHERE l.id = ? FOR UPDATE OF l`, [lotId]);
    return rows[0] || null;
  },

  lockInspection: async (connection, qcId) => {
    const [rows] = await connection.query('SELECT * FROM quality_inspections WHERE id = ? FOR UPDATE', [qcId]);
    return rows[0] || null;
  },

  findQcReceipt: async (executor, qcId) => {
    const [rows] = await executor.query(
      "SELECT id, movement_no FROM stock_movements WHERE movement_type = 'QC_ACCEPTED_RECEIPT' AND quality_inspection_id = ?",
      [qcId]
    );
    return rows[0] || null;
  },

  /** Lot totals from the ledger: current stock, QC-accepted posted, and per location. */
  lotTotals: async (executor, lotId, locationId = null) => {
    const [[row]] = await executor.query(`
      SELECT COALESCE(SUM(${SIGNED_QUANTITY}), 0) AS stock_quantity,
             COALESCE(SUM(CASE WHEN sm.movement_type IN ('QC_ACCEPTED_RECEIPT', 'PRODUCTION_OUTPUT') THEN sm.quantity ELSE 0 END), 0) AS received_quantity,
             COALESCE(SUM(CASE WHEN sm.location_id = ? THEN ${SIGNED_QUANTITY} ELSE 0 END), 0) AS location_quantity,
             COALESCE(SUM(CASE WHEN sm.location_id = ? THEN 1 ELSE 0 END), 0) AS location_movements,
             COALESCE(SUM(CASE WHEN sm.movement_type = 'STOCK_ADJUSTMENT' THEN -${SIGNED_QUANTITY} ELSE 0 END), 0) AS adjusted_out_quantity
      FROM stock_movements sm WHERE sm.lot_id = ?
    `, [locationId, locationId, lotId]);
    return row;
  },

  insertMovement: async (connection, data) => {
    const [result] = await connection.query(`
      INSERT INTO stock_movements (
        company_id, movement_no, financial_year, movement_date, movement_type, direction, location_id, lot_id,
        product_id, uom_id, unit, quantity, source_type, quality_inspection_id, material_issue_item_id, processing_record_id,
        reason, remarks, created_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `, [
      data.company_id, data.movement_no, data.financial_year, data.movement_date, data.movement_type, data.direction,
      data.location_id, data.lot_id, data.product_id, data.uom_id, data.unit, data.quantity, data.source_type,
      data.quality_inspection_id ?? null, data.material_issue_item_id ?? null, data.processing_record_id ?? null,
      data.reason, data.remarks, data.created_by,
    ]);
    return result.insertId;
  },

  // ---------------- Locations ----------------
  findLocations: async (filters = {}) => {
    let query = `${LOCATION_SELECT} WHERE 1 = 1`;
    const params = [];
    if (['active', 'inactive'].includes(filters.status)) {
      query += ' AND loc.status = ?';
      params.push(filters.status);
    }
    if (filters.search) {
      query += ' AND (loc.code LIKE ? OR loc.name LIKE ?)';
      params.push(`%${filters.search}%`, `%${filters.search}%`);
    }
    const cf = companyFilter('loc.company_id', filters.company_id);
    query += `${cf.sql} ORDER BY cmp.code, loc.code`;
    params.push(...cf.params);
    return paginate(query, params, filters);
  },

  findLocation: async (executor = pool, id) => {
    const [rows] = await executor.query(`${LOCATION_SELECT} WHERE loc.id = ?`, [id]);
    return rows[0] || null;
  },

  findLocationByCode: async (executor, companyId, code, excludeId = 0) => {
    const [rows] = await executor.query('SELECT id FROM stock_locations WHERE company_id = ? AND code = ? AND id <> ?', [companyId, code, excludeId]);
    return rows[0] || null;
  },

  insertLocation: async (connection, data) => {
    const [result] = await connection.query(`
      INSERT INTO stock_locations (company_id, code, name, status, remarks, created_by, updated_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `, [data.company_id, data.code, data.name, data.status, data.remarks, data.user_id, data.user_id]);
    return result.insertId;
  },

  updateLocation: async (connection, id, data) => {
    await connection.query(
      'UPDATE stock_locations SET code = ?, name = ?, status = ?, remarks = ?, updated_by = ?, updated_at = NOW() WHERE id = ?',
      [data.code, data.name, data.status, data.remarks, data.user_id, id]
    );
  },
};
