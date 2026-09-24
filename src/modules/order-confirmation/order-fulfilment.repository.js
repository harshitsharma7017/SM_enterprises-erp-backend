import { pool } from '../../config/database.js';
import { STOCK_BY_LOT } from '../inventory/stock-ledger.js';

/**
 * Order fulfilment figures, all derived from records:
 *   ordered    = order_confirmation_items.qty (the existing order quantity)
 *   produced   = active production allocations (finished lots → the item)
 *   dispatched = POSTED dispatch lines of the item (stock or direct supplier dispatch)
 */
export const ACTIVE_ALLOCATED_BY_ITEM = `
  SELECT order_confirmation_item_id, SUM(quantity) AS allocated
  FROM order_item_production_allocations WHERE status = 'active'
  GROUP BY order_confirmation_item_id
`;

export const DISPATCHED_BY_ITEM = `
  SELECT di.order_confirmation_item_id, SUM(di.quantity) AS dispatched
  FROM dispatch_items di JOIN dispatches d ON d.id = di.dispatch_id
  WHERE d.status = 'posted' AND di.order_confirmation_item_id IS NOT NULL
  GROUP BY di.order_confirmation_item_id
`;

const ACTIVE_ALLOCATED_BY_LOT = `
  SELECT lot_id, SUM(quantity) AS allocated
  FROM order_item_production_allocations WHERE status = 'active'
  GROUP BY lot_id
`;

/** Finished-material (production) lots with their produced, allocated and current stock quantities. */
const FINISHED_LOT_SELECT = `
  SELECT l.id AS lot_id, l.lot_no, l.company_id, l.product_id, l.uom_id, l.unit, l.received_date,
         l.quantity AS produced_quantity, l.processing_record_id, pr.processing_no,
         COALESCE(al.allocated, 0) AS allocated_quantity,
         l.quantity - COALESCE(al.allocated, 0) AS allocatable_quantity,
         COALESCE(st.stock_quantity, 0) AS stock_quantity,
         COALESCE(u.decimal_places, 0) AS uom_decimal_places
  FROM lots l
  JOIN processing_records pr ON pr.id = l.processing_record_id
  LEFT JOIN uoms u ON u.id = l.uom_id
  LEFT JOIN (${ACTIVE_ALLOCATED_BY_LOT}) al ON al.lot_id = l.id
  LEFT JOIN (${STOCK_BY_LOT}) st ON st.lot_id = l.id
  WHERE l.source_type = 'production' AND l.status = 'received'
`;

const ALLOCATION_SELECT = `
  SELECT a.*, l.lot_no, l.quantity AS lot_produced_quantity, pr.processing_no, pr.material_issue_id,
         mi.issue_no, oc.oc_num, oc.buyer_id, b.company_name AS buyer_name,
         oci.design_no, oci.description AS item_description, oci.qty AS item_ordered_quantity,
         p.name AS product_name, COALESCE(u.decimal_places, 0) AS uom_decimal_places,
         COALESCE(st.stock_quantity, 0) AS lot_stock_quantity,
         uc.name AS creator_name, ux.name AS canceller_name
  FROM order_item_production_allocations a
  JOIN lots l ON l.id = a.lot_id
  JOIN processing_records pr ON pr.id = a.processing_record_id
  JOIN material_issues mi ON mi.id = pr.material_issue_id
  JOIN order_confirmations oc ON oc.id = a.order_confirmation_id
  JOIN order_confirmation_items oci ON oci.id = a.order_confirmation_item_id
  LEFT JOIN buyers b ON b.id = oc.buyer_id
  LEFT JOIN products p ON p.id = a.product_id
  LEFT JOIN uoms u ON u.id = a.uom_id
  LEFT JOIN (${STOCK_BY_LOT}) st ON st.lot_id = a.lot_id
  LEFT JOIN users uc ON uc.id = a.created_by
  LEFT JOIN users ux ON ux.id = a.cancelled_by
`;

export const orderFulfilmentRepository = {
  findItems: async (ocId) => {
    const [rows] = await pool.query(`
      SELECT oci.id, oci.sort_order, oci.design_no, oci.description, oci.product_id, oci.unit, oci.qty AS ordered_quantity,
             p.name AS product_name, p.item_group_code, pu.code AS product_uom_code,
             COALESCE(pu.decimal_places, 0) AS product_uom_decimal_places,
             COALESCE(al.allocated, 0) AS produced_quantity
      FROM order_confirmation_items oci
      LEFT JOIN products p ON p.id = oci.product_id
      LEFT JOIN uoms pu ON pu.id = p.uom_id
      LEFT JOIN (${ACTIVE_ALLOCATED_BY_ITEM}) al ON al.order_confirmation_item_id = oci.id
      WHERE oci.order_confirmation_id = ?
      ORDER BY oci.sort_order, oci.id
    `, [ocId]);
    return rows;
  },

  /**
   * Dispatched quantity per order item: POSTED dispatch lines (finished stock,
   * or direct supplier dispatch of a PO line raised from the item). Export
   * documents are deliberately not counted.
   */
  dispatchedByItem: async (itemIds) => {
    if (itemIds.length === 0) return {};
    const [rows] = await pool.query(`
      SELECT di.order_confirmation_item_id, SUM(di.quantity) AS dispatched
      FROM dispatch_items di JOIN dispatches d ON d.id = di.dispatch_id
      WHERE d.status = 'posted' AND di.order_confirmation_item_id IN (?)
      GROUP BY di.order_confirmation_item_id
    `, [itemIds]);
    return Object.fromEntries(rows.map((r) => [r.order_confirmation_item_id, r.dispatched]));
  },

  /** Every dispatch line of an order (draft, posted and cancelled) with lot, location and destination. */
  findDispatchLines: async (ocId) => {
    const [rows] = await pool.query(`
      SELECT di.id, di.dispatch_id, di.order_confirmation_item_id, di.lot_id, di.purchase_order_item_id, di.quantity, di.unit,
             d.dispatch_no, d.dispatch_date, d.dispatch_type, d.status, d.destination_name, b.company_name AS buyer_name,
             l.lot_no, loc.code AS location_code, po.po_num, sm.id AS stock_movement_id, sm.movement_no AS stock_movement_no,
             COALESCE(u.decimal_places, 0) AS uom_decimal_places
      FROM dispatch_items di
      JOIN dispatches d ON d.id = di.dispatch_id
      JOIN order_confirmation_items oci ON oci.id = di.order_confirmation_item_id
      LEFT JOIN buyers b ON b.id = d.buyer_id
      LEFT JOIN lots l ON l.id = di.lot_id
      LEFT JOIN stock_locations loc ON loc.id = d.location_id
      LEFT JOIN purchase_orders po ON po.id = d.purchase_order_id
      LEFT JOIN uoms u ON u.id = di.uom_id
      LEFT JOIN stock_movements sm ON sm.dispatch_item_id = di.id AND sm.movement_type = 'DISPATCH'
      WHERE oci.order_confirmation_id = ?
      ORDER BY d.id, di.id
    `, [ocId]);
    return rows;
  },

  /** Posted dispatched quantity of one lot for one order item (allocation → dispatch cap). */
  dispatchedOnAllocation: async (executor, itemId, lotId) => {
    const [[row]] = await executor.query(`
      SELECT COALESCE(SUM(di.quantity), 0) AS dispatched FROM dispatch_items di JOIN dispatches d ON d.id = di.dispatch_id
      WHERE d.status = 'posted' AND di.order_confirmation_item_id = ? AND di.lot_id = ?`, [itemId, lotId]);
    return row.dispatched;
  },

  findAllocations: async (where, params) => {
    const [rows] = await pool.query(`${ALLOCATION_SELECT} WHERE ${where} ORDER BY a.id`, params);
    return rows;
  },

  /** Finished lots of a company/product: current stock, produced, already allocated, still allocatable. */
  findFinishedLots: async (companyId, productIds) => {
    if (productIds.length === 0) return [];
    const [rows] = await pool.query(`${FINISHED_LOT_SELECT} AND l.company_id = ? AND l.product_id IN (?) ORDER BY l.id`, [companyId, productIds]);
    return rows;
  },

  /** Per order: lines, lines with production allocated, lines fully produced (for the list). */
  findSummaries: async (ocIds) => {
    if (ocIds.length === 0) return [];
    const [rows] = await pool.query(`
      SELECT oci.order_confirmation_id,
             COUNT(*) AS items_count,
             SUM(CASE WHEN COALESCE(al.allocated, 0) > 0 THEN 1 ELSE 0 END) AS allocated_items_count,
             SUM(CASE WHEN oci.qty > 0 AND COALESCE(al.allocated, 0) >= oci.qty THEN 1 ELSE 0 END) AS produced_items_count,
             SUM(CASE WHEN oci.product_id IS NOT NULL AND oci.qty > 0 THEN 1 ELSE 0 END) AS trackable_items_count,
             SUM(CASE WHEN oci.product_id IS NOT NULL AND oci.qty > 0 AND COALESCE(dp.dispatched, 0) >= oci.qty THEN 1 ELSE 0 END) AS fulfilled_items_count,
             SUM(CASE WHEN COALESCE(dp.dispatched, 0) > 0 THEN 1 ELSE 0 END) AS dispatched_items_count
      FROM order_confirmation_items oci
      LEFT JOIN (${ACTIVE_ALLOCATED_BY_ITEM}) al ON al.order_confirmation_item_id = oci.id
      LEFT JOIN (${DISPATCHED_BY_ITEM}) dp ON dp.order_confirmation_item_id = oci.id
      WHERE oci.order_confirmation_id IN (?)
      GROUP BY oci.order_confirmation_id
    `, [ocIds]);
    return rows;
  },

  lockOrder: async (connection, id) => {
    const [rows] = await connection.query('SELECT * FROM order_confirmations WHERE id = ? AND deleted_at IS NULL FOR UPDATE', [id]);
    return rows[0] || null;
  },

  lockLot: async (connection, lotId) => {
    const [rows] = await connection.query(`
      SELECT l.*, COALESCE(u.decimal_places, 0) AS uom_decimal_places
      FROM lots l LEFT JOIN uoms u ON u.id = l.uom_id
      WHERE l.id = ? FOR UPDATE OF l`, [lotId]);
    return rows[0] || null;
  },

  findItem: async (executor, ocId, itemId) => {
    const [rows] = await executor.query('SELECT * FROM order_confirmation_items WHERE id = ? AND order_confirmation_id = ?', [itemId, ocId]);
    return rows[0] || null;
  },

  allocatedOnLot: async (executor, lotId) => {
    const [[row]] = await executor.query(
      "SELECT COALESCE(SUM(quantity), 0) AS allocated FROM order_item_production_allocations WHERE lot_id = ? AND status = 'active'",
      [lotId]
    );
    return row.allocated;
  },

  findActiveAllocation: async (executor, itemId, lotId) => {
    const [rows] = await executor.query(
      "SELECT id FROM order_item_production_allocations WHERE order_confirmation_item_id = ? AND lot_id = ? AND status = 'active'",
      [itemId, lotId]
    );
    return rows[0] || null;
  },

  insert: async (connection, data) => {
    const [result] = await connection.query(`
      INSERT INTO order_item_production_allocations (company_id, order_confirmation_id, order_confirmation_item_id,
        processing_record_id, lot_id, product_id, uom_id, unit, quantity, status, remarks, created_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, NOW())
    `, [data.company_id, data.order_confirmation_id, data.order_confirmation_item_id, data.processing_record_id, data.lot_id,
      data.product_id, data.uom_id, data.unit, data.quantity, data.remarks, data.created_by]);
    return result.insertId;
  },

  lockAllocation: async (connection, id) => {
    const [rows] = await connection.query('SELECT * FROM order_item_production_allocations WHERE id = ? FOR UPDATE', [id]);
    return rows[0] || null;
  },

  setCancelled: async (connection, id, reason, userId) => {
    await connection.query(
      "UPDATE order_item_production_allocations SET status = 'cancelled', cancelled_at = NOW(), cancelled_by = ?, cancellation_reason = ? WHERE id = ?",
      [userId, reason, id]
    );
  },
};
