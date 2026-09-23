import { pool } from '../../config/database.js';
import { companyScope } from '../../services/company-scope.service.js';
import { materialRequirementRepository } from '../material-requirement/material-requirement.repository.js';
import { PLAN_ITEM_ORDER_AGGREGATE } from '../purchase-order/garment-po.repository.js';

const isSet = (v) => v !== undefined && v !== null && v !== '';

/** Attaches each plan's lines, with required/pending read through the requirement. */
const attachItems = async (plans, executor = pool) => {
  if (plans.length === 0) return plans;
  const [items] = await executor.query(`
    SELECT mpi.id, mpi.material_plan_id, mpi.sort_order, mpi.material_requirement_id,
           mpi.planned_quantity, mpi.remarks,
           COALESCE(pio.ordered_qty, 0) AS ordered_quantity,
           COALESCE(pio.reserved_qty, 0) AS order_reserved_quantity,
           mpi.planned_quantity - COALESCE(pio.ordered_qty, 0) AS order_pending_quantity
    FROM material_plan_items mpi
    LEFT JOIN (${PLAN_ITEM_ORDER_AGGREGATE}) pio ON pio.source_id = mpi.id
    WHERE mpi.material_plan_id IN (?)
    ORDER BY mpi.sort_order ASC, mpi.id ASC
  `, [plans.map((p) => p.id)]);

  const requirements = await materialRequirementRepository.findManyForPlanning(
    executor, [...new Set(items.map((i) => i.material_requirement_id))]
  );
  const byId = Object.fromEntries(requirements.map((r) => [r.id, r]));

  for (const plan of plans) {
    plan.items = items
      .filter((i) => i.material_plan_id === plan.id)
      .map((i) => {
        const r = byId[i.material_requirement_id] || {};
        return {
          ...i,
          requirement_no: r.requirement_no,
          requirement_status: r.status,
          projection_no: r.projection_no,
          brand_projection_id: r.brand_projection_id,
          brand_name: r.brand_name,
          product_id: r.product_id,
          product_name: r.product_name,
          material_type_name: r.material_type_name,
          uom_code: r.uom_code,
          uom_decimal_places: r.uom_decimal_places,
          required_quantity: r.required_quantity,
          // Requirement-level figures across all plans:
          requirement_planned_quantity: r.planned_quantity,
          requirement_allocated_quantity: r.allocated_quantity,
          pending_quantity: r.pending_quantity,
        };
      });
  }
  return plans;
};

export const materialPlanRepository = {
  findAll: async ({ search, status, company_id, period_from, period_to, page = 1, limit = 15 }) => {
    let query = `
      SELECT mp.id, mp.company_id, mp.plan_no, mp.financial_year, mp.title, mp.period_start, mp.period_end,
             mp.status, mp.created_at, mp.updated_at,
             cmp.code AS company_code, COALESCE(cmp.short_name, cmp.name) AS company_label
      FROM material_plans mp
      LEFT JOIN companies cmp ON cmp.id = mp.company_id
      WHERE mp.deleted_at IS NULL
    `;
    const params = [];

    if (search) {
      query += ` AND (mp.plan_no LIKE ? OR mp.title LIKE ? OR EXISTS (
        SELECT 1 FROM material_plan_items mpi
        JOIN material_requirements mr ON mr.id = mpi.material_requirement_id
        JOIN brand_projection_items bpi ON bpi.id = mr.brand_projection_item_id
        JOIN products p ON p.id = bpi.product_id
        WHERE mpi.material_plan_id = mp.id AND p.name LIKE ?))`;
      const term = `%${search}%`;
      params.push(term, term, term);
    }
    if (['draft', 'planned', 'closed'].includes(status)) {
      query += ' AND mp.status = ?';
      params.push(status);
    }
    if (isSet(period_from)) {
      query += ' AND mp.period_end >= ?';
      params.push(period_from);
    }
    if (isSet(period_to)) {
      query += ' AND mp.period_start <= ?';
      params.push(period_to);
    }
    const companyFilter = companyScope.filterSql('mp.company_id', companyScope.parseFilter(company_id));
    query += companyFilter.sql;
    params.push(...companyFilter.params);

    query += ' ORDER BY mp.id DESC';

    const [countRows] = await pool.query(`SELECT COUNT(*) as total FROM (${query}) as t`, params);
    const safeLimit = Number(limit) > 0 ? Number(limit) : 15;
    const safePage = Number(page) > 0 ? Number(page) : 1;
    query += ' LIMIT ? OFFSET ?';
    params.push(safeLimit, (safePage - 1) * safeLimit);

    const [rows] = await pool.query(query, params);
    await attachItems(rows);
    return { data: rows, total: countRows[0].total, page: safePage, limit: safeLimit };
  },

  findById: async (id) => {
    const [rows] = await pool.query(`
      SELECT mp.*, cmp.code AS company_code, COALESCE(cmp.short_name, cmp.name) AS company_label,
             u1.name AS creator_name, u2.name AS updater_name
      FROM material_plans mp
      LEFT JOIN companies cmp ON cmp.id = mp.company_id
      LEFT JOIN users u1 ON u1.id = mp.created_by
      LEFT JOIN users u2 ON u2.id = mp.updated_by
      WHERE mp.id = ? AND mp.deleted_at IS NULL
    `, [id]);
    if (rows.length === 0) return null;
    await attachItems(rows);
    return rows[0];
  },

  lock: async (connection, id) => {
    const [rows] = await connection.query(
      'SELECT * FROM material_plans WHERE id = ? AND deleted_at IS NULL FOR UPDATE',
      [id]
    );
    return rows[0] || null;
  },

  /** Row-locks requirements so concurrent plans cannot over-allocate them. */
  lockRequirements: async (connection, ids) => {
    if (ids.length === 0) return;
    await connection.query('SELECT id FROM material_requirements WHERE id IN (?) FOR UPDATE', [ids]);
  },

  findItems: async (connection, planId) => {
    const [rows] = await connection.query(
      'SELECT material_requirement_id, planned_quantity, remarks FROM material_plan_items WHERE material_plan_id = ?',
      [planId]
    );
    return rows;
  },

  create: async (connection, data) => {
    const [result] = await connection.query(`
      INSERT INTO material_plans (
        company_id, plan_no, financial_year, title, period_start, period_end, status, remarks,
        created_by, updated_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?, NOW(), NOW())
    `, [data.company_id, data.plan_no, data.financial_year, data.title, data.period_start, data.period_end,
      data.remarks, data.created_by, data.updated_by]);
    return result.insertId;
  },

  update: async (connection, id, data) => {
    await connection.query(`
      UPDATE material_plans SET company_id = ?, title = ?, period_start = ?, period_end = ?, remarks = ?,
        updated_by = ?, updated_at = NOW()
      WHERE id = ? AND deleted_at IS NULL
    `, [data.company_id, data.title, data.period_start, data.period_end, data.remarks, data.updated_by, id]);
  },

  /** Delete-then-recreate — only ever called on a draft plan. */
  replaceItems: async (connection, planId, items) => {
    await connection.query('DELETE FROM material_plan_items WHERE material_plan_id = ?', [planId]);
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      await connection.query(`
        INSERT INTO material_plan_items (material_plan_id, sort_order, material_requirement_id, planned_quantity, remarks)
        VALUES (?, ?, ?, ?, ?)
      `, [planId, i, item.material_requirement_id, item.planned_quantity, item.remarks || null]);
    }
  },

  setStatus: async (connection, id, status, userId) => {
    await connection.query(
      'UPDATE material_plans SET status = ?, updated_by = ?, updated_at = NOW() WHERE id = ?',
      [status, userId, id]
    );
  },

  /** Purchase-order lines on live (not cancelled / deleted) POs that draw on this plan. */
  countLivePurchaseOrderLines: async (connection, planId) => {
    const [rows] = await connection.query(`
      SELECT COUNT(*) AS cnt FROM purchase_order_items poi
      JOIN material_plan_items mpi ON mpi.id = poi.material_plan_item_id
      JOIN purchase_orders po ON po.id = poi.purchase_order_id
      WHERE mpi.material_plan_id = ? AND po.deleted_at IS NULL AND po.status <> 'cancelled'
    `, [planId]);
    return rows[0].cnt;
  },

  softDelete: async (id) => {
    await pool.query('UPDATE material_plans SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL', [id]);
  },
};
