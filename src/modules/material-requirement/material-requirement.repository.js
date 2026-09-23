import { pool } from '../../config/database.js';
import { companyScope } from '../../services/company-scope.service.js';

const isSet = (v) => v !== undefined && v !== null && v !== '';

/**
 * Product, UOM and required quantity are read through the source projection
 * item — never copied onto the requirement.
 *
 *   planned_quantity   = quantity on committed plans (status planned/closed)
 *   allocated_quantity = quantity on every non-deleted plan, drafts included
 *   pending_quantity   = required − planned
 *   available_quantity = required − allocated (what a new plan may still take)
 */
const SELECT = `
  SELECT mr.id, mr.company_id, mr.requirement_no, mr.financial_year, mr.brand_projection_id,
         mr.brand_projection_item_id, mr.status, mr.remarks, mr.created_at, mr.updated_at,
         bp.projection_no, bp.title AS projection_title, bp.period_start, bp.period_end,
         bp.brand_id, br.code AS brand_code, br.name AS brand_name,
         bpi.product_id, p.name AS product_name, p.item_group_code, mt.name AS material_type_name,
         bpi.uom_id, u.code AS uom_code, u.name AS uom_name, u.decimal_places AS uom_decimal_places,
         bpi.quantity AS required_quantity,
         COALESCE(alloc.committed_qty, 0) AS planned_quantity,
         COALESCE(alloc.allocated_qty, 0) AS allocated_quantity,
         bpi.quantity - COALESCE(alloc.committed_qty, 0) AS pending_quantity,
         bpi.quantity - COALESCE(alloc.allocated_qty, 0) AS available_quantity,
         cmp.code AS company_code, COALESCE(cmp.short_name, cmp.name) AS company_label
  FROM material_requirements mr
  JOIN brand_projections bp ON bp.id = mr.brand_projection_id
  JOIN brand_projection_items bpi ON bpi.id = mr.brand_projection_item_id
  LEFT JOIN brands br ON br.id = bp.brand_id
  LEFT JOIN products p ON p.id = bpi.product_id
  LEFT JOIN material_types mt ON mt.id = p.material_type_id
  LEFT JOIN uoms u ON u.id = bpi.uom_id
  LEFT JOIN companies cmp ON cmp.id = mr.company_id
  LEFT JOIN (
    SELECT mpi.material_requirement_id,
           SUM(CASE WHEN mp.status IN ('planned', 'closed') THEN mpi.planned_quantity ELSE 0 END) AS committed_qty,
           SUM(mpi.planned_quantity) AS allocated_qty
    FROM material_plan_items mpi
    JOIN material_plans mp ON mp.id = mpi.material_plan_id AND mp.deleted_at IS NULL
    GROUP BY mpi.material_requirement_id
  ) alloc ON alloc.material_requirement_id = mr.id
`;

export const materialRequirementRepository = {
  findAll: async ({ search, status, company_id, brand_id, brand_projection_id, plannable, page = 1, limit = 15 }) => {
    let query = `${SELECT} WHERE 1 = 1`;
    const params = [];

    if (search) {
      query += ' AND (mr.requirement_no LIKE ? OR bp.projection_no LIKE ? OR p.name LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term);
    }
    if (['open', 'planned', 'closed'].includes(status)) {
      query += ' AND mr.status = ?';
      params.push(status);
    }
    if (isSet(brand_id)) {
      query += ' AND bp.brand_id = ?';
      params.push(Number(brand_id));
    }
    if (isSet(brand_projection_id)) {
      query += ' AND mr.brand_projection_id = ?';
      params.push(Number(brand_projection_id));
    }
    // For the plan form: not closed and with quantity not yet allocated to any plan.
    if (plannable === '1' || plannable === 'true') {
      query += " AND mr.status <> 'closed' AND bpi.quantity - COALESCE(alloc.allocated_qty, 0) > 0";
    }
    const companyFilter = companyScope.filterSql('mr.company_id', companyScope.parseFilter(company_id));
    query += companyFilter.sql;
    params.push(...companyFilter.params);

    query += ' ORDER BY mr.id DESC';

    const [countRows] = await pool.query(`SELECT COUNT(*) as total FROM (${query}) as t`, params);
    const safeLimit = Number(limit) > 0 ? Math.min(Number(limit), 500) : 15;
    const safePage = Number(page) > 0 ? Number(page) : 1;
    query += ' LIMIT ? OFFSET ?';
    params.push(safeLimit, (safePage - 1) * safeLimit);

    const [rows] = await pool.query(query, params);
    return { data: rows, total: countRows[0].total, page: safePage, limit: safeLimit };
  },

  findById: async (id, executor = pool) => {
    const [rows] = await executor.query(`${SELECT} WHERE mr.id = ?`, [id]);
    if (rows.length === 0) return null;
    const requirement = rows[0];

    const [plans] = await executor.query(`
      SELECT mp.id AS material_plan_id, mp.plan_no, mp.title, mp.status, mpi.planned_quantity
      FROM material_plan_items mpi
      JOIN material_plans mp ON mp.id = mpi.material_plan_id AND mp.deleted_at IS NULL
      WHERE mpi.material_requirement_id = ?
      ORDER BY mp.id ASC
    `, [id]);
    requirement.plans = plans;
    return requirement;
  },

  /** Rows (with derived quantities) for a set of requirement ids, for plan validation. */
  findManyForPlanning: async (connection, ids) => {
    if (ids.length === 0) return [];
    const [rows] = await connection.query(`${SELECT} WHERE mr.id IN (?)`, [ids]);
    return rows;
  },

  lock: async (connection, id) => {
    const [rows] = await connection.query('SELECT * FROM material_requirements WHERE id = ? FOR UPDATE', [id]);
    return rows[0] || null;
  },

  /** Projection items that do not have a requirement yet. */
  findUngeneratedItems: async (connection, projectionId) => {
    const [rows] = await connection.query(`
      SELECT bpi.id
      FROM brand_projection_items bpi
      LEFT JOIN material_requirements mr ON mr.brand_projection_item_id = bpi.id
      WHERE bpi.brand_projection_id = ? AND mr.id IS NULL
      ORDER BY bpi.sort_order ASC, bpi.id ASC
    `, [projectionId]);
    return rows;
  },

  create: async (connection, data) => {
    const [result] = await connection.query(`
      INSERT INTO material_requirements (
        company_id, requirement_no, financial_year, brand_projection_id, brand_projection_item_id,
        status, created_by, updated_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 'open', ?, ?, NOW(), NOW())
    `, [data.company_id, data.requirement_no, data.financial_year, data.brand_projection_id,
      data.brand_projection_item_id, data.created_by, data.updated_by]);
    return result.insertId;
  },

  setStatus: async (connection, id, status, userId, remarks) => {
    const withRemarks = remarks !== undefined;
    await connection.query(
      `UPDATE material_requirements SET status = ?, ${withRemarks ? 'remarks = ?,' : ''} updated_by = ?, updated_at = NOW() WHERE id = ?`,
      withRemarks ? [status, remarks, userId, id] : [status, userId, id]
    );
  },

  /** Draft plans (not deleted) that include this requirement. */
  countDraftPlans: async (connection, id) => {
    const [rows] = await connection.query(`
      SELECT COUNT(*) as cnt FROM material_plan_items mpi
      JOIN material_plans mp ON mp.id = mpi.material_plan_id
      WHERE mpi.material_requirement_id = ? AND mp.deleted_at IS NULL AND mp.status = 'draft'
    `, [id]);
    return rows[0].cnt;
  },

  countActivePlans: async (connection, id) => {
    const [rows] = await connection.query(`
      SELECT COUNT(*) as cnt FROM material_plan_items mpi
      JOIN material_plans mp ON mp.id = mpi.material_plan_id
      WHERE mpi.material_requirement_id = ? AND mp.deleted_at IS NULL
    `, [id]);
    return rows[0].cnt;
  },

  /** Lines of soft-deleted plans are inert; they are removed so the requirement can go. */
  deleteLinesOfDeletedPlans: async (connection, id) => {
    await connection.query(`
      DELETE mpi FROM material_plan_items mpi
      JOIN material_plans mp ON mp.id = mpi.material_plan_id
      WHERE mpi.material_requirement_id = ? AND mp.deleted_at IS NOT NULL
    `, [id]);
  },

  hardDelete: async (connection, id) => {
    await connection.query('DELETE FROM material_requirements WHERE id = ?', [id]);
  },
};
