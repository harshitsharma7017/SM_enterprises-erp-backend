import { pool } from '../../config/database.js';
import { findLotTrace } from '../lot/lot.repository.js';
import { sourceFilters, paginate } from '../quality-control/quality-control.repository.js';
import { RETURN_TOTALS_BY_QC, DEBIT_TOTALS_BY_QC } from '../quality-control/qc-ledger.js';

export const NOTE_SELECT = `
  SELECT dn.*, qi.qc_no, qi.inspection_date, qi.rejected_quantity AS qc_rejected_quantity, qi.result AS qc_result,
         sr.return_no, sr.return_date, sr.quantity AS return_quantity, sr.status AS return_status,
         l.lot_no, l.width_inch, l.supplier_lot_no, ie.inward_no, ie.inward_date,
         po.po_num, po.origin AS purchase_order_origin,
         s.company_name AS supplier_name, s.gst_number AS supplier_gst_number,
         p.name AS product_name, p.item_group_code,
         COALESCE(u.decimal_places, 0) AS uom_decimal_places,
         cmp.code AS company_code, COALESCE(cmp.short_name, cmp.name) AS company_label,
         u1.name AS creator_name, u2.name AS poster_name, u3.name AS canceller_name
  FROM debit_notes dn
  JOIN quality_inspections qi ON qi.id = dn.quality_inspection_id
  LEFT JOIN supplier_returns sr ON sr.id = dn.supplier_return_id
  JOIN lots l ON l.id = dn.lot_id
  JOIN inward_entries ie ON ie.id = dn.inward_entry_id
  JOIN purchase_orders po ON po.id = dn.purchase_order_id
  LEFT JOIN suppliers s ON s.id = dn.supplier_id
  LEFT JOIN products p ON p.id = dn.product_id
  LEFT JOIN uoms u ON u.id = dn.uom_id
  LEFT JOIN companies cmp ON cmp.id = dn.company_id
  LEFT JOIN users u1 ON u1.id = dn.created_by
  LEFT JOIN users u2 ON u2.id = dn.posted_by
  LEFT JOIN users u3 ON u3.id = dn.cancelled_by
`;

/** A completed QC with rejected material, its PO price and what is already debited against it. */
const DEBITABLE_QC_SELECT = `
  SELECT qi.id, qi.qc_no, qi.company_id, qi.inspection_date, qi.lot_id, qi.inward_entry_id, qi.purchase_order_id,
         qi.supplier_id, qi.unit, qi.rejected_quantity, qi.result,
         l.lot_no, l.width_inch, l.supplier_lot_no, ie.inward_no, ie.inward_date, po.po_num, po.origin AS purchase_order_origin,
         s.company_name AS supplier_name, p.name AS product_name, p.item_group_code,
         poi.cost_price AS po_unit_price,
         COALESCE(u.decimal_places, 0) AS uom_decimal_places,
         cmp.code AS company_code, COALESCE(cmp.short_name, cmp.name) AS company_label,
         COALESCE(rt.returned_quantity, 0) AS returned_quantity,
         COALESCE(dt.debited_quantity, 0) AS debited_quantity,
         COALESCE(dt.debit_draft_quantity, 0) AS debit_draft_quantity,
         qi.rejected_quantity - COALESCE(dt.debited_quantity, 0) - COALESCE(dt.debit_draft_quantity, 0) AS debitable_quantity
  FROM quality_inspections qi
  JOIN lots l ON l.id = qi.lot_id
  JOIN inward_entries ie ON ie.id = qi.inward_entry_id
  JOIN purchase_orders po ON po.id = qi.purchase_order_id
  JOIN purchase_order_items poi ON poi.id = qi.purchase_order_item_id
  LEFT JOIN suppliers s ON s.id = qi.supplier_id
  LEFT JOIN products p ON p.id = qi.product_id
  LEFT JOIN uoms u ON u.id = qi.uom_id
  LEFT JOIN companies cmp ON cmp.id = qi.company_id
  LEFT JOIN (${RETURN_TOTALS_BY_QC}) rt ON rt.quality_inspection_id = qi.id
  LEFT JOIN (${DEBIT_TOTALS_BY_QC}) dt ON dt.quality_inspection_id = qi.id
`;

/** Posted returns of the given QCs with what is already debited against each. */
const returnsFor = async (qcIds) => {
  if (qcIds.length === 0) return [];
  const [rows] = await pool.query(`
    SELECT sr.id, sr.quality_inspection_id, sr.return_no, sr.return_date, sr.quantity,
           sr.quantity - COALESCE(SUM(CASE WHEN dn.status IN ('draft', 'posted') THEN dn.quantity ELSE 0 END), 0) AS debitable_quantity
    FROM supplier_returns sr
    LEFT JOIN debit_notes dn ON dn.supplier_return_id = sr.id
    WHERE sr.quality_inspection_id IN (?) AND sr.status = 'posted'
    GROUP BY sr.id
    ORDER BY sr.id
  `, [qcIds]);
  return rows;
};

const withReturns = async (inspections) => {
  const returns = await returnsFor(inspections.map((q) => q.id));
  return inspections.map((q) => ({ ...q, returns: returns.filter((r) => r.quality_inspection_id === q.id) }));
};

export const debitNoteRepository = {
  findAll: async (filters = {}) => {
    let query = `${NOTE_SELECT} WHERE 1 = 1`;
    const params = [];
    if (['draft', 'posted', 'cancelled'].includes(filters.status)) {
      query += ' AND dn.status = ?';
      params.push(filters.status);
    }
    for (const [column, value] of [['dn.quality_inspection_id', filters.quality_inspection_id], ['dn.supplier_return_id', filters.supplier_return_id]]) {
      if (value) {
        query += ` AND ${column} = ?`;
        params.push(Number(value));
      }
    }
    const f = sourceFilters('dn', filters, { dateColumn: 'debit_note_date', search: ['dn.debit_note_no', 'qi.qc_no', 'sr.return_no'] });
    query += `${f.sql} ORDER BY dn.id DESC`;
    params.push(...f.params);
    return paginate(query, params, filters);
  },

  findById: async (id) => {
    const [rows] = await pool.query(`${NOTE_SELECT} WHERE dn.id = ?`, [id]);
    if (rows.length === 0) return null;
    const note = rows[0];
    note.trace = await findLotTrace(note.lot_id);
    return note;
  },

  /** Completed QCs of a company with rejected quantity not yet debited (and their posted returns). */
  findDebitable: async (companyId, search) => {
    let query = `${DEBITABLE_QC_SELECT}
      WHERE qi.company_id = ? AND qi.status = 'completed'
        AND qi.rejected_quantity - COALESCE(dt.debited_quantity, 0) - COALESCE(dt.debit_draft_quantity, 0) > 0`;
    const params = [companyId];
    if (search) {
      query += ' AND (qi.qc_no LIKE ? OR l.lot_no LIKE ? OR ie.inward_no LIKE ? OR po.po_num LIKE ?)';
      params.push(...Array(4).fill(`%${search}%`));
    }
    const [rows] = await pool.query(`${query} ORDER BY qi.id DESC LIMIT 200`, params);
    return withReturns(rows);
  },

  findDebitableQc: async (qcId) => {
    const [rows] = await pool.query(`${DEBITABLE_QC_SELECT} WHERE qi.id = ?`, [qcId]);
    if (rows.length === 0) return null;
    return (await withReturns(rows))[0];
  },

  findRef: async (id) => {
    const [rows] = await pool.query('SELECT id, quality_inspection_id, supplier_return_id FROM debit_notes WHERE id = ?', [id]);
    return rows[0] || null;
  },

  lock: async (connection, id) => {
    const [rows] = await connection.query('SELECT * FROM debit_notes WHERE id = ? FOR UPDATE', [id]);
    return rows[0] || null;
  },

  lockReturn: async (connection, id) => {
    const [rows] = await connection.query('SELECT * FROM supplier_returns WHERE id = ? FOR UPDATE', [id]);
    return rows[0] || null;
  },

  /** The PO line price (purchase_order_items.cost_price), the only price the PO model holds. */
  findPoUnitPrice: async (executor, purchaseOrderItemId) => {
    const [[row]] = await executor.query('SELECT cost_price FROM purchase_order_items WHERE id = ?', [purchaseOrderItemId]);
    return row ? row.cost_price : null;
  },

  /** Quantity other draft/posted debit notes already take on a QC (or on one return). */
  reserved: async (executor, column, sourceId, excludeId = 0) => {
    const [[row]] = await executor.query(
      `SELECT COALESCE(SUM(quantity), 0) AS reserved FROM debit_notes
       WHERE ${column} = ? AND status IN ('draft', 'posted') AND id <> ?`,
      [sourceId, excludeId]
    );
    return row.reserved;
  },

  insert: async (connection, data) => {
    const [result] = await connection.query(`
      INSERT INTO debit_notes (
        company_id, debit_note_no, financial_year, debit_note_date, quality_inspection_id, supplier_return_id,
        lot_id, inward_entry_id, inward_entry_item_id, purchase_order_id, purchase_order_item_id, supplier_id,
        product_id, uom_id, unit, quantity, unit_price, amount, amount_basis, reason, remarks, status,
        created_by, updated_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, NOW(), NOW())
    `, [
      data.company_id, data.debit_note_no, data.financial_year, data.debit_note_date, data.quality_inspection_id,
      data.supplier_return_id, data.lot_id, data.inward_entry_id, data.inward_entry_item_id, data.purchase_order_id,
      data.purchase_order_item_id, data.supplier_id, data.product_id, data.uom_id, data.unit, data.quantity,
      data.unit_price, data.amount, data.amount_basis, data.reason, data.remarks, data.created_by, data.created_by,
    ]);
    return result.insertId;
  },

  update: async (connection, id, data) => {
    await connection.query(`
      UPDATE debit_notes SET debit_note_date = ?, quantity = ?, unit_price = ?, amount = ?, amount_basis = ?,
        reason = ?, remarks = ?, updated_by = ?, updated_at = NOW()
      WHERE id = ?
    `, [
      data.debit_note_date, data.quantity, data.unit_price, data.amount, data.amount_basis,
      data.reason, data.remarks, data.updated_by, id,
    ]);
  },

  setPosted: async (connection, id, userId) => {
    await connection.query(
      "UPDATE debit_notes SET status = 'posted', posted_at = NOW(), posted_by = ?, updated_by = ?, updated_at = NOW() WHERE id = ?",
      [userId, userId, id]
    );
  },

  setCancelled: async (connection, id, userId) => {
    await connection.query(
      "UPDATE debit_notes SET status = 'cancelled', cancelled_at = NOW(), cancelled_by = ?, updated_by = ?, updated_at = NOW() WHERE id = ?",
      [userId, userId, id]
    );
  },
};
