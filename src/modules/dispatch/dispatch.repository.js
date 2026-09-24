import { pool } from '../../config/database.js';
import { companyScope } from '../../services/company-scope.service.js';
import { findProductionSource } from '../lot/lot.repository.js';
import { inwardEntryRepository } from '../inward-entry/inward-entry.repository.js';
import { SIGNED_QUANTITY } from '../inventory/stock-ledger.js';

const isSet = (v) => v !== undefined && v !== null && v !== '';
const isId = (v) => isSet(v) && Number.isInteger(Number(v)) && Number(v) > 0;

const DISPATCH_SELECT = `
  SELECT d.*, cmp.code AS company_code, COALESCE(cmp.short_name, cmp.name) AS company_label,
         b.company_name AS buyer_name, oc.oc_num, po.po_num, po.origin AS purchase_order_origin,
         s.company_name AS supplier_name, loc.code AS location_code, loc.name AS location_name,
         u1.name AS creator_name, u2.name AS poster_name, u3.name AS canceller_name,
         (SELECT COUNT(*) FROM dispatch_items x WHERE x.dispatch_id = d.id) AS lines_count
  FROM dispatches d
  LEFT JOIN companies cmp ON cmp.id = d.company_id
  LEFT JOIN buyers b ON b.id = d.buyer_id
  LEFT JOIN order_confirmations oc ON oc.id = d.order_confirmation_id
  LEFT JOIN purchase_orders po ON po.id = d.purchase_order_id
  LEFT JOIN suppliers s ON s.id = d.supplier_id
  LEFT JOIN stock_locations loc ON loc.id = d.location_id
  LEFT JOIN users u1 ON u1.id = d.created_by
  LEFT JOIN users u2 ON u2.id = d.posted_by
  LEFT JOIN users u3 ON u3.id = d.cancelled_by
`;

const ITEM_SELECT = `
  SELECT di.*, p.name AS product_name, p.item_group_code, COALESCE(u.decimal_places, 0) AS uom_decimal_places,
         l.lot_no, l.source_type AS lot_source_type, l.processing_record_id,
         oci.design_no, oci.description AS item_description, oci.qty AS item_ordered_quantity,
         ocx.id AS order_confirmation_id, ocx.oc_num,
         poi.purchase_order_id, COALESCE(poi.ordered_quantity, poi.qty) AS po_ordered_quantity,
         sm.id AS stock_movement_id, sm.movement_no AS stock_movement_no
  FROM dispatch_items di
  JOIN products p ON p.id = di.product_id
  LEFT JOIN uoms u ON u.id = di.uom_id
  LEFT JOIN lots l ON l.id = di.lot_id
  LEFT JOIN order_confirmation_items oci ON oci.id = di.order_confirmation_item_id
  LEFT JOIN order_confirmations ocx ON ocx.id = oci.order_confirmation_id
  LEFT JOIN purchase_order_items poi ON poi.id = di.purchase_order_item_id
  LEFT JOIN stock_movements sm ON sm.dispatch_item_id = di.id AND sm.movement_type = 'DISPATCH'
`;

/** Active allocations of an order's items, with what is already dispatched and the lot's stock at a location. */
const DISPATCHABLE_SELECT = `
  SELECT a.id AS allocation_id, a.order_confirmation_item_id, a.lot_id, a.quantity AS allocated_quantity,
         l.lot_no, l.product_id, l.uom_id, l.unit, p.name AS product_name, COALESCE(u.decimal_places, 0) AS uom_decimal_places,
         oci.design_no, oci.description AS item_description, oci.qty AS item_ordered_quantity,
         pr.processing_no,
         COALESCE((SELECT SUM(di.quantity) FROM dispatch_items di JOIN dispatches d ON d.id = di.dispatch_id
                   WHERE d.status = 'posted' AND di.order_confirmation_item_id = a.order_confirmation_item_id AND di.lot_id = a.lot_id), 0) AS dispatched_quantity,
         COALESCE((SELECT SUM(${SIGNED_QUANTITY}) FROM stock_movements sm WHERE sm.lot_id = a.lot_id AND sm.location_id = ?), 0) AS stock_at_location
  FROM order_item_production_allocations a
  JOIN lots l ON l.id = a.lot_id
  JOIN processing_records pr ON pr.id = a.processing_record_id
  JOIN order_confirmation_items oci ON oci.id = a.order_confirmation_item_id
  JOIN products p ON p.id = l.product_id
  LEFT JOIN uoms u ON u.id = l.uom_id
  WHERE a.status = 'active' AND a.order_confirmation_id = ?
  ORDER BY a.id
`;

export const dispatchRepository = {
  findAll: async (filters = {}) => {
    let query = `${DISPATCH_SELECT} WHERE 1 = 1`;
    const params = [];
    if (['draft', 'posted', 'cancelled'].includes(filters.status)) {
      query += ' AND d.status = ?';
      params.push(filters.status);
    }
    if (['STOCK_DISPATCH', 'DIRECT_SUPPLIER_DISPATCH'].includes(filters.dispatch_type)) {
      query += ' AND d.dispatch_type = ?';
      params.push(filters.dispatch_type);
    }
    for (const [column, value] of [
      ['d.buyer_id', filters.buyer_id], ['d.order_confirmation_id', filters.order_confirmation_id],
      ['d.purchase_order_id', filters.purchase_order_id], ['d.supplier_id', filters.supplier_id],
    ]) {
      if (isId(value)) {
        query += ` AND ${column} = ?`;
        params.push(Number(value));
      }
    }
    for (const [column, value] of [['oc.oc_num', filters.order], ['po.po_num', filters.po]]) {
      if (isSet(value)) {
        query += ` AND ${column} LIKE ?`;
        params.push(`%${value}%`);
      }
    }
    if (isSet(filters.date_from)) {
      query += ' AND d.dispatch_date >= ?';
      params.push(filters.date_from);
    }
    if (isSet(filters.date_to)) {
      query += ' AND d.dispatch_date <= ?';
      params.push(filters.date_to);
    }
    if (filters.search) {
      const columns = ['d.dispatch_no', 'd.destination_name', 'd.document_reference', 'd.invoice_reference', 'oc.oc_num', 'po.po_num', 'b.company_name', 's.company_name'];
      query += ` AND (${columns.map((c) => `${c} LIKE ?`).join(' OR ')})`;
      params.push(...columns.map(() => `%${filters.search}%`));
    }
    const cf = companyScope.filterSql('d.company_id', companyScope.parseFilter(filters.company_id));
    query += `${cf.sql} ORDER BY d.id DESC`;
    params.push(...cf.params);

    const page = parseInt(filters.page, 10) > 0 ? parseInt(filters.page, 10) : 1;
    const limit = parseInt(filters.limit, 10) > 0 ? Math.min(parseInt(filters.limit, 10), 500) : 15;
    const [[{ total }]] = await pool.query(`SELECT COUNT(*) as total FROM (${query}) as sub`, params);
    const [rows] = await pool.query(`${query} LIMIT ? OFFSET ?`, [...params, limit, (page - 1) * limit]);
    return { rows, total, page, limit };
  },

  /**
   * Header + lines with their trace: a finished lot's production source
   * (processing → issue → source lots → GRN → PO), or a direct line's PO
   * source (OC, or plan / requirements / projections).
   */
  findById: async (id) => {
    const [rows] = await pool.query(`${DISPATCH_SELECT} WHERE d.id = ?`, [id]);
    if (rows.length === 0) return null;
    const dispatch = rows[0];
    const [items] = await pool.query(`${ITEM_SELECT} WHERE di.dispatch_id = ? ORDER BY di.sort_order, di.id`, [id]);
    const productionTraces = {};
    for (const item of items) {
      if (item.processing_record_id && !productionTraces[item.processing_record_id]) {
        productionTraces[item.processing_record_id] = await findProductionSource(item.processing_record_id);
      }
    }
    dispatch.items = items.map((i) => ({ ...i, production: i.processing_record_id ? productionTraces[i.processing_record_id] : null }));
    dispatch.po_trace = dispatch.purchase_order_id ? await inwardEntryRepository.getPoTrace(dispatch.purchase_order_id) : null;
    return dispatch;
  },

  /** Stock-dispatch form: what each active allocation of the order can still dispatch from a location. */
  findDispatchable: async (ocId, locationId) => {
    const [rows] = await pool.query(DISPATCHABLE_SELECT, [locationId || 0, ocId]);
    return rows;
  },

  /** Confirmed orders of a company with finished production allocated but not fully dispatched. */
  findDispatchableOrders: async (companyId) => {
    const [rows] = await pool.query(`
      SELECT oc.id, oc.oc_num, oc.oc_date, b.company_name AS buyer_name
      FROM order_confirmations oc
      LEFT JOIN buyers b ON b.id = oc.buyer_id
      WHERE oc.deleted_at IS NULL AND oc.status = 'confirmed' AND oc.company_id = ?
        AND EXISTS (
          SELECT 1 FROM order_item_production_allocations a
          WHERE a.order_confirmation_id = oc.id AND a.status = 'active'
            AND a.quantity > COALESCE((SELECT SUM(di.quantity) FROM dispatch_items di JOIN dispatches d ON d.id = di.dispatch_id
                                       WHERE d.status = 'posted' AND di.order_confirmation_item_id = a.order_confirmation_item_id AND di.lot_id = a.lot_id), 0))
      ORDER BY oc.id DESC`, [companyId]);
    return rows;
  },

  /** Confirmed POs of a company with quantity neither received nor direct-dispatched yet. */
  findDirectDispatchPos: async (companyId) => (await inwardEntryRepository.findEligiblePos(companyId)),

  /** Buyers usable by a company (its own or shared), for a direct dispatch's destination. */
  findBuyers: async (companyId) => {
    const [rows] = await pool.query(
      'SELECT id, company_name, company_id FROM buyers WHERE deleted_at IS NULL AND (company_id = ? OR company_id IS NULL) ORDER BY company_name',
      [companyId]
    );
    return rows;
  },

  findOrder: async (executor, id, { lock = false } = {}) => {
    const [rows] = await executor.query(`SELECT * FROM order_confirmations WHERE id = ? AND deleted_at IS NULL${lock ? ' FOR UPDATE' : ''}`, [id]);
    return rows[0] || null;
  },

  findOrderItem: async (executor, ocId, itemId) => {
    const [rows] = await executor.query('SELECT * FROM order_confirmation_items WHERE id = ? AND order_confirmation_id = ?', [itemId, ocId]);
    return rows[0] || null;
  },

  findActiveAllocation: async (executor, itemId, lotId) => {
    const [rows] = await executor.query(
      "SELECT * FROM order_item_production_allocations WHERE order_confirmation_item_id = ? AND lot_id = ? AND status = 'active'",
      [itemId, lotId]
    );
    return rows[0] || null;
  },

  /** Posted dispatched quantity of an order item from one lot (other dispatches only). */
  dispatchedOnAllocation: async (executor, itemId, lotId, excludeDispatchId = 0) => {
    const [[row]] = await executor.query(`
      SELECT COALESCE(SUM(di.quantity), 0) AS dispatched FROM dispatch_items di JOIN dispatches d ON d.id = di.dispatch_id
      WHERE d.status = 'posted' AND di.order_confirmation_item_id = ? AND di.lot_id = ? AND d.id <> ?`, [itemId, lotId, excludeDispatchId]);
    return row.dispatched;
  },

  findBuyer: async (executor, id) => {
    const [rows] = await executor.query('SELECT id, company_name, company_id, deleted_at FROM buyers WHERE id = ?', [id]);
    return rows[0] || null;
  },

  findSupplier: async (executor, id) => {
    const [rows] = await executor.query('SELECT id, company_name, company_id, status, deleted_at FROM suppliers WHERE id = ?', [id]);
    return rows[0] || null;
  },

  lock: async (connection, id) => {
    const [rows] = await connection.query('SELECT * FROM dispatches WHERE id = ? FOR UPDATE', [id]);
    return rows[0] || null;
  },

  lockItems: async (connection, id) => {
    const [rows] = await connection.query('SELECT * FROM dispatch_items WHERE dispatch_id = ? ORDER BY sort_order, id FOR UPDATE', [id]);
    return rows;
  },

  insertHeader: async (connection, data) => {
    const [result] = await connection.query(`
      INSERT INTO dispatches (company_id, dispatch_no, financial_year, dispatch_date, dispatch_type, buyer_id, order_confirmation_id,
        purchase_order_id, supplier_id, location_id, destination_name, destination_address, transporter, vehicle_no,
        document_reference, invoice_reference, remarks, status, created_by, updated_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, NOW(), NOW())
    `, [data.company_id, data.dispatch_no, data.financial_year, data.dispatch_date, data.dispatch_type, data.buyer_id,
      data.order_confirmation_id, data.purchase_order_id, data.supplier_id, data.location_id, data.destination_name,
      data.destination_address, data.transporter, data.vehicle_no, data.document_reference, data.invoice_reference,
      data.remarks, data.user_id, data.user_id]);
    return result.insertId;
  },

  updateHeader: async (connection, id, data) => {
    await connection.query(`
      UPDATE dispatches SET dispatch_date = ?, buyer_id = ?, location_id = ?, destination_name = ?, destination_address = ?,
        transporter = ?, vehicle_no = ?, document_reference = ?, invoice_reference = ?, remarks = ?, updated_by = ?, updated_at = NOW()
      WHERE id = ?
    `, [data.dispatch_date, data.buyer_id, data.location_id, data.destination_name, data.destination_address, data.transporter,
      data.vehicle_no, data.document_reference, data.invoice_reference, data.remarks, data.user_id, id]);
  },

  /** Draft lines only (posted lines are referenced by stock movements and are immutable). */
  replaceItems: async (connection, id, items) => {
    await connection.query('DELETE FROM dispatch_items WHERE dispatch_id = ?', [id]);
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      await connection.query(`
        INSERT INTO dispatch_items (dispatch_id, sort_order, order_confirmation_item_id, lot_id, purchase_order_item_id,
          product_id, uom_id, unit, quantity, remarks)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [id, i + 1, it.order_confirmation_item_id, it.lot_id, it.purchase_order_item_id, it.product_id, it.uom_id, it.unit, it.quantity, it.remarks]);
    }
  },

  setPosted: async (connection, id, userId) => {
    await connection.query(
      "UPDATE dispatches SET status = 'posted', posted_at = NOW(), posted_by = ?, updated_by = ?, updated_at = NOW() WHERE id = ?",
      [userId, userId, id]
    );
  },

  setCancelled: async (connection, id, reason, userId) => {
    await connection.query(
      "UPDATE dispatches SET status = 'cancelled', cancelled_at = NOW(), cancelled_by = ?, cancellation_reason = ?, updated_by = ?, updated_at = NOW() WHERE id = ?",
      [userId, reason, userId, id]
    );
  },
};
