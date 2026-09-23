import { pool } from '../../config/database.js';

/**
 * Data access for garment (planning-origin) purchase orders.
 *
 * Ordered-quantity rule (used everywhere in procurement):
 *   ordered  = ordered_quantity on lines of POs in raised / partial / received
 *   reserved = ordered_quantity on lines of DRAFT POs (held so it cannot be
 *              ordered twice, but not counted as ordered)
 *   cancelled and soft-deleted POs count for nothing.
 */
const aggregateBy = (column) => `
  SELECT poi.${column} AS source_id,
         SUM(CASE WHEN po.status IN ('raised', 'partial', 'received') THEN poi.ordered_quantity ELSE 0 END) AS ordered_qty,
         SUM(CASE WHEN po.status = 'draft' THEN poi.ordered_quantity ELSE 0 END) AS reserved_qty
  FROM purchase_order_items poi
  JOIN purchase_orders po ON po.id = poi.purchase_order_id AND po.deleted_at IS NULL
  WHERE poi.${column} IS NOT NULL
  GROUP BY poi.${column}
`;

export const REQUIREMENT_ORDER_AGGREGATE = aggregateBy('material_requirement_id');
export const PLAN_ITEM_ORDER_AGGREGATE = aggregateBy('material_plan_item_id');

/** A requirement with everything procurement validates and displays. */
const REQUIREMENT_SELECT = `
  SELECT mr.id, mr.company_id, mr.requirement_no, mr.status, mr.brand_projection_id,
         bp.projection_no, br.name AS brand_name,
         bpi.quantity AS required_quantity, bpi.uom_id AS line_uom_id,
         p.id AS product_id, p.name AS product_name, p.item_group_code, p.company_id AS product_company_id,
         p.status AS product_status, p.deleted_at AS product_deleted_at, p.uom_id AS product_uom_id,
         u.code AS uom_code, u.decimal_places AS uom_decimal_places,
         COALESCE(ro.ordered_qty, 0) AS ordered_quantity,
         COALESCE(ro.reserved_qty, 0) AS reserved_quantity,
         bpi.quantity - COALESCE(ro.ordered_qty, 0) - COALESCE(ro.reserved_qty, 0) AS remaining_quantity
  FROM material_requirements mr
  JOIN brand_projections bp ON bp.id = mr.brand_projection_id
  JOIN brand_projection_items bpi ON bpi.id = mr.brand_projection_item_id
  LEFT JOIN brands br ON br.id = bp.brand_id
  LEFT JOIN products p ON p.id = bpi.product_id
  LEFT JOIN uoms u ON u.id = bpi.uom_id
  LEFT JOIN (${REQUIREMENT_ORDER_AGGREGATE}) ro ON ro.source_id = mr.id
`;

export const garmentPoRepository = {
  findSupplier: async (executor, id) => {
    const [rows] = await executor.query(
      'SELECT id, company_id, company_name, party_type, status FROM suppliers WHERE id = ? AND deleted_at IS NULL',
      [id]
    );
    return rows[0] || null;
  },

  /** Active suppliers usable by a company: its own plus shared ones. */
  getSuppliersForCompany: async (companyId, includeId = null) => {
    const params = [companyId];
    let query = `
      SELECT id, company_id, company_name, display_code, status
      FROM suppliers
      WHERE deleted_at IS NULL AND party_type IN ('supplier', 'both')
        AND (company_id = ? OR company_id IS NULL)
        AND (status = 'active'`;
    if (includeId) {
      query += ' OR id = ?';
      params.push(includeId);
    }
    query += ') ORDER BY company_name ASC';
    const [rows] = await pool.query(query, params);
    return rows;
  },

  findPlan: async (executor, id) => {
    const [rows] = await executor.query(
      'SELECT id, company_id, plan_no, title, status FROM material_plans WHERE id = ? AND deleted_at IS NULL',
      [id]
    );
    return rows[0] || null;
  },

  lockRequirements: async (connection, ids) => {
    if (ids.length === 0) return;
    await connection.query('SELECT id FROM material_requirements WHERE id IN (?) FOR UPDATE', [ids]);
  },

  findRequirements: async (executor, ids) => {
    if (ids.length === 0) return [];
    const [rows] = await executor.query(`${REQUIREMENT_SELECT} WHERE mr.id IN (?)`, [ids]);
    return rows;
  },

  /** Plan items with their own procurement figures (planned − ordered − reserved). */
  findPlanItems: async (executor, ids) => {
    if (ids.length === 0) return [];
    const [rows] = await executor.query(`
      SELECT mpi.id, mpi.material_plan_id, mpi.material_requirement_id, mpi.planned_quantity,
             COALESCE(pio.ordered_qty, 0) AS ordered_quantity,
             COALESCE(pio.reserved_qty, 0) AS reserved_quantity,
             mpi.planned_quantity - COALESCE(pio.ordered_qty, 0) - COALESCE(pio.reserved_qty, 0) AS remaining_quantity
      FROM material_plan_items mpi
      LEFT JOIN (${PLAN_ITEM_ORDER_AGGREGATE}) pio ON pio.source_id = mpi.id
      WHERE mpi.id IN (?)
    `, [ids]);
    return rows;
  },

  /** Requirements of a company still open for procurement (not closed). */
  getRequirementsForCompany: async (companyId) => {
    const [rows] = await pool.query(
      `${REQUIREMENT_SELECT} WHERE mr.company_id = ? AND mr.status <> 'closed' ORDER BY mr.id DESC`,
      [companyId]
    );
    return rows;
  },

  /** Planned (committed) material plans of a company — the only ones procurement may draw on. */
  getPlansForCompany: async (companyId) => {
    const [rows] = await pool.query(`
      SELECT mp.id, mp.plan_no, mp.title, mp.period_start, mp.period_end, mp.status,
             (SELECT COUNT(*) FROM material_plan_items mpi WHERE mpi.material_plan_id = mp.id) AS items_count
      FROM material_plans mp
      WHERE mp.company_id = ? AND mp.status = 'planned' AND mp.deleted_at IS NULL
      ORDER BY mp.id DESC
    `, [companyId]);
    return rows;
  },

  getPlanItemIds: async (planId) => {
    const [rows] = await pool.query('SELECT id FROM material_plan_items WHERE material_plan_id = ? ORDER BY sort_order ASC, id ASC', [planId]);
    return rows.map((r) => r.id);
  },

  /** This PO's own garment lines, keyed for "exclude my own quantity" checks. */
  findOwnLines: async (executor, poId) => {
    const [rows] = await executor.query(`
      SELECT id, material_requirement_id, material_plan_item_id, ordered_quantity, cost_price, remarks
      FROM purchase_order_items WHERE purchase_order_id = ? ORDER BY sort_order ASC, id ASC
    `, [poId]);
    return rows;
  },

  insertLines: async (connection, poId, lines) => {
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      await connection.query(`
        INSERT INTO purchase_order_items (
          purchase_order_id, material_requirement_id, material_plan_item_id, sort_order,
          product_id, unit, cost_price, qty, ordered_quantity, amount, remarks
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)
      `, [poId, l.material_requirement_id, l.material_plan_item_id, i, l.product_id, l.unit,
        l.cost_price, l.ordered_quantity, l.amount, l.remarks]);
    }
  },

  updateLine: async (connection, lineId, l) => {
    await connection.query(`
      UPDATE purchase_order_items SET ordered_quantity = ?, cost_price = ?, amount = ?, remarks = ?
      WHERE id = ?
    `, [l.ordered_quantity, l.cost_price, l.amount, l.remarks, lineId]);
  },

  deleteLines: async (connection, poId) => {
    await connection.query('DELETE FROM purchase_order_items WHERE purchase_order_id = ?', [poId]);
  },

  insertHeader: async (connection, data) => {
    const [result] = await connection.query(`
      INSERT INTO purchase_orders (
        company_id, origin, po_num, financial_year, order_confirmation_id, material_plan_id, supplier_id,
        po_date, dispatch_date, delivery_details, packing_details, remarks, status,
        created_by, updated_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, NOW(), NOW())
    `, [data.company_id, data.origin, data.po_num, data.financial_year, data.material_plan_id, data.supplier_id,
      data.po_date, data.dispatch_date, data.delivery_details, data.packing_details, data.remarks,
      data.created_by, data.updated_by]);
    return result.insertId;
  },

  updateHeader: async (connection, id, data) => {
    await connection.query(`
      UPDATE purchase_orders SET supplier_id = ?, po_date = ?, dispatch_date = ?, delivery_details = ?,
        packing_details = ?, remarks = ?, updated_by = ?, updated_at = NOW()
      WHERE id = ?
    `, [data.supplier_id, data.po_date, data.dispatch_date, data.delivery_details, data.packing_details,
      data.remarks, data.updated_by, id]);
  },

  lockPo: async (connection, id) => {
    const [rows] = await connection.query(
      'SELECT * FROM purchase_orders WHERE id = ? AND deleted_at IS NULL FOR UPDATE',
      [id]
    );
    return rows[0] || null;
  },

  setConfirmed: async (connection, id, userId) => {
    await connection.query(`
      UPDATE purchase_orders SET status = 'raised', confirmed_at = NOW(), confirmed_by = ?, updated_by = ?, updated_at = NOW()
      WHERE id = ?
    `, [userId, userId, id]);
  },

  setCancelled: async (connection, id, userId) => {
    await connection.query(`
      UPDATE purchase_orders SET status = 'cancelled', cancelled_at = NOW(), cancelled_by = ?, updated_by = ?, updated_at = NOW()
      WHERE id = ?
    `, [userId, userId, id]);
  },

  countInwardEntries: async (connection, poId) => {
    const [rows] = await connection.query(
      "SELECT COUNT(*) AS cnt FROM inward_entries WHERE purchase_order_id = ? AND deleted_at IS NULL AND receipt_status <> 'cancelled'",
      [poId]
    );
    return rows[0].cnt;
  },
};
