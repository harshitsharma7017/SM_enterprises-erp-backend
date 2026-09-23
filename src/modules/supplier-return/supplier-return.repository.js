import { pool } from '../../config/database.js';
import { findLotTrace } from '../lot/lot.repository.js';
import { sourceFilters, paginate } from '../quality-control/quality-control.repository.js';
import { RETURN_TOTALS_BY_QC } from '../quality-control/qc-ledger.js';

const RETURN_SELECT = `
  SELECT sr.*, qi.qc_no, qi.inspection_date, qi.rejected_quantity AS qc_rejected_quantity,
         qi.return_quantity AS qc_marked_return_quantity, qi.result AS qc_result, qi.status AS qc_status,
         l.lot_no, l.width_inch, l.supplier_lot_no, ie.inward_no, ie.inward_date,
         po.po_num, po.origin AS purchase_order_origin,
         s.company_name AS supplier_name, p.name AS product_name, p.item_group_code,
         COALESCE(u.decimal_places, 0) AS uom_decimal_places,
         cmp.code AS company_code, COALESCE(cmp.short_name, cmp.name) AS company_label,
         u1.name AS creator_name, u2.name AS poster_name, u3.name AS canceller_name
  FROM supplier_returns sr
  JOIN quality_inspections qi ON qi.id = sr.quality_inspection_id
  JOIN lots l ON l.id = sr.lot_id
  JOIN inward_entries ie ON ie.id = sr.inward_entry_id
  JOIN purchase_orders po ON po.id = sr.purchase_order_id
  LEFT JOIN suppliers s ON s.id = sr.supplier_id
  LEFT JOIN products p ON p.id = sr.product_id
  LEFT JOIN uoms u ON u.id = sr.uom_id
  LEFT JOIN companies cmp ON cmp.id = sr.company_id
  LEFT JOIN users u1 ON u1.id = sr.created_by
  LEFT JOIN users u2 ON u2.id = sr.posted_by
  LEFT JOIN users u3 ON u3.id = sr.cancelled_by
`;

/** A completed QC with rejected material and what has been returned against it so far. */
const RETURNABLE_QC_SELECT = `
  SELECT qi.id, qi.qc_no, qi.company_id, qi.inspection_date, qi.lot_id, qi.inward_entry_id, qi.purchase_order_id,
         qi.supplier_id, qi.unit, qi.rejected_quantity, qi.return_quantity AS marked_return_quantity, qi.result,
         l.lot_no, l.width_inch, l.supplier_lot_no, ie.inward_no, ie.inward_date, po.po_num, po.origin AS purchase_order_origin,
         s.company_name AS supplier_name, p.name AS product_name, p.item_group_code,
         COALESCE(u.decimal_places, 0) AS uom_decimal_places,
         cmp.code AS company_code, COALESCE(cmp.short_name, cmp.name) AS company_label,
         COALESCE(rt.returned_quantity, 0) AS returned_quantity,
         COALESCE(rt.return_draft_quantity, 0) AS return_draft_quantity,
         qi.rejected_quantity - COALESCE(rt.returned_quantity, 0) - COALESCE(rt.return_draft_quantity, 0) AS returnable_quantity
  FROM quality_inspections qi
  JOIN lots l ON l.id = qi.lot_id
  JOIN inward_entries ie ON ie.id = qi.inward_entry_id
  JOIN purchase_orders po ON po.id = qi.purchase_order_id
  LEFT JOIN suppliers s ON s.id = qi.supplier_id
  LEFT JOIN products p ON p.id = qi.product_id
  LEFT JOIN uoms u ON u.id = qi.uom_id
  LEFT JOIN companies cmp ON cmp.id = qi.company_id
  LEFT JOIN (${RETURN_TOTALS_BY_QC}) rt ON rt.quality_inspection_id = qi.id
`;

export const supplierReturnRepository = {
  findAll: async (filters = {}) => {
    let query = `${RETURN_SELECT} WHERE 1 = 1`;
    const params = [];
    if (['draft', 'posted', 'cancelled'].includes(filters.status)) {
      query += ' AND sr.status = ?';
      params.push(filters.status);
    }
    if (filters.quality_inspection_id) {
      query += ' AND sr.quality_inspection_id = ?';
      params.push(Number(filters.quality_inspection_id));
    }
    const f = sourceFilters('sr', filters, { dateColumn: 'return_date', search: ['sr.return_no', 'qi.qc_no'] });
    query += `${f.sql} ORDER BY sr.id DESC`;
    params.push(...f.params);
    return paginate(query, params, filters);
  },

  findById: async (id) => {
    const [rows] = await pool.query(`${RETURN_SELECT} WHERE sr.id = ?`, [id]);
    if (rows.length === 0) return null;
    const ret = rows[0];
    ret.trace = await findLotTrace(ret.lot_id);
    const [debitNotes] = await pool.query(
      'SELECT id, debit_note_no, debit_note_date, quantity, amount, amount_basis, status FROM debit_notes WHERE supplier_return_id = ? ORDER BY id',
      [id]
    );
    ret.debit_notes = debitNotes;
    return ret;
  },

  /** Completed QCs of a company that still have rejected quantity to return. */
  findReturnable: async (companyId, search) => {
    let query = `${RETURNABLE_QC_SELECT}
      WHERE qi.company_id = ? AND qi.status = 'completed'
        AND qi.rejected_quantity - COALESCE(rt.returned_quantity, 0) - COALESCE(rt.return_draft_quantity, 0) > 0`;
    const params = [companyId];
    if (search) {
      query += ' AND (qi.qc_no LIKE ? OR l.lot_no LIKE ? OR ie.inward_no LIKE ? OR po.po_num LIKE ?)';
      params.push(...Array(4).fill(`%${search}%`));
    }
    const [rows] = await pool.query(`${query} ORDER BY qi.id DESC LIMIT 200`, params);
    return rows;
  },

  findReturnableQc: async (qcId) => {
    const [rows] = await pool.query(`${RETURNABLE_QC_SELECT} WHERE qi.id = ?`, [qcId]);
    return rows[0] || null;
  },

  findRef: async (id) => {
    const [rows] = await pool.query('SELECT id, quality_inspection_id FROM supplier_returns WHERE id = ?', [id]);
    return rows[0] || null;
  },

  lock: async (connection, id) => {
    const [rows] = await connection.query('SELECT * FROM supplier_returns WHERE id = ? FOR UPDATE', [id]);
    return rows[0] || null;
  },

  /** Quantity other draft/posted returns already take from a QC's rejected quantity. */
  reservedOnQc: async (executor, qcId, excludeId = 0) => {
    const [[row]] = await executor.query(
      "SELECT COALESCE(SUM(quantity), 0) AS reserved FROM supplier_returns WHERE quality_inspection_id = ? AND status IN ('draft', 'posted') AND id <> ?",
      [qcId, excludeId]
    );
    return row.reserved;
  },

  insert: async (connection, data) => {
    const [result] = await connection.query(`
      INSERT INTO supplier_returns (
        company_id, return_no, financial_year, return_date, quality_inspection_id, lot_id, inward_entry_id,
        inward_entry_item_id, purchase_order_id, purchase_order_item_id, supplier_id, product_id, uom_id, unit,
        quantity, reason, remarks, status, created_by, updated_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, NOW(), NOW())
    `, [
      data.company_id, data.return_no, data.financial_year, data.return_date, data.quality_inspection_id,
      data.lot_id, data.inward_entry_id, data.inward_entry_item_id, data.purchase_order_id,
      data.purchase_order_item_id, data.supplier_id, data.product_id, data.uom_id, data.unit,
      data.quantity, data.reason, data.remarks, data.created_by, data.created_by,
    ]);
    return result.insertId;
  },

  setPosted: async (connection, id, userId) => {
    await connection.query(
      "UPDATE supplier_returns SET status = 'posted', posted_at = NOW(), posted_by = ?, updated_by = ?, updated_at = NOW() WHERE id = ?",
      [userId, userId, id]
    );
  },

  setCancelled: async (connection, id, userId) => {
    await connection.query(
      "UPDATE supplier_returns SET status = 'cancelled', cancelled_at = NOW(), cancelled_by = ?, updated_by = ?, updated_at = NOW() WHERE id = ?",
      [userId, userId, id]
    );
  },

  countDebitNotes: async (executor, id) => {
    const [[row]] = await executor.query(
      "SELECT COUNT(*) AS cnt FROM debit_notes WHERE supplier_return_id = ? AND status <> 'cancelled'",
      [id]
    );
    return row.cnt;
  },
};
