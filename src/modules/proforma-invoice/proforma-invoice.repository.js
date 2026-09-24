import { pool } from '../../config/database.js';
import { companyScope } from '../../services/company-scope.service.js';
import { findProductionSource } from '../lot/lot.repository.js';
import { orderFulfilmentRepository } from '../order-confirmation/order-fulfilment.repository.js';

const isSet = (v) => v !== undefined && v !== null && v !== '';
const isId = (v) => isSet(v) && Number.isInteger(Number(v)) && Number(v) > 0;

const PI_SELECT = `
  SELECT pi.*, cmp.code AS company_code, COALESCE(cmp.short_name, cmp.name) AS company_label,
         b.company_name AS buyer_name, oc.oc_num, oc.oc_date, oc.buyer_ref AS order_buyer_ref, cur.iso_code AS currency_code,
         u1.name AS creator_name, u2.name AS issuer_name, u3.name AS canceller_name, u4.name AS commercial_updater_name,
         (SELECT COUNT(*) FROM proforma_invoice_items x WHERE x.proforma_invoice_id = pi.id) AS lines_count,
         (SELECT SUM(x.amount) FROM proforma_invoice_items x WHERE x.proforma_invoice_id = pi.id) AS total_amount,
         (SELECT COUNT(*) FROM proforma_invoice_items x WHERE x.proforma_invoice_id = pi.id AND x.unit_price IS NULL) AS unpriced_lines_count,
         (SELECT COUNT(*) FROM invoices i WHERE i.proforma_invoice_id = pi.id AND i.status <> 'cancelled') AS invoices_count
  FROM proforma_invoices pi
  LEFT JOIN companies cmp ON cmp.id = pi.company_id
  LEFT JOIN buyers b ON b.id = pi.buyer_id
  LEFT JOIN order_confirmations oc ON oc.id = pi.order_confirmation_id
  LEFT JOIN currencies cur ON cur.id = pi.currency_id
  LEFT JOIN users u1 ON u1.id = pi.created_by
  LEFT JOIN users u2 ON u2.id = pi.issued_by
  LEFT JOIN users u3 ON u3.id = pi.cancelled_by
  LEFT JOIN users u4 ON u4.id = pi.commercial_updated_by
`;

const ITEM_SELECT = `
  SELECT pii.*, p.name AS product_name, p.item_group_code, COALESCE(u.decimal_places, 0) AS uom_decimal_places,
         oci.design_no, oci.qty AS item_ordered_quantity
  FROM proforma_invoice_items pii
  JOIN order_confirmation_items oci ON oci.id = pii.order_confirmation_item_id
  LEFT JOIN products p ON p.id = pii.product_id
  LEFT JOIN uoms u ON u.id = pii.uom_id
`;

/** Quantity of an order item on ISSUED proforma invoices (other PIs only). */
const ISSUED_BY_ITEM = `
  SELECT pii.order_confirmation_item_id, SUM(pii.quantity) AS issued_quantity
  FROM proforma_invoice_items pii JOIN proforma_invoices pi ON pi.id = pii.proforma_invoice_id
  WHERE pi.status = 'issued' AND pi.id <> ?
  GROUP BY pii.order_confirmation_item_id
`;

export const proformaInvoiceRepository = {
  findAll: async (filters = {}) => {
    let query = `${PI_SELECT} WHERE 1 = 1`;
    const params = [];
    if (['draft', 'issued', 'cancelled'].includes(filters.status)) {
      query += ' AND pi.status = ?';
      params.push(filters.status);
    }
    for (const [column, value] of [['pi.buyer_id', filters.buyer_id], ['pi.order_confirmation_id', filters.order_confirmation_id]]) {
      if (isId(value)) {
        query += ` AND ${column} = ?`;
        params.push(Number(value));
      }
    }
    if (isSet(filters.order)) {
      query += ' AND oc.oc_num LIKE ?';
      params.push(`%${filters.order}%`);
    }
    if (isSet(filters.date_from)) {
      query += ' AND pi.pi_date >= ?';
      params.push(filters.date_from);
    }
    if (isSet(filters.date_to)) {
      query += ' AND pi.pi_date <= ?';
      params.push(filters.date_to);
    }
    if (filters.search) {
      const columns = ['pi.pi_no', 'pi.reference', 'pi.confirmation_reference', 'pi.payment_reference', 'oc.oc_num', 'b.company_name'];
      query += ` AND (${columns.map((c) => `${c} LIKE ?`).join(' OR ')})`;
      params.push(...columns.map(() => `%${filters.search}%`));
    }
    const cf = companyScope.filterSql('pi.company_id', companyScope.parseFilter(filters.company_id));
    query += `${cf.sql} ORDER BY pi.id DESC`;
    params.push(...cf.params);

    const page = parseInt(filters.page, 10) > 0 ? parseInt(filters.page, 10) : 1;
    const limit = parseInt(filters.limit, 10) > 0 ? Math.min(parseInt(filters.limit, 10), 500) : 15;
    const [[{ total }]] = await pool.query(`SELECT COUNT(*) as total FROM (${query}) as sub`, params);
    const [rows] = await pool.query(`${query} LIMIT ? OFFSET ?`, [...params, limit, (page - 1) * limit]);
    return { rows, total, page, limit };
  },

  /**
   * Header + lines, and the trace behind it: the order's production
   * allocations (→ finished lot → processing → issue → source lot → GRN →
   * PO → supplier), its dispatch lines, and the invoices raised on this PI.
   */
  findById: async (id) => {
    const [rows] = await pool.query(`${PI_SELECT} WHERE pi.id = ?`, [id]);
    if (rows.length === 0) return null;
    const pi = rows[0];
    const [items] = await pool.query(`${ITEM_SELECT} WHERE pii.proforma_invoice_id = ? ORDER BY pii.sort_order, pii.id`, [id]);
    pi.items = items;
    const allocations = await orderFulfilmentRepository.findAllocations("a.order_confirmation_id = ? AND a.status = 'active'", [pi.order_confirmation_id]);
    const traces = {};
    for (const a of allocations) {
      if (!traces[a.processing_record_id]) traces[a.processing_record_id] = await findProductionSource(a.processing_record_id);
    }
    pi.trace = {
      allocations: allocations.map((a) => ({ ...a, production: traces[a.processing_record_id] })),
      dispatches: (await orderFulfilmentRepository.findDispatchLines(pi.order_confirmation_id)).filter((d) => d.status === 'posted'),
    };
    const [invoices] = await pool.query(`
      SELECT i.id, i.invoice_no, i.invoice_date, i.status, (SELECT SUM(x.amount) FROM invoice_items x WHERE x.invoice_id = i.id) AS total_amount
      FROM invoices i WHERE i.proforma_invoice_id = ? ORDER BY i.id`, [id]);
    pi.invoices = invoices;
    return pi;
  },

  /** Confirmed orders of a company with at least one line that has a quantity. */
  findEligibleOrders: async (companyId) => {
    const [rows] = await pool.query(`
      SELECT oc.id, oc.oc_num, oc.oc_date, b.company_name AS buyer_name
      FROM order_confirmations oc
      LEFT JOIN buyers b ON b.id = oc.buyer_id
      WHERE oc.deleted_at IS NULL AND oc.status = 'confirmed' AND oc.company_id = ?
        AND EXISTS (SELECT 1 FROM order_confirmation_items oci WHERE oci.order_confirmation_id = oc.id AND oci.qty > 0)
      ORDER BY oc.id DESC`, [companyId]);
    return rows;
  },

  /** An order's lines with price and what other ISSUED PIs already cover (form + validation). */
  findOrderLines: async (executor, ocId, excludePiId = 0) => {
    const [rows] = await executor.query(`
      SELECT oci.id, oci.sort_order, oci.design_no, oci.description, oci.product_id, oci.unit, oci.price, oci.qty AS ordered_quantity,
             p.name AS product_name, p.uom_id, p.company_id AS product_company_id, p.deleted_at AS product_deleted_at, u.code AS uom_code, COALESCE(u.decimal_places, 0) AS uom_decimal_places,
             COALESCE(iss.issued_quantity, 0) AS proforma_quantity
      FROM order_confirmation_items oci
      LEFT JOIN products p ON p.id = oci.product_id
      LEFT JOIN uoms u ON u.id = p.uom_id
      LEFT JOIN (${ISSUED_BY_ITEM}) iss ON iss.order_confirmation_item_id = oci.id
      WHERE oci.order_confirmation_id = ?
      ORDER BY oci.sort_order, oci.id`, [excludePiId, ocId]);
    return rows;
  },

  findOrder: async (executor, id, { lock = false } = {}) => {
    const [rows] = await executor.query(`SELECT * FROM order_confirmations WHERE id = ? AND deleted_at IS NULL${lock ? ' FOR UPDATE' : ''}`, [id]);
    return rows[0] || null;
  },

  lock: async (connection, id) => {
    const [rows] = await connection.query('SELECT * FROM proforma_invoices WHERE id = ? FOR UPDATE', [id]);
    return rows[0] || null;
  },

  lockItems: async (connection, id) => {
    const [rows] = await connection.query('SELECT * FROM proforma_invoice_items WHERE proforma_invoice_id = ? ORDER BY sort_order, id FOR UPDATE', [id]);
    return rows;
  },

  countLiveInvoices: async (executor, id) => {
    const [[row]] = await executor.query("SELECT COUNT(*) AS n FROM invoices WHERE proforma_invoice_id = ? AND status <> 'cancelled'", [id]);
    return row.n;
  },

  insertHeader: async (connection, data) => {
    const [result] = await connection.query(`
      INSERT INTO proforma_invoices (company_id, pi_no, financial_year, pi_date, buyer_id, order_confirmation_id, currency_id,
        valid_until, reference, payment_terms, remarks, status, created_by, updated_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, NOW(), NOW())
    `, [data.company_id, data.pi_no, data.financial_year, data.pi_date, data.buyer_id, data.order_confirmation_id, data.currency_id,
      data.valid_until, data.reference, data.payment_terms, data.remarks, data.user_id, data.user_id]);
    return result.insertId;
  },

  updateHeader: async (connection, id, data) => {
    await connection.query(`
      UPDATE proforma_invoices SET pi_date = ?, currency_id = ?, valid_until = ?, reference = ?, payment_terms = ?, remarks = ?,
        updated_by = ?, updated_at = NOW()
      WHERE id = ?
    `, [data.pi_date, data.currency_id, data.valid_until, data.reference, data.payment_terms, data.remarks, data.user_id, id]);
  },

  replaceItems: async (connection, id, items) => {
    await connection.query('DELETE FROM proforma_invoice_items WHERE proforma_invoice_id = ?', [id]);
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      await connection.query(`
        INSERT INTO proforma_invoice_items (proforma_invoice_id, sort_order, order_confirmation_item_id, product_id, uom_id, unit,
          description, quantity, unit_price, remarks)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [id, i + 1, it.order_confirmation_item_id, it.product_id, it.uom_id, it.unit, it.description, it.quantity, it.unit_price, it.remarks]);
    }
  },

  setIssued: async (connection, id, userId) => {
    await connection.query(
      "UPDATE proforma_invoices SET status = 'issued', issued_at = NOW(), issued_by = ?, updated_by = ?, updated_at = NOW() WHERE id = ?",
      [userId, userId, id]
    );
  },

  setCancelled: async (connection, id, reason, userId) => {
    await connection.query(
      "UPDATE proforma_invoices SET status = 'cancelled', cancelled_at = NOW(), cancelled_by = ?, cancellation_reason = ?, updated_by = ?, updated_at = NOW() WHERE id = ?",
      [userId, reason, userId, id]
    );
  },

  setCommercialReference: async (connection, id, data, userId) => {
    await connection.query(`
      UPDATE proforma_invoices SET confirmation_reference = ?, confirmation_date = ?, payment_reference = ?, payment_date = ?,
        commercial_remarks = ?, commercial_updated_at = NOW(), commercial_updated_by = ?, updated_by = ?, updated_at = NOW()
      WHERE id = ?
    `, [data.confirmation_reference, data.confirmation_date, data.payment_reference, data.payment_date, data.commercial_remarks, userId, userId, id]);
  },
};
