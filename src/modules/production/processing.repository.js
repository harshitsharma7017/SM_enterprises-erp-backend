import { pool } from '../../config/database.js';
import { companyScope } from '../../services/company-scope.service.js';
import { findLotTrace } from '../lot/lot.repository.js';

const isSet = (v) => v !== undefined && v !== null && v !== '';

const RECORD_SELECT = `
  SELECT pr.*, mi.issue_no, mi.issue_date, mi.job_reference, mi.location_id, mi.status AS issue_status,
         loc.code AS location_code, loc.name AS location_name,
         ur.name AS receiver_name, us.name AS supervisor_name, uf.name AS foreman_name,
         pp.name AS produced_product_name, pp.item_group_code AS produced_item_group_code,
         pu.code AS produced_uom_code, COALESCE(pu.decimal_places, 0) AS produced_uom_decimal_places,
         cmp.code AS company_code, COALESCE(cmp.short_name, cmp.name) AS company_label,
         u1.name AS creator_name, u2.name AS completer_name,
         (SELECT COUNT(*) FROM processing_record_items x WHERE x.processing_record_id = pr.id) AS lines_count
  FROM processing_records pr
  JOIN material_issues mi ON mi.id = pr.material_issue_id
  JOIN stock_locations loc ON loc.id = mi.location_id
  LEFT JOIN users ur ON ur.id = mi.receiver_user_id
  LEFT JOIN users us ON us.id = mi.supervisor_user_id
  LEFT JOIN users uf ON uf.id = mi.foreman_user_id
  LEFT JOIN products pp ON pp.id = pr.produced_product_id
  LEFT JOIN uoms pu ON pu.id = pr.produced_uom_id
  LEFT JOIN companies cmp ON cmp.id = pr.company_id
  LEFT JOIN users u1 ON u1.id = pr.created_by
  LEFT JOIN users u2 ON u2.id = pr.completed_by
`;

const ITEM_SELECT = `
  SELECT pri.*, l.lot_no, l.width_inch, l.supplier_lot_no, l.inward_entry_id, l.purchase_order_id,
         ie.inward_no, po.po_num, po.origin AS purchase_order_origin, s.company_name AS supplier_name,
         p.name AS product_name, p.item_group_code, COALESCE(u.decimal_places, 0) AS uom_decimal_places,
         sm.id AS stock_movement_id, sm.movement_no AS stock_movement_no
  FROM processing_record_items pri
  JOIN lots l ON l.id = pri.lot_id
  LEFT JOIN inward_entries ie ON ie.id = l.inward_entry_id
  LEFT JOIN purchase_orders po ON po.id = l.purchase_order_id
  LEFT JOIN suppliers s ON s.id = l.supplier_id
  LEFT JOIN products p ON p.id = pri.product_id
  LEFT JOIN uoms u ON u.id = pri.uom_id
  LEFT JOIN stock_movements sm ON sm.material_issue_item_id = pri.material_issue_item_id AND sm.movement_type = 'MATERIAL_ISSUE'
`;

export const processingRepository = {
  findAll: async (filters = {}) => {
    let query = `${RECORD_SELECT} WHERE 1 = 1`;
    const params = [];
    if (['in_process', 'completed'].includes(filters.status)) {
      query += ' AND pr.status = ?';
      params.push(filters.status);
    }
    if (isSet(filters.location_id)) {
      query += ' AND mi.location_id = ?';
      params.push(Number(filters.location_id));
    }
    if (isSet(filters.product_id)) {
      query += ' AND EXISTS (SELECT 1 FROM processing_record_items x WHERE x.processing_record_id = pr.id AND x.product_id = ?)';
      params.push(Number(filters.product_id));
    }
    if (isSet(filters.lot)) {
      query += ' AND EXISTS (SELECT 1 FROM processing_record_items x JOIN lots lx ON lx.id = x.lot_id WHERE x.processing_record_id = pr.id AND lx.lot_no LIKE ?)';
      params.push(`%${filters.lot}%`);
    }
    if (isSet(filters.date_from)) {
      query += ' AND pr.start_date >= ?';
      params.push(filters.date_from);
    }
    if (isSet(filters.date_to)) {
      query += ' AND pr.start_date <= ?';
      params.push(filters.date_to);
    }
    if (filters.search) {
      query += ' AND (pr.processing_no LIKE ? OR mi.issue_no LIKE ? OR mi.job_reference LIKE ? OR us.name LIKE ? OR uf.name LIKE ?)';
      params.push(...Array(5).fill(`%${filters.search}%`));
    }
    const cf = companyScope.filterSql('pr.company_id', companyScope.parseFilter(filters.company_id));
    query += `${cf.sql} ORDER BY pr.id DESC`;
    params.push(...cf.params);

    const page = parseInt(filters.page, 10) > 0 ? parseInt(filters.page, 10) : 1;
    const limit = parseInt(filters.limit, 10) > 0 ? Math.min(parseInt(filters.limit, 10), 500) : 15;
    const [[{ total }]] = await pool.query(`SELECT COUNT(*) as total FROM (${query}) as sub`, params);
    const [rows] = await pool.query(`${query} LIMIT ? OFFSET ?`, [...params, limit, (page - 1) * limit]);
    return { rows, total, page, limit };
  },

  findById: async (id) => {
    const [rows] = await pool.query(`${RECORD_SELECT} WHERE pr.id = ?`, [id]);
    if (rows.length === 0) return null;
    const record = rows[0];
    const [items] = await pool.query(`${ITEM_SELECT} WHERE pri.processing_record_id = ? ORDER BY pri.id`, [id]);
    record.items = await Promise.all(items.map(async (item) => ({ ...item, trace: await findLotTrace(item.lot_id) })));
    return record;
  },

  /** Products of the company and active UOMs, for recording what was produced. */
  findOutputOptions: async (companyId) => {
    const [products] = await pool.query(
      "SELECT id, name, item_group_code, uom_id FROM products WHERE company_id = ? AND deleted_at IS NULL AND status = 'active' ORDER BY name",
      [companyId]
    );
    const [uoms] = await pool.query("SELECT id, code, name, decimal_places FROM uoms WHERE deleted_at IS NULL AND status = 'active' ORDER BY code");
    return { products, uoms };
  },

  findProduct: async (executor, id) => {
    const [rows] = await executor.query('SELECT id, name, company_id, uom_id, status, deleted_at FROM products WHERE id = ?', [id]);
    return rows[0] || null;
  },

  findUom: async (executor, id) => {
    const [rows] = await executor.query('SELECT id, code, decimal_places, status, deleted_at FROM uoms WHERE id = ?', [id]);
    return rows[0] || null;
  },

  lock: async (connection, id) => {
    const [rows] = await connection.query('SELECT * FROM processing_records WHERE id = ? FOR UPDATE', [id]);
    return rows[0] || null;
  },

  lockItems: async (connection, id) => {
    const [rows] = await connection.query(`
      SELECT pri.*, COALESCE(u.decimal_places, 0) AS uom_decimal_places
      FROM processing_record_items pri LEFT JOIN uoms u ON u.id = pri.uom_id
      WHERE pri.processing_record_id = ? ORDER BY pri.id FOR UPDATE OF pri`, [id]);
    return rows;
  },

  findByIssue: async (executor, issueId) => {
    const [rows] = await executor.query('SELECT id, processing_no FROM processing_records WHERE material_issue_id = ?', [issueId]);
    return rows[0] || null;
  },

  insert: async (connection, data, issueLines) => {
    const [result] = await connection.query(`
      INSERT INTO processing_records (company_id, processing_no, financial_year, material_issue_id, start_date, remarks,
        status, created_by, updated_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 'in_process', ?, ?, NOW(), NOW())
    `, [data.company_id, data.processing_no, data.financial_year, data.material_issue_id, data.start_date, data.remarks, data.user_id, data.user_id]);
    for (const line of issueLines) {
      await connection.query(`
        INSERT INTO processing_record_items (processing_record_id, material_issue_item_id, lot_id, product_id, uom_id, unit, issued_quantity)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [result.insertId, line.id, line.lot_id, line.product_id, line.uom_id, line.unit, line.quantity]);
    }
    return result.insertId;
  },

  update: async (connection, id, data) => {
    await connection.query(`
      UPDATE processing_records SET start_date = ?, produced_product_id = ?, produced_uom_id = ?, produced_unit = ?,
        produced_quantity = ?, remarks = ?, updated_by = ?, updated_at = NOW()
      WHERE id = ?
    `, [data.start_date, data.produced_product_id, data.produced_uom_id, data.produced_unit, data.produced_quantity, data.remarks, data.user_id, id]);
  },

  updateItem: async (connection, itemId, data) => {
    await connection.query(
      'UPDATE processing_record_items SET consumed_quantity = ?, wastage_quantity = ?, balance_quantity = ?, remarks = ? WHERE id = ?',
      [data.consumed_quantity, data.wastage_quantity, data.balance_quantity, data.remarks, itemId]
    );
  },

  setCompleted: async (connection, id, completionDate, userId) => {
    await connection.query(`
      UPDATE processing_records SET status = 'completed', completion_date = ?, completed_at = NOW(), completed_by = ?,
        updated_by = ?, updated_at = NOW()
      WHERE id = ?
    `, [completionDate, userId, userId, id]);
  },
};
