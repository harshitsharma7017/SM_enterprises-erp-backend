import { pool } from '../../config/database.js';
import { companyScope } from '../../services/company-scope.service.js';
import { findProductionSource } from '../lot/lot.repository.js';
import { inwardEntryRepository } from '../inward-entry/inward-entry.repository.js';

const isSet = (v) => v !== undefined && v !== null && v !== '';
const isId = (v) => isSet(v) && Number.isInteger(Number(v)) && Number(v) > 0;

const INVOICE_SELECT = `
  SELECT i.*, cmp.code AS company_code, COALESCE(cmp.short_name, cmp.name) AS company_label,
         b.company_name AS buyer_name, oc.oc_num, oc.oc_date, oc.buyer_ref AS order_buyer_ref, pi.pi_no, pi.status AS proforma_status,
         cur.iso_code AS currency_code, u1.name AS creator_name, u2.name AS issuer_name, u3.name AS canceller_name,
         (SELECT COUNT(*) FROM invoice_items x WHERE x.invoice_id = i.id) AS lines_count,
         (SELECT SUM(x.amount) FROM invoice_items x WHERE x.invoice_id = i.id) AS total_amount,
         (SELECT COUNT(*) FROM invoice_items x WHERE x.invoice_id = i.id AND x.unit_price IS NULL) AS unpriced_lines_count,
         (SELECT GROUP_CONCAT(DISTINCT d.dispatch_no ORDER BY d.id SEPARATOR ', ') FROM invoice_items x JOIN dispatches d ON d.id = x.dispatch_id
          WHERE x.invoice_id = i.id) AS dispatch_nos
  FROM invoices i
  LEFT JOIN companies cmp ON cmp.id = i.company_id
  LEFT JOIN buyers b ON b.id = i.buyer_id
  LEFT JOIN order_confirmations oc ON oc.id = i.order_confirmation_id
  LEFT JOIN proforma_invoices pi ON pi.id = i.proforma_invoice_id
  LEFT JOIN currencies cur ON cur.id = i.currency_id
  LEFT JOIN users u1 ON u1.id = i.created_by
  LEFT JOIN users u2 ON u2.id = i.issued_by
  LEFT JOIN users u3 ON u3.id = i.cancelled_by
`;

const ITEM_SELECT = `
  SELECT ii.*, p.name AS product_name, p.item_group_code, COALESCE(u.decimal_places, 0) AS uom_decimal_places,
         d.dispatch_no, d.dispatch_date, d.dispatch_type, d.purchase_order_id, d.supplier_id, s.company_name AS supplier_name,
         di.quantity AS dispatched_quantity, l.lot_no, l.processing_record_id, oci.design_no, po.po_num,
         sm.id AS stock_movement_id, sm.movement_no AS stock_movement_no
  FROM invoice_items ii
  JOIN dispatch_items di ON di.id = ii.dispatch_item_id
  JOIN dispatches d ON d.id = ii.dispatch_id
  JOIN products p ON p.id = ii.product_id
  LEFT JOIN uoms u ON u.id = ii.uom_id
  LEFT JOIN lots l ON l.id = ii.lot_id
  LEFT JOIN order_confirmation_items oci ON oci.id = ii.order_confirmation_item_id
  LEFT JOIN purchase_orders po ON po.id = d.purchase_order_id
  LEFT JOIN suppliers s ON s.id = d.supplier_id
  LEFT JOIN stock_movements sm ON sm.dispatch_item_id = di.id AND sm.movement_type = 'DISPATCH'
`;

/**
 * Dispatch lines with what ISSUED invoices (other than `?`) already bill.
 * The order of a line is its order item's order (stock lines, and direct
 * lines whose PO was raised from an order); NULL for other direct lines.
 */
const INVOICEABLE_SELECT = `
  SELECT di.id AS dispatch_item_id, di.dispatch_id, di.order_confirmation_item_id, di.lot_id, di.purchase_order_item_id,
         di.product_id, di.uom_id, di.unit, di.quantity AS dispatched_quantity,
         d.dispatch_no, d.dispatch_date, d.dispatch_type, d.status AS dispatch_status, d.company_id, d.buyer_id, d.destination_name,
         oci.order_confirmation_id, oci.price, oci.design_no, oci.description AS item_description,
         p.name AS product_name, p.company_id AS product_company_id, COALESCE(u.decimal_places, 0) AS uom_decimal_places,
         l.lot_no, po.po_num, oc.oc_num, b.company_name AS buyer_name,
         COALESCE((SELECT SUM(ii.quantity) FROM invoice_items ii JOIN invoices i ON i.id = ii.invoice_id
                   WHERE i.status = 'issued' AND ii.dispatch_item_id = di.id AND i.id <> ?), 0) AS invoiced_quantity
  FROM dispatch_items di
  JOIN dispatches d ON d.id = di.dispatch_id
  JOIN products p ON p.id = di.product_id
  LEFT JOIN uoms u ON u.id = di.uom_id
  LEFT JOIN order_confirmation_items oci ON oci.id = di.order_confirmation_item_id
  LEFT JOIN order_confirmations oc ON oc.id = oci.order_confirmation_id
  LEFT JOIN lots l ON l.id = di.lot_id
  LEFT JOIN purchase_orders po ON po.id = d.purchase_order_id
  LEFT JOIN buyers b ON b.id = d.buyer_id
`;

const NOT_FULLY_INVOICED = `di.quantity > COALESCE((SELECT SUM(ii.quantity) FROM invoice_items ii JOIN invoices i ON i.id = ii.invoice_id
  WHERE i.status = 'issued' AND ii.dispatch_item_id = di.id), 0)`;

export const invoiceRepository = {
  findAll: async (filters = {}) => {
    let query = `${INVOICE_SELECT} WHERE 1 = 1`;
    const params = [];
    if (['draft', 'issued', 'cancelled'].includes(filters.status)) {
      query += ' AND i.status = ?';
      params.push(filters.status);
    }
    for (const [column, value] of [
      ['i.buyer_id', filters.buyer_id], ['i.order_confirmation_id', filters.order_confirmation_id], ['i.proforma_invoice_id', filters.proforma_invoice_id],
    ]) {
      if (isId(value)) {
        query += ` AND ${column} = ?`;
        params.push(Number(value));
      }
    }
    if (isId(filters.dispatch_id)) {
      query += ' AND EXISTS (SELECT 1 FROM invoice_items x WHERE x.invoice_id = i.id AND x.dispatch_id = ?)';
      params.push(Number(filters.dispatch_id));
    }
    if (isSet(filters.order)) {
      query += ' AND oc.oc_num LIKE ?';
      params.push(`%${filters.order}%`);
    }
    if (isSet(filters.dispatch)) {
      query += ' AND EXISTS (SELECT 1 FROM invoice_items x JOIN dispatches d ON d.id = x.dispatch_id WHERE x.invoice_id = i.id AND d.dispatch_no LIKE ?)';
      params.push(`%${filters.dispatch}%`);
    }
    if (isSet(filters.date_from)) {
      query += ' AND i.invoice_date >= ?';
      params.push(filters.date_from);
    }
    if (isSet(filters.date_to)) {
      query += ' AND i.invoice_date <= ?';
      params.push(filters.date_to);
    }
    if (filters.search) {
      const columns = ['i.invoice_no', 'i.reference', 'oc.oc_num', 'pi.pi_no', 'b.company_name'];
      query += ` AND (${columns.map((c) => `${c} LIKE ?`).join(' OR ')}
        OR EXISTS (SELECT 1 FROM invoice_items x JOIN dispatches d ON d.id = x.dispatch_id WHERE x.invoice_id = i.id AND d.dispatch_no LIKE ?))`;
      params.push(...columns.map(() => `%${filters.search}%`), `%${filters.search}%`);
    }
    const cf = companyScope.filterSql('i.company_id', companyScope.parseFilter(filters.company_id));
    query += `${cf.sql} ORDER BY i.id DESC`;
    params.push(...cf.params);

    const page = parseInt(filters.page, 10) > 0 ? parseInt(filters.page, 10) : 1;
    const limit = parseInt(filters.limit, 10) > 0 ? Math.min(parseInt(filters.limit, 10), 500) : 15;
    const [[{ total }]] = await pool.query(`SELECT COUNT(*) as total FROM (${query}) as sub`, params);
    const [rows] = await pool.query(`${query} LIMIT ? OFFSET ?`, [...params, limit, (page - 1) * limit]);
    return { rows, total, page, limit };
  },

  /**
   * Header + lines with their trace: a stock line's finished lot → processing
   * → issue → source lots → GRN → PO → supplier; a direct line's PO source
   * (supplier / mill, and OC or plan / requirements / projections).
   */
  findById: async (id) => {
    const [rows] = await pool.query(`${INVOICE_SELECT} WHERE i.id = ?`, [id]);
    if (rows.length === 0) return null;
    const invoice = rows[0];
    const [items] = await pool.query(`${ITEM_SELECT} WHERE ii.invoice_id = ? ORDER BY ii.sort_order, ii.id`, [id]);
    const production = {};
    const poTraces = {};
    for (const item of items) {
      if (item.processing_record_id && !production[item.processing_record_id]) production[item.processing_record_id] = await findProductionSource(item.processing_record_id);
      if (item.purchase_order_id && !poTraces[item.purchase_order_id]) poTraces[item.purchase_order_id] = await inwardEntryRepository.getPoTrace(item.purchase_order_id);
    }
    invoice.items = items.map((i) => ({
      ...i,
      production: i.processing_record_id ? production[i.processing_record_id] : null,
      po_trace: i.purchase_order_id ? poTraces[i.purchase_order_id] : null,
    }));
    return invoice;
  },

  findInvoiceable: async (executor, where, params, excludeInvoiceId = 0) => {
    const [rows] = await executor.query(`${INVOICEABLE_SELECT} WHERE ${where} ORDER BY d.id, di.sort_order, di.id`, [excludeInvoiceId, ...params]);
    return rows;
  },

  /** Posted dispatch lines not yet fully billed: grouped by order, and direct dispatches with no order (and a buyer). */
  findInvoiceableSources: async (companyId) => {
    const [orders] = await pool.query(`
      SELECT oc.id, oc.oc_num, oc.oc_date, b.company_name AS buyer_name
      FROM order_confirmations oc LEFT JOIN buyers b ON b.id = oc.buyer_id
      WHERE oc.deleted_at IS NULL AND oc.company_id = ? AND EXISTS (
        SELECT 1 FROM dispatch_items di JOIN dispatches d ON d.id = di.dispatch_id
        JOIN order_confirmation_items oci ON oci.id = di.order_confirmation_item_id
        WHERE d.status = 'posted' AND oci.order_confirmation_id = oc.id AND ${NOT_FULLY_INVOICED})
      ORDER BY oc.id DESC`, [companyId]);
    const [dispatches] = await pool.query(`
      SELECT d.id, d.dispatch_no, d.dispatch_date, d.destination_name, b.company_name AS buyer_name, po.po_num
      FROM dispatches d JOIN buyers b ON b.id = d.buyer_id LEFT JOIN purchase_orders po ON po.id = d.purchase_order_id
      WHERE d.status = 'posted' AND d.company_id = ? AND d.dispatch_type = 'DIRECT_SUPPLIER_DISPATCH' AND EXISTS (
        SELECT 1 FROM dispatch_items di WHERE di.dispatch_id = d.id AND di.order_confirmation_item_id IS NULL AND ${NOT_FULLY_INVOICED})
      ORDER BY d.id DESC`, [companyId]);
    return { orders, dispatches };
  },

  findIssuedProformas: async (executor, ocId) => {
    const [rows] = await executor.query("SELECT id, pi_no, pi_date FROM proforma_invoices WHERE order_confirmation_id = ? AND status = 'issued' ORDER BY id", [ocId]);
    return rows;
  },

  lock: async (connection, id) => {
    const [rows] = await connection.query('SELECT * FROM invoices WHERE id = ? FOR UPDATE', [id]);
    return rows[0] || null;
  },

  lockItems: async (connection, id) => {
    const [rows] = await connection.query('SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY sort_order, id FOR UPDATE', [id]);
    return rows;
  },

  /** Serialises billing of the same dispatch lines (ascending ids, so lockers never deadlock). */
  lockDispatchItems: async (connection, ids) => {
    if (ids.length === 0) return;
    await connection.query('SELECT id FROM dispatch_items WHERE id IN (?) ORDER BY id FOR UPDATE', [[...ids].sort((a, b) => a - b)]);
  },

  lockProforma: async (connection, id) => {
    const [rows] = await connection.query('SELECT * FROM proforma_invoices WHERE id = ? FOR UPDATE', [id]);
    return rows[0] || null;
  },

  insertHeader: async (connection, data) => {
    const [result] = await connection.query(`
      INSERT INTO invoices (company_id, invoice_date, buyer_id, order_confirmation_id, proforma_invoice_id, currency_id, reference, remarks,
        status, created_by, updated_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, NOW(), NOW())
    `, [data.company_id, data.invoice_date, data.buyer_id, data.order_confirmation_id, data.proforma_invoice_id, data.currency_id,
      data.reference, data.remarks, data.user_id, data.user_id]);
    return result.insertId;
  },

  updateHeader: async (connection, id, data) => {
    await connection.query(`
      UPDATE invoices SET invoice_date = ?, buyer_id = ?, order_confirmation_id = ?, proforma_invoice_id = ?, currency_id = ?, reference = ?,
        remarks = ?, updated_by = ?, updated_at = NOW()
      WHERE id = ?
    `, [data.invoice_date, data.buyer_id, data.order_confirmation_id, data.proforma_invoice_id, data.currency_id, data.reference, data.remarks, data.user_id, id]);
  },

  replaceItems: async (connection, id, items) => {
    await connection.query('DELETE FROM invoice_items WHERE invoice_id = ?', [id]);
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      await connection.query(`
        INSERT INTO invoice_items (invoice_id, sort_order, dispatch_id, dispatch_item_id, order_confirmation_item_id, lot_id, purchase_order_item_id,
          product_id, uom_id, unit, description, quantity, unit_price, remarks)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [id, i + 1, it.dispatch_id, it.dispatch_item_id, it.order_confirmation_item_id, it.lot_id, it.purchase_order_item_id,
        it.product_id, it.uom_id, it.unit, it.description, it.quantity, it.unit_price, it.remarks]);
    }
  },

  setIssued: async (connection, id, invoiceNo, financialYear, userId) => {
    await connection.query(
      "UPDATE invoices SET status = 'issued', invoice_no = ?, financial_year = ?, issued_at = NOW(), issued_by = ?, updated_by = ?, updated_at = NOW() WHERE id = ?",
      [invoiceNo, financialYear, userId, userId, id]
    );
  },

  setCancelled: async (connection, id, reason, userId) => {
    await connection.query(
      "UPDATE invoices SET status = 'cancelled', cancelled_at = NOW(), cancelled_by = ?, cancellation_reason = ?, updated_by = ?, updated_at = NOW() WHERE id = ?",
      [userId, reason, userId, id]
    );
  },
};
