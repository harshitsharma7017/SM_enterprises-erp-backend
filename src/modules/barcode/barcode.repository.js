import { pool } from '../../config/database.js';
import { companyScope } from '../../services/company-scope.service.js';
import { STOCK_BY_LOT } from '../inventory/stock-ledger.js';

const isSet = (v) => v !== undefined && v !== null && v !== '';
const isId = (v) => isSet(v) && Number.isInteger(Number(v)) && Number(v) > 0;

/** Barcode + the lot facts it identifies (read from the lot, never copied). */
const BARCODE_SELECT = `
  SELECT b.*, cmp.code AS company_code, COALESCE(cmp.short_name, cmp.name) AS company_label,
         l.lot_no, l.source_type, l.status AS lot_status, l.quantity AS lot_quantity, l.unit, l.width_inch, l.supplier_lot_no,
         l.received_date, l.product_id, l.inward_entry_id, l.purchase_order_id, l.processing_record_id,
         p.name AS product_name, p.item_group_code, u.code AS uom_code, COALESCE(u.decimal_places, 0) AS uom_decimal_places,
         ie.inward_no, ie.challan_no, po.po_num, s.company_name AS supplier_name, pr.processing_no, mi.job_reference,
         COALESCE(st.stock_quantity, 0) AS stock_quantity,
         u1.name AS creator_name, u2.name AS retirer_name,
         (SELECT COUNT(*) FROM barcode_scans x WHERE x.barcode_id = b.id) AS scans_count,
         (SELECT MAX(x.scanned_at) FROM barcode_scans x WHERE x.barcode_id = b.id) AS last_scanned_at
  FROM barcodes b
  JOIN lots l ON l.id = b.lot_id
  LEFT JOIN companies cmp ON cmp.id = b.company_id
  LEFT JOIN products p ON p.id = l.product_id
  LEFT JOIN uoms u ON u.id = l.uom_id
  LEFT JOIN inward_entries ie ON ie.id = l.inward_entry_id
  LEFT JOIN purchase_orders po ON po.id = l.purchase_order_id
  LEFT JOIN suppliers s ON s.id = l.supplier_id
  LEFT JOIN processing_records pr ON pr.id = l.processing_record_id
  LEFT JOIN material_issues mi ON mi.id = pr.material_issue_id
  LEFT JOIN (${STOCK_BY_LOT}) st ON st.lot_id = l.id
  LEFT JOIN users u1 ON u1.id = b.created_by
  LEFT JOIN users u2 ON u2.id = b.retired_by
`;

const SCAN_SELECT = `
  SELECT bs.*, cmp.code AS company_code, COALESCE(cmp.short_name, cmp.name) AS company_label,
         l.lot_no, p.name AS product_name, loc.code AS location_code, us.name AS scanned_by_name,
         prev.scanned_at AS previous_scanned_at, uprev.name AS previous_scanned_by_name
  FROM barcode_scans bs
  LEFT JOIN companies cmp ON cmp.id = bs.company_id
  LEFT JOIN lots l ON l.id = bs.lot_id
  LEFT JOIN products p ON p.id = l.product_id
  LEFT JOIN stock_locations loc ON loc.id = bs.location_id
  LEFT JOIN users us ON us.id = bs.scanned_by
  LEFT JOIN barcode_scans prev ON prev.id = bs.previous_scan_id
  LEFT JOIN users uprev ON uprev.id = prev.scanned_by
`;

const paginate = async (query, params, filters) => {
  const page = parseInt(filters.page, 10) > 0 ? parseInt(filters.page, 10) : 1;
  const limit = parseInt(filters.limit, 10) > 0 ? Math.min(parseInt(filters.limit, 10), 500) : 15;
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) as total FROM (${query}) as sub`, params);
  const [rows] = await pool.query(`${query} LIMIT ? OFFSET ?`, [...params, limit, (page - 1) * limit]);
  return { rows, total, page, limit };
};

export const barcodeRepository = {
  findAll: async (filters = {}) => {
    let query = `${BARCODE_SELECT} WHERE 1 = 1`;
    const params = [];
    if (['active', 'retired'].includes(filters.status)) {
      query += ' AND b.status = ?';
      params.push(filters.status);
    }
    if (['grn', 'production'].includes(filters.source_type)) {
      query += ' AND l.source_type = ?';
      params.push(filters.source_type);
    }
    for (const [column, value] of [['l.product_id', filters.product_id], ['b.lot_id', filters.lot_id]]) {
      if (isId(value)) {
        query += ` AND ${column} = ?`;
        params.push(Number(value));
      }
    }
    if (isSet(filters.lot)) {
      query += ' AND l.lot_no LIKE ?';
      params.push(`%${filters.lot}%`);
    }
    if (isSet(filters.date_from)) {
      query += ' AND b.created_at >= ?';
      params.push(filters.date_from);
    }
    if (isSet(filters.date_to)) {
      query += ' AND b.created_at < DATE_ADD(?, INTERVAL 1 DAY)';
      params.push(filters.date_to);
    }
    if (filters.search) {
      const columns = ['b.barcode_value', 'l.lot_no', 'l.supplier_lot_no', 'p.name', 'ie.inward_no', 'po.po_num', 'pr.processing_no'];
      query += ` AND (${columns.map((c) => `${c} LIKE ?`).join(' OR ')})`;
      params.push(...columns.map(() => `%${filters.search}%`));
    }
    const cf = companyScope.filterSql('b.company_id', companyScope.parseFilter(filters.company_id));
    query += `${cf.sql} ORDER BY b.id DESC`;
    params.push(...cf.params);
    return paginate(query, params, filters);
  },

  findById: async (executor, id) => {
    const [rows] = await executor.query(`${BARCODE_SELECT} WHERE b.id = ?`, [id]);
    return rows[0] || null;
  },

  findActiveForLot: async (executor, lotId) => {
    const [rows] = await executor.query("SELECT id, barcode_value FROM barcodes WHERE lot_id = ? AND status = 'active'", [lotId]);
    return rows[0] || null;
  },

  /** Locks the barcode row: scans of one barcode are serialised, so exactly one is the first. */
  lockByValue: async (connection, value) => {
    const [rows] = await connection.query('SELECT * FROM barcodes WHERE barcode_value = ? FOR UPDATE', [value]);
    return rows[0] || null;
  },

  lock: async (connection, id) => {
    const [rows] = await connection.query('SELECT * FROM barcodes WHERE id = ? FOR UPDATE', [id]);
    return rows[0] || null;
  },

  lockLot: async (connection, lotId) => {
    const [rows] = await connection.query(`
      SELECT l.*, p.company_id AS product_company_id, p.deleted_at AS product_deleted_at
      FROM lots l LEFT JOIN products p ON p.id = l.product_id
      WHERE l.id = ? FOR UPDATE OF l`, [lotId]);
    return rows[0] || null;
  },

  /** Received lots of a company without an active barcode (for generating one). */
  findEligibleLots: async (companyId, search) => {
    let query = `
      SELECT l.id, l.lot_no, l.source_type, l.quantity, l.unit, l.width_inch, l.received_date, p.name AS product_name,
             COALESCE(u.decimal_places, 0) AS uom_decimal_places, ie.inward_no, pr.processing_no, COALESCE(st.stock_quantity, 0) AS stock_quantity
      FROM lots l
      LEFT JOIN products p ON p.id = l.product_id
      LEFT JOIN uoms u ON u.id = l.uom_id
      LEFT JOIN inward_entries ie ON ie.id = l.inward_entry_id
      LEFT JOIN processing_records pr ON pr.id = l.processing_record_id
      LEFT JOIN (${STOCK_BY_LOT}) st ON st.lot_id = l.id
      WHERE l.company_id = ? AND l.status = 'received'
        AND NOT EXISTS (SELECT 1 FROM barcodes b WHERE b.lot_id = l.id AND b.status = 'active')`;
    const params = [companyId];
    if (isSet(search)) {
      query += ' AND (l.lot_no LIKE ? OR p.name LIKE ? OR ie.inward_no LIKE ? OR pr.processing_no LIKE ?)';
      params.push(...[1, 2, 3, 4].map(() => `%${search}%`));
    }
    const [rows] = await pool.query(`${query} ORDER BY l.id DESC LIMIT 100`, params);
    return rows;
  },

  insert: async (connection, data) => {
    const [result] = await connection.query(`
      INSERT INTO barcodes (company_id, barcode_value, barcode_type, lot_id, status, created_by, created_at, updated_at)
      VALUES (?, ?, 'lot', ?, 'active', ?, NOW(), NOW())`, [data.company_id, data.barcode_value, data.lot_id, data.user_id]);
    return result.insertId;
  },

  setRetired: async (connection, id, reason, userId) => {
    await connection.query(
      "UPDATE barcodes SET status = 'retired', retired_at = NOW(), retired_by = ?, retirement_reason = ?, updated_at = NOW() WHERE id = ?",
      [userId, reason, id]
    );
  },

  /** Most recent successful scan of a barcode in one context (duplicate detection). */
  findPreviousScan: async (executor, barcodeId, context) => {
    const [rows] = await executor.query(
      "SELECT id FROM barcode_scans WHERE barcode_id = ? AND context = ? AND result = 'found' ORDER BY id DESC LIMIT 1",
      [barcodeId, context]
    );
    return rows[0] || null;
  },

  insertScan: async (connection, data) => {
    const [result] = await connection.query(`
      INSERT INTO barcode_scans (company_id, barcode_value, barcode_id, lot_id, context, location_id, result, is_duplicate, previous_scan_id, scanned_by, scanned_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`, [data.company_id, data.barcode_value, data.barcode_id, data.lot_id, data.context,
      data.location_id, data.result, data.is_duplicate ? 1 : 0, data.previous_scan_id, data.user_id]);
    return result.insertId;
  },

  findScan: async (id) => {
    const [rows] = await pool.query(`${SCAN_SELECT} WHERE bs.id = ?`, [id]);
    return rows[0] || null;
  },

  findScans: async (filters = {}) => {
    let query = `${SCAN_SELECT} WHERE 1 = 1`;
    const params = [];
    for (const [column, value] of [['bs.barcode_id', filters.barcode_id], ['bs.lot_id', filters.lot_id], ['bs.scanned_by', filters.scanned_by], ['bs.location_id', filters.location_id]]) {
      if (isId(value)) {
        query += ` AND ${column} = ?`;
        params.push(Number(value));
      }
    }
    if (['lookup', 'material_issue', 'dispatch'].includes(filters.context)) {
      query += ' AND bs.context = ?';
      params.push(filters.context);
    }
    if (['found', 'not_found', 'retired'].includes(filters.result)) {
      query += ' AND bs.result = ?';
      params.push(filters.result);
    }
    if (filters.duplicate === '1' || filters.duplicate === '0') {
      query += ' AND bs.is_duplicate = ?';
      params.push(Number(filters.duplicate));
    }
    if (isSet(filters.date_from)) {
      query += ' AND bs.scanned_at >= ?';
      params.push(filters.date_from);
    }
    if (isSet(filters.date_to)) {
      query += ' AND bs.scanned_at < DATE_ADD(?, INTERVAL 1 DAY)';
      params.push(filters.date_to);
    }
    if (filters.search) {
      query += ' AND (bs.barcode_value LIKE ? OR l.lot_no LIKE ? OR us.name LIKE ?)';
      params.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`);
    }
    const cf = companyScope.filterSql('bs.company_id', companyScope.parseFilter(filters.company_id));
    query += `${cf.sql} ORDER BY bs.id DESC`;
    params.push(...cf.params);
    return paginate(query, params, filters);
  },

  /** Commercial documents the lot appears on (only returned to users allowed to see them). */
  findLotInvoices: async (lotId) => {
    const [rows] = await pool.query(`
      SELECT DISTINCT i.id, i.invoice_no, i.invoice_date, i.status FROM invoice_items ii JOIN invoices i ON i.id = ii.invoice_id
      WHERE ii.lot_id = ? ORDER BY i.id`, [lotId]);
    return rows;
  },

  findOrderProformas: async (ocIds) => {
    if (ocIds.length === 0) return [];
    const [rows] = await pool.query(`
      SELECT pi.id, pi.pi_no, pi.pi_date, pi.status, pi.order_confirmation_id, oc.oc_num
      FROM proforma_invoices pi JOIN order_confirmations oc ON oc.id = pi.order_confirmation_id
      WHERE pi.order_confirmation_id IN (?) ORDER BY pi.id`, [ocIds]);
    return rows;
  },
};
