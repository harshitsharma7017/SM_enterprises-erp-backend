import { pool } from '../../config/database.js';
import { companyScope } from '../../services/company-scope.service.js';
import { findLotTrace } from '../lot/lot.repository.js';
import { ACTIVE_QC, QC_TOTALS_BY_LOT, RETURN_TOTALS_BY_QC, DEBIT_TOTALS_BY_QC } from './qc-ledger.js';

// Quality inspections (QC) of received lots. Quantity rules live in
// qc-ledger.js, shared with lots, supplier returns and debit notes.

/**
 * A lot with everything QC validates: its GRN, PO and supplier state, and the
 * UOM precision quantities are checked against.
 */
const LOT_SOURCE_SELECT = `
  SELECT l.*, COALESCE(u.decimal_places, 0) AS uom_decimal_places, u.code AS uom_code,
         ie.inward_no, ie.entry_type, ie.receipt_status, ie.deleted_at AS grn_deleted_at,
         ie.company_id AS grn_company_id, ie.supplier_id AS grn_supplier_id,
         po.po_num, po.origin AS purchase_order_origin, po.status AS purchase_order_status,
         po.company_id AS po_company_id, po.supplier_id AS po_supplier_id, po.deleted_at AS po_deleted_at,
         s.company_name AS supplier_name, s.company_id AS supplier_company_id,
         s.status AS supplier_status, s.deleted_at AS supplier_deleted_at,
         p.name AS product_name, p.item_group_code,
         cmp.code AS company_code, COALESCE(cmp.short_name, cmp.name) AS company_label,
         COALESCE(qt.claimed_quantity, 0) AS claimed_quantity,
         COALESCE(qt.inspected_quantity, 0) AS inspected_quantity,
         COALESCE(qt.accepted_quantity, 0) AS accepted_quantity,
         COALESCE(qt.rejected_quantity, 0) AS rejected_quantity,
         l.quantity - COALESCE(qt.claimed_quantity, 0) AS uninspected_quantity
  FROM lots l
  JOIN inward_entries ie ON ie.id = l.inward_entry_id
  JOIN purchase_orders po ON po.id = l.purchase_order_id
  LEFT JOIN suppliers s ON s.id = l.supplier_id
  LEFT JOIN products p ON p.id = l.product_id
  LEFT JOIN uoms u ON u.id = l.uom_id
  LEFT JOIN companies cmp ON cmp.id = l.company_id
  LEFT JOIN (${QC_TOTALS_BY_LOT}) qt ON qt.lot_id = l.id
`;

/** List/detail row: the QC with its source chain and return/debit progress. */
const QC_SELECT = `
  SELECT qi.*, l.lot_no, l.quantity AS lot_quantity, l.width_inch, l.supplier_lot_no, l.status AS lot_status,
         ie.inward_no, ie.inward_date, po.po_num, po.origin AS purchase_order_origin,
         s.company_name AS supplier_name, p.name AS product_name, p.item_group_code,
         COALESCE(u.decimal_places, 0) AS uom_decimal_places,
         cmp.code AS company_code, COALESCE(cmp.short_name, cmp.name) AS company_label,
         COALESCE(rt.returned_quantity, 0) AS returned_quantity,
         COALESCE(rt.return_draft_quantity, 0) AS return_draft_quantity,
         COALESCE(dt.debited_quantity, 0) AS debited_quantity,
         COALESCE(dt.debit_draft_quantity, 0) AS debit_draft_quantity,
         COALESCE(dt.debited_amount, 0) AS debited_amount,
         u1.name AS creator_name, u2.name AS completer_name, u3.name AS canceller_name
  FROM quality_inspections qi
  JOIN lots l ON l.id = qi.lot_id
  JOIN inward_entries ie ON ie.id = qi.inward_entry_id
  JOIN purchase_orders po ON po.id = qi.purchase_order_id
  LEFT JOIN suppliers s ON s.id = qi.supplier_id
  LEFT JOIN products p ON p.id = qi.product_id
  LEFT JOIN uoms u ON u.id = qi.uom_id
  LEFT JOIN companies cmp ON cmp.id = qi.company_id
  LEFT JOIN (${RETURN_TOTALS_BY_QC}) rt ON rt.quality_inspection_id = qi.id
  LEFT JOIN (${DEBIT_TOTALS_BY_QC}) dt ON dt.quality_inspection_id = qi.id
  LEFT JOIN users u1 ON u1.id = qi.created_by
  LEFT JOIN users u2 ON u2.id = qi.completed_by
  LEFT JOIN users u3 ON u3.id = qi.cancelled_by
`;

const isSet = (v) => v !== undefined && v !== null && v !== '';
const QC_STATUSES = ['draft', 'completed', 'cancelled'];
const QC_RESULTS = ['accepted', 'partially_accepted', 'rejected'];

/** List filters shared by QC, returns and debit notes (each carries the lot source chain under `alias`). */
export const sourceFilters = (alias, filters, { dateColumn, search = [] }) => {
  let sql = '';
  const params = [];
  for (const [column, value] of [
    ['supplier_id', filters.supplier_id], ['purchase_order_id', filters.purchase_order_id],
    ['inward_entry_id', filters.inward_entry_id], ['lot_id', filters.lot_id],
  ]) {
    if (isSet(value)) {
      sql += ` AND ${alias}.${column} = ?`;
      params.push(Number(value));
    }
  }
  for (const [column, value] of [['po.po_num', filters.po], ['ie.inward_no', filters.grn], ['l.lot_no', filters.lot]]) {
    if (isSet(value)) {
      sql += ` AND ${column} LIKE ?`;
      params.push(`%${value}%`);
    }
  }
  if (isSet(filters.date_from)) {
    sql += ` AND ${alias}.${dateColumn} >= ?`;
    params.push(filters.date_from);
  }
  if (isSet(filters.date_to)) {
    sql += ` AND ${alias}.${dateColumn} <= ?`;
    params.push(filters.date_to);
  }
  if (filters.search) {
    const columns = [...search, 'l.lot_no', 'l.supplier_lot_no', 'ie.inward_no', 'po.po_num', 's.company_name', 'p.name'];
    sql += ` AND (${columns.map((c) => `${c} LIKE ?`).join(' OR ')})`;
    params.push(...columns.map(() => `%${filters.search}%`));
  }
  const companyFilter = companyScope.filterSql(`${alias}.company_id`, companyScope.parseFilter(filters.company_id));
  sql += companyFilter.sql;
  params.push(...companyFilter.params);
  return { sql, params };
};

/** Runs a filtered list query with the project's page/limit convention. */
export const paginate = async (query, params, filters) => {
  const page = parseInt(filters.page, 10) > 0 ? parseInt(filters.page, 10) : 1;
  const limit = parseInt(filters.limit, 10) > 0 ? Math.min(parseInt(filters.limit, 10), 500) : 15;
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) as total FROM (${query}) as sub`, params);
  const [rows] = await pool.query(`${query} LIMIT ? OFFSET ?`, [...params, limit, (page - 1) * limit]);
  return { rows, total, page, limit };
};

export const qualityControlRepository = {
  findAll: async (filters = {}) => {
    let query = `${QC_SELECT} WHERE 1 = 1`;
    const params = [];
    if (QC_STATUSES.includes(filters.status)) {
      query += ' AND qi.status = ?';
      params.push(filters.status);
    } else if (QC_RESULTS.includes(filters.status)) {
      query += " AND qi.status = 'completed' AND qi.result = ?";
      params.push(filters.status);
    }
    const f = sourceFilters('qi', filters, { dateColumn: 'inspection_date', search: ['qi.qc_no'] });
    query += `${f.sql} ORDER BY qi.id DESC`;
    params.push(...f.params);
    return paginate(query, params, filters);
  },

  findById: async (id) => {
    const [rows] = await pool.query(`${QC_SELECT} WHERE qi.id = ?`, [id]);
    if (rows.length === 0) return null;
    const qc = rows[0];
    qc.trace = await findLotTrace(qc.lot_id);
    const [returns] = await pool.query(
      'SELECT id, return_no, return_date, quantity, reason, status FROM supplier_returns WHERE quality_inspection_id = ? ORDER BY id',
      [id]
    );
    const [debitNotes] = await pool.query(
      'SELECT id, debit_note_no, debit_note_date, supplier_return_id, quantity, amount, amount_basis, status FROM debit_notes WHERE quality_inspection_id = ? ORDER BY id',
      [id]
    );
    const [history] = await pool.query(
      'SELECT id, qc_no, inspection_date, inspected_quantity, status, result FROM quality_inspections WHERE lot_id = ? AND id <> ? ORDER BY id',
      [qc.lot_id, id]
    );
    qc.returns = returns;
    qc.debit_notes = debitNotes;
    qc.lot_inspections = history;
    return qc;
  },

  /** Lots of a company that can still be inspected (posted GRN, lot received, quantity not yet claimed). */
  findEligibleLots: async (companyId, search) => {
    let query = `${LOT_SOURCE_SELECT}
      WHERE l.company_id = ? AND l.status = 'received'
        AND ie.entry_type = 'grn' AND ie.receipt_status = 'posted' AND ie.deleted_at IS NULL
        AND l.quantity - COALESCE(qt.claimed_quantity, 0) > 0`;
    const params = [companyId];
    if (search) {
      query += ' AND (l.lot_no LIKE ? OR l.supplier_lot_no LIKE ? OR ie.inward_no LIKE ? OR po.po_num LIKE ? OR p.name LIKE ?)';
      params.push(...Array(5).fill(`%${search}%`));
    }
    query += ' ORDER BY l.id DESC LIMIT 200';
    const [rows] = await pool.query(query, params);
    return rows;
  },

  /** The lot with its source state and QC totals (read AFTER the lot is locked). */
  findLotSource: async (executor, lotId) => {
    const [rows] = await executor.query(`${LOT_SOURCE_SELECT} WHERE l.id = ?`, [lotId]);
    return rows[0] || null;
  },

  /** Immutable lot references, read before a transaction to lock in GRN → lot order. */
  findLotRef: async (lotId) => {
    const [rows] = await pool.query('SELECT id, inward_entry_id FROM lots WHERE id = ?', [lotId]);
    return rows[0] || null;
  },

  findRef: async (id) => {
    const [rows] = await pool.query('SELECT id, lot_id, inward_entry_id FROM quality_inspections WHERE id = ?', [id]);
    return rows[0] || null;
  },

  /**
   * Lock order shared with GRN cancel: GRN header, then lot (then QC). Holding
   * the GRN in share mode keeps it from being cancelled mid-inspection.
   */
  lockGrnAndLot: async (connection, inwardEntryId, lotId) => {
    await connection.query('SELECT id FROM inward_entries WHERE id = ? FOR SHARE', [inwardEntryId]);
    await connection.query('SELECT id FROM lots WHERE id = ? FOR UPDATE', [lotId]);
  },

  lock: async (connection, id) => {
    const [rows] = await connection.query('SELECT * FROM quality_inspections WHERE id = ? FOR UPDATE', [id]);
    return rows[0] || null;
  },

  /** Inspected quantity already claimed on a lot by other draft/completed QCs. */
  claimedOnLot: async (executor, lotId, excludeId = 0) => {
    const [[row]] = await executor.query(
      `SELECT COALESCE(SUM(qi.inspected_quantity), 0) AS claimed FROM quality_inspections qi
       WHERE qi.lot_id = ? AND ${ACTIVE_QC} AND qi.id <> ?`,
      [lotId, excludeId]
    );
    return row.claimed;
  },

  insert: async (connection, data) => {
    const [result] = await connection.query(`
      INSERT INTO quality_inspections (
        company_id, qc_no, financial_year, inspection_date, lot_id, inward_entry_id, inward_entry_item_id,
        purchase_order_id, purchase_order_item_id, supplier_id, product_id, uom_id, unit,
        inspected_quantity, accepted_quantity, rejected_quantity, return_quantity,
        shade, edge_to_edge_shade, weaving_defects, remarks, status, created_by, updated_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, NOW(), NOW())
    `, [
      data.company_id, data.qc_no, data.financial_year, data.inspection_date, data.lot_id, data.inward_entry_id,
      data.inward_entry_item_id, data.purchase_order_id, data.purchase_order_item_id, data.supplier_id,
      data.product_id, data.uom_id, data.unit, data.inspected_quantity, data.accepted_quantity,
      data.rejected_quantity, data.return_quantity, data.shade, data.edge_to_edge_shade,
      data.weaving_defects, data.remarks, data.created_by, data.created_by,
    ]);
    return result.insertId;
  },

  update: async (connection, id, data) => {
    await connection.query(`
      UPDATE quality_inspections SET inspection_date = ?, inspected_quantity = ?, accepted_quantity = ?,
        rejected_quantity = ?, return_quantity = ?, shade = ?, edge_to_edge_shade = ?, weaving_defects = ?,
        remarks = ?, updated_by = ?, updated_at = NOW()
      WHERE id = ?
    `, [
      data.inspection_date, data.inspected_quantity, data.accepted_quantity, data.rejected_quantity,
      data.return_quantity, data.shade, data.edge_to_edge_shade, data.weaving_defects, data.remarks,
      data.updated_by, id,
    ]);
  },

  setCompleted: async (connection, id, result, userId) => {
    await connection.query(`
      UPDATE quality_inspections SET status = 'completed', result = ?, completed_at = NOW(), completed_by = ?,
        updated_by = ?, updated_at = NOW()
      WHERE id = ?
    `, [result, userId, userId, id]);
  },

  setCancelled: async (connection, id, reason, userId) => {
    await connection.query(`
      UPDATE quality_inspections SET status = 'cancelled', cancelled_at = NOW(), cancelled_by = ?,
        cancellation_reason = ?, updated_by = ?, updated_at = NOW()
      WHERE id = ?
    `, [userId, reason, userId, id]);
  },

  /** Non-cancelled returns and debit notes that depend on a QC. */
  countDependents: async (executor, id) => {
    const [[row]] = await executor.query(`
      SELECT (SELECT COUNT(*) FROM supplier_returns WHERE quality_inspection_id = ? AND status <> 'cancelled') AS returns_count,
             (SELECT COUNT(*) FROM debit_notes WHERE quality_inspection_id = ? AND status <> 'cancelled') AS debit_notes_count
    `, [id, id]);
    return row;
  },
};
