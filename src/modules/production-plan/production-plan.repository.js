import { pool } from '../../config/database.js';
import { companyScope } from '../../services/company-scope.service.js';
import { SIGNED_QUANTITY } from '../inventory/stock-ledger.js';

const isSet = (v) => v !== undefined && v !== null && v !== '';

/**
 * Produced per plan line = the output posted to stock (production lots) of the
 * processing records booked against it. In production = the recorded produced
 * quantity of booked records whose output is not posted yet.
 */
const LINE_PROGRESS = `
  SELECT pr.production_plan_item_id,
         COALESCE(SUM(l.quantity), 0) AS produced_quantity,
         COALESCE(SUM(CASE WHEN l.id IS NULL THEN pr.produced_quantity END), 0) AS in_process_quantity,
         COUNT(pr.id) AS processing_count
  FROM processing_records pr
  LEFT JOIN lots l ON l.processing_record_id = pr.id AND l.source_type = 'production' AND l.status = 'received'
  WHERE pr.production_plan_item_id IS NOT NULL
  GROUP BY pr.production_plan_item_id
`;

const PLAN_SELECT = `
  SELECT pp.*, cmp.code AS company_code, COALESCE(cmp.short_name, cmp.name) AS company_label,
         u1.name AS creator_name, u2.name AS planner_name, u3.name AS closer_name,
         (SELECT COUNT(*) FROM production_plan_items x WHERE x.production_plan_id = pp.id) AS lines_count,
         (SELECT COUNT(*) FROM production_plan_items x LEFT JOIN (${LINE_PROGRESS}) lp ON lp.production_plan_item_id = x.id
          WHERE x.production_plan_id = pp.id AND COALESCE(lp.produced_quantity, 0) >= x.planned_quantity) AS produced_lines_count,
         (SELECT COUNT(*) FROM processing_records pr JOIN production_plan_items x ON x.id = pr.production_plan_item_id
          WHERE x.production_plan_id = pp.id) AS processing_count
  FROM production_plans pp
  LEFT JOIN companies cmp ON cmp.id = pp.company_id
  LEFT JOIN users u1 ON u1.id = pp.created_by
  LEFT JOIN users u2 ON u2.id = pp.planned_by
  LEFT JOIN users u3 ON u3.id = pp.closed_by
`;

const ITEM_SELECT = `
  SELECT ppi.*, p.name AS product_name, p.item_group_code, COALESCE(u.code, ppi.unit) AS uom_code,
         COALESCE(u.decimal_places, 0) AS uom_decimal_places,
         oci.order_confirmation_id, oc.oc_num, oci.design_no, oci.qty AS order_item_quantity,
         COALESCE(lp.produced_quantity, 0) AS produced_quantity,
         COALESCE(lp.in_process_quantity, 0) AS in_process_quantity,
         COALESCE(lp.processing_count, 0) AS processing_count
  FROM production_plan_items ppi
  JOIN products p ON p.id = ppi.product_id
  LEFT JOIN uoms u ON u.id = ppi.uom_id
  LEFT JOIN order_confirmation_items oci ON oci.id = ppi.order_confirmation_item_id
  LEFT JOIN order_confirmations oc ON oc.id = oci.order_confirmation_id
  LEFT JOIN (${LINE_PROGRESS}) lp ON lp.production_plan_item_id = ppi.id
`;

export const productionPlanRepository = {
  findAll: async (filters = {}) => {
    let query = `${PLAN_SELECT} WHERE 1 = 1`;
    const params = [];
    if (['draft', 'planned', 'completed', 'cancelled'].includes(filters.status)) {
      query += ' AND pp.status = ?';
      params.push(filters.status);
    }
    if (isSet(filters.date_from)) {
      query += ' AND pp.plan_date >= ?';
      params.push(filters.date_from);
    }
    if (isSet(filters.date_to)) {
      query += ' AND pp.plan_date <= ?';
      params.push(filters.date_to);
    }
    if (isSet(filters.search)) {
      query += ` AND (pp.plan_no LIKE ? OR pp.title LIKE ? OR EXISTS (
        SELECT 1 FROM production_plan_items x JOIN products p ON p.id = x.product_id
        WHERE x.production_plan_id = pp.id AND (p.name LIKE ? OR p.item_group_code LIKE ?)))`;
      params.push(...Array(4).fill(`%${filters.search}%`));
    }
    const cf = companyScope.filterSql('pp.company_id', companyScope.parseFilter(filters.company_id));
    query += `${cf.sql} ORDER BY pp.id DESC`;
    params.push(...cf.params);
    const page = parseInt(filters.page, 10) > 0 ? parseInt(filters.page, 10) : 1;
    const limit = parseInt(filters.limit, 10) > 0 ? Math.min(parseInt(filters.limit, 10), 500) : 15;
    const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM (${query}) AS sub`, params);
    const [rows] = await pool.query(`${query} LIMIT ? OFFSET ?`, [...params, limit, (page - 1) * limit]);
    return { data: rows, total, page, limit };
  },

  findById: async (id) => {
    const [[plan]] = await pool.query(`${PLAN_SELECT} WHERE pp.id = ?`, [id]);
    if (!plan) return null;
    const [items] = await pool.query(`${ITEM_SELECT} WHERE ppi.production_plan_id = ? ORDER BY ppi.sort_order, ppi.id`, [id]);
    plan.items = items;
    const [processing] = await pool.query(`
      SELECT pr.id, pr.processing_no, pr.status, pr.start_date, pr.completion_date, pr.production_plan_item_id,
             pr.produced_quantity, pr.produced_unit, mi.issue_no, mi.job_reference, l.id AS output_lot_id, l.lot_no AS output_lot_no
      FROM processing_records pr
      JOIN production_plan_items x ON x.id = pr.production_plan_item_id
      LEFT JOIN material_issues mi ON mi.id = pr.material_issue_id
      LEFT JOIN lots l ON l.processing_record_id = pr.id AND l.source_type = 'production'
      WHERE x.production_plan_id = ? ORDER BY pr.id`, [id]);
    plan.processing = processing;
    return plan;
  },

  /**
   * Material each line still needs, from its product's BOM (Component · Qty /
   * piece · Unit) × the line's pending quantity. A component is matched to a
   * product of the plan's company by its exact name to show that product's
   * stock; an unmatched component shows no stock figure. No unit conversion.
   */
  materialNeeds: async (companyId, items) => {
    const productIds = [...new Set(items.map((i) => i.product_id))];
    if (productIds.length === 0) return [];
    const [bom] = await pool.query(
      'SELECT product_id, component_name, qty, unit, remarks FROM product_bom_items WHERE product_id IN (?) ORDER BY product_id, sort_order, id',
      [productIds]
    );
    const names = [...new Set(bom.map((b) => b.component_name.trim().toLowerCase()))];
    const matches = {};
    if (names.length) {
      const [rows] = await pool.query(`
        SELECT p.id, p.name, u.code AS uom_code, COALESCE(u.decimal_places, 0) AS uom_decimal_places,
               COALESCE((SELECT SUM(${SIGNED_QUANTITY}) FROM stock_movements sm WHERE sm.company_id = p.company_id AND sm.product_id = p.id), 0) AS stock_quantity
        FROM products p LEFT JOIN uoms u ON u.id = p.uom_id
        WHERE p.deleted_at IS NULL AND p.company_id = ? AND LOWER(TRIM(p.name)) IN (?)`, [companyId, names]);
      rows.forEach((r) => { matches[r.name.trim().toLowerCase()] = r; });
    }
    return items.flatMap((item) => bom.filter((b) => b.product_id === item.product_id).map((b) => {
      const pending = Math.max(Number(item.planned_quantity) - Number(item.produced_quantity), 0);
      const component = matches[b.component_name.trim().toLowerCase()] || null;
      return {
        production_plan_item_id: item.id,
        product_name: item.product_name,
        component_name: b.component_name,
        qty_per_unit: b.qty,
        unit: b.unit,
        remarks: b.remarks,
        pending_quantity: String(pending),
        required_quantity: String(Math.round(pending * Number(b.qty) * 1e6) / 1e6),
        component_product_id: component ? component.id : null,
        component_uom_code: component ? component.uom_code : null,
        stock_quantity: component ? String(component.stock_quantity) : null,
        unit_differs: !!(component && b.unit && component.uom_code && b.unit.toUpperCase() !== component.uom_code.toUpperCase()),
      };
    }));
  },

  lock: async (connection, id) => {
    const [rows] = await connection.query('SELECT * FROM production_plans WHERE id = ? FOR UPDATE', [id]);
    return rows[0] || null;
  },

  countProcessing: async (connection, id) => {
    const [[row]] = await connection.query(
      'SELECT COUNT(*) AS n FROM processing_records pr JOIN production_plan_items x ON x.id = pr.production_plan_item_id WHERE x.production_plan_id = ?',
      [id]
    );
    return row.n;
  },

  create: async (connection, data) => {
    const [result] = await connection.query(`
      INSERT INTO production_plans (company_id, plan_no, financial_year, title, plan_date, target_date, status, remarks,
        created_by, updated_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?, NOW(), NOW())`,
    [data.company_id, data.plan_no, data.financial_year, data.title, data.plan_date, data.target_date, data.remarks, data.user_id, data.user_id]);
    return result.insertId;
  },

  update: async (connection, id, data) => {
    await connection.query(
      'UPDATE production_plans SET title = ?, plan_date = ?, target_date = ?, remarks = ?, updated_by = ?, updated_at = NOW() WHERE id = ?',
      [data.title, data.plan_date, data.target_date, data.remarks, data.user_id, id]
    );
  },

  replaceItems: async (connection, id, items) => {
    await connection.query('DELETE FROM production_plan_items WHERE production_plan_id = ?', [id]);
    for (const [i, item] of items.entries()) {
      await connection.query(`
        INSERT INTO production_plan_items (production_plan_id, sort_order, product_id, uom_id, unit, planned_quantity,
          order_confirmation_item_id, remarks, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [id, i, item.product_id, item.uom_id, item.unit, item.planned_quantity, item.order_confirmation_item_id, item.remarks]);
    }
  },

  setStatus: async (connection, id, status, userId, extra = {}) => {
    const sets = ['status = ?', 'updated_by = ?', 'updated_at = NOW()'];
    const params = [status, userId];
    if (status === 'planned') {
      sets.push('planned_at = NOW()', 'planned_by = ?');
      params.push(userId);
    }
    if (status === 'draft') sets.push('planned_at = NULL', 'planned_by = NULL');
    if (status === 'completed' || status === 'cancelled') {
      sets.push('closed_at = NOW()', 'closed_by = ?');
      params.push(userId);
    }
    if (status === 'cancelled') {
      sets.push('cancellation_reason = ?');
      params.push(extra.reason || null);
    }
    await connection.query(`UPDATE production_plans SET ${sets.join(', ')} WHERE id = ?`, [...params, id]);
  },

  delete: async (connection, id) => {
    await connection.query('DELETE FROM production_plans WHERE id = ?', [id]);
  },

  /** Finished products a company can plan, and its confirmed orders' lines (for "for order"). */
  formData: async (companyId) => {
    const [products] = await pool.query(`
      SELECT p.id, p.name, p.item_group_code, p.uom_id, u.code AS uom_code, COALESCE(u.decimal_places, 0) AS uom_decimal_places
      FROM products p JOIN uoms u ON u.id = p.uom_id
      WHERE p.deleted_at IS NULL AND p.status = 'active' AND p.company_id = ? ORDER BY p.name`, [companyId]);
    const [orderItems] = await pool.query(`
      SELECT oci.id, oci.order_confirmation_id, oc.oc_num, oci.product_id, oci.design_no, oci.qty, oci.unit
      FROM order_confirmation_items oci JOIN order_confirmations oc ON oc.id = oci.order_confirmation_id
      WHERE oc.deleted_at IS NULL AND oc.status = 'confirmed' AND oc.company_id = ? AND oci.product_id IS NOT NULL AND oci.qty > 0
      ORDER BY oc.id DESC, oci.sort_order`, [companyId]);
    return { products, order_items: orderItems };
  },

  /** Lines of PLANNED plans of a company, for booking a processing record against one. */
  openLines: async (companyId) => {
    const [rows] = await pool.query(`
      ${ITEM_SELECT}
      JOIN production_plans pp ON pp.id = ppi.production_plan_id
      WHERE pp.company_id = ? AND pp.status = 'planned'
      ORDER BY pp.id DESC, ppi.sort_order`, [companyId]);
    return rows;
  },

  findLine: async (executor, lineId) => {
    const [rows] = await executor.query(`
      SELECT ppi.*, pp.company_id, pp.status AS plan_status, pp.plan_no
      FROM production_plan_items ppi JOIN production_plans pp ON pp.id = ppi.production_plan_id
      WHERE ppi.id = ?`, [lineId]);
    return rows[0] || null;
  },
};
