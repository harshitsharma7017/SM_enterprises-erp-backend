import { pool } from '../../config/database.js';
import { companyScope } from '../../services/company-scope.service.js';
import { findLotTrace } from '../lot/lot.repository.js';
import { SIGNED_QUANTITY } from '../inventory/stock-ledger.js';

const isSet = (v) => v !== undefined && v !== null && v !== '';

const ISSUE_SELECT = `
  SELECT mi.*, loc.code AS location_code, loc.name AS location_name, loc.status AS location_status,
         cmp.code AS company_code, COALESCE(cmp.short_name, cmp.name) AS company_label,
         ur.name AS receiver_name, us.name AS supervisor_name, uf.name AS foreman_name,
         u1.name AS creator_name, u2.name AS poster_name, u3.name AS canceller_name,
         (SELECT COUNT(*) FROM material_issue_items x WHERE x.material_issue_id = mi.id) AS lines_count,
         pr.id AS processing_record_id, pr.processing_no, pr.status AS processing_status
  FROM material_issues mi
  JOIN stock_locations loc ON loc.id = mi.location_id
  LEFT JOIN companies cmp ON cmp.id = mi.company_id
  LEFT JOIN users ur ON ur.id = mi.receiver_user_id
  LEFT JOIN users us ON us.id = mi.supervisor_user_id
  LEFT JOIN users uf ON uf.id = mi.foreman_user_id
  LEFT JOIN users u1 ON u1.id = mi.created_by
  LEFT JOIN users u2 ON u2.id = mi.posted_by
  LEFT JOIN users u3 ON u3.id = mi.cancelled_by
  LEFT JOIN processing_records pr ON pr.material_issue_id = mi.id
`;

/** Issue lines with their lot's source chain, UOM precision, posted movement and live stock at the issue location. */
const ITEM_SELECT = `
  SELECT mii.*, l.lot_no, l.width_inch, l.supplier_lot_no, l.inward_entry_id, l.purchase_order_id, l.status AS lot_status,
         ie.inward_no, po.po_num, po.origin AS purchase_order_origin, s.company_name AS supplier_name,
         p.name AS product_name, p.item_group_code, COALESCE(u.decimal_places, 0) AS uom_decimal_places,
         sm.id AS stock_movement_id, sm.movement_no AS stock_movement_no,
         COALESCE((SELECT SUM(${SIGNED_QUANTITY}) FROM stock_movements sm WHERE sm.lot_id = mii.lot_id AND sm.location_id = mi.location_id), 0) AS available_quantity
  FROM material_issue_items mii
  JOIN material_issues mi ON mi.id = mii.material_issue_id
  JOIN lots l ON l.id = mii.lot_id
  LEFT JOIN inward_entries ie ON ie.id = l.inward_entry_id
  LEFT JOIN purchase_orders po ON po.id = l.purchase_order_id
  LEFT JOIN suppliers s ON s.id = l.supplier_id
  LEFT JOIN products p ON p.id = mii.product_id
  LEFT JOIN uoms u ON u.id = mii.uom_id
  LEFT JOIN stock_movements sm ON sm.material_issue_item_id = mii.id AND sm.movement_type = 'MATERIAL_ISSUE'
`;

export const materialIssueRepository = {
  findAll: async (filters = {}) => {
    let query = `${ISSUE_SELECT} WHERE 1 = 1`;
    const params = [];
    if (['draft', 'issued', 'cancelled'].includes(filters.status)) {
      query += ' AND mi.status = ?';
      params.push(filters.status);
    }
    if (isSet(filters.location_id)) {
      query += ' AND mi.location_id = ?';
      params.push(Number(filters.location_id));
    }
    if (isSet(filters.product_id)) {
      query += ' AND EXISTS (SELECT 1 FROM material_issue_items x WHERE x.material_issue_id = mi.id AND x.product_id = ?)';
      params.push(Number(filters.product_id));
    }
    if (isSet(filters.lot_id)) {
      query += ' AND EXISTS (SELECT 1 FROM material_issue_items x WHERE x.material_issue_id = mi.id AND x.lot_id = ?)';
      params.push(Number(filters.lot_id));
    }
    if (isSet(filters.lot)) {
      query += ' AND EXISTS (SELECT 1 FROM material_issue_items x JOIN lots lx ON lx.id = x.lot_id WHERE x.material_issue_id = mi.id AND lx.lot_no LIKE ?)';
      params.push(`%${filters.lot}%`);
    }
    if (isSet(filters.date_from)) {
      query += ' AND mi.issue_date >= ?';
      params.push(filters.date_from);
    }
    if (isSet(filters.date_to)) {
      query += ' AND mi.issue_date <= ?';
      params.push(filters.date_to);
    }
    if (filters.search) {
      query += ` AND (mi.issue_no LIKE ? OR mi.job_reference LIKE ? OR ur.name LIKE ? OR us.name LIKE ? OR uf.name LIKE ?
        OR EXISTS (SELECT 1 FROM material_issue_items x JOIN lots lx ON lx.id = x.lot_id JOIN products px ON px.id = x.product_id
                   WHERE x.material_issue_id = mi.id AND (lx.lot_no LIKE ? OR px.name LIKE ?)))`;
      params.push(...Array(7).fill(`%${filters.search}%`));
    }
    const cf = companyScope.filterSql('mi.company_id', companyScope.parseFilter(filters.company_id));
    query += `${cf.sql} ORDER BY mi.id DESC`;
    params.push(...cf.params);

    const page = parseInt(filters.page, 10) > 0 ? parseInt(filters.page, 10) : 1;
    const limit = parseInt(filters.limit, 10) > 0 ? Math.min(parseInt(filters.limit, 10), 500) : 15;
    const [[{ total }]] = await pool.query(`SELECT COUNT(*) as total FROM (${query}) as sub`, params);
    const [rows] = await pool.query(`${query} LIMIT ? OFFSET ?`, [...params, limit, (page - 1) * limit]);
    return { rows, total, page, limit };
  },

  /** Header + lines, each line with its lot trace (GRN → PO → OC or plan → requirement → projection). */
  findById: async (id) => {
    const [rows] = await pool.query(`${ISSUE_SELECT} WHERE mi.id = ?`, [id]);
    if (rows.length === 0) return null;
    const issue = rows[0];
    const [items] = await pool.query(`${ITEM_SELECT} WHERE mii.material_issue_id = ? ORDER BY mii.sort_order, mii.id`, [id]);
    issue.items = await Promise.all(items.map(async (item) => ({ ...item, trace: await findLotTrace(item.lot_id) })));
    return issue;
  },

  /** Active users — receiver / supervisor / foreman come from the existing user accounts. */
  findActiveUsers: async () => {
    const [rows] = await pool.query('SELECT id, name, email FROM users WHERE is_active = 1 ORDER BY name');
    return rows;
  },

  findUsers: async (executor, ids) => {
    if (ids.length === 0) return [];
    const [rows] = await executor.query('SELECT id, name, is_active FROM users WHERE id IN (?)', [ids]);
    return rows;
  },

  /** Lot as an issue source (read for drafts; locked lots are read through the inventory repository). */
  findLot: async (executor, lotId) => {
    const [rows] = await executor.query(`
      SELECT l.*, ie.receipt_status, ie.entry_type, ie.deleted_at AS grn_deleted_at,
             p.company_id AS product_company_id, COALESCE(u.decimal_places, 0) AS uom_decimal_places
      FROM lots l
      LEFT JOIN inward_entries ie ON ie.id = l.inward_entry_id
      LEFT JOIN products p ON p.id = l.product_id
      LEFT JOIN uoms u ON u.id = l.uom_id
      WHERE l.id = ?`, [lotId]);
    return rows[0] || null;
  },

  lock: async (connection, id) => {
    const [rows] = await connection.query('SELECT * FROM material_issues WHERE id = ? FOR UPDATE', [id]);
    return rows[0] || null;
  },

  /** Locking read of the lines (keeps later plain reads on a fresh snapshot). */
  lockLines: async (connection, id) => {
    const [rows] = await connection.query('SELECT * FROM material_issue_items WHERE material_issue_id = ? ORDER BY sort_order, id FOR UPDATE', [id]);
    return rows;
  },

  insertHeader: async (connection, data) => {
    const [result] = await connection.query(`
      INSERT INTO material_issues (
        company_id, issue_no, financial_year, issue_date, location_id, job_reference, receiver_user_id,
        supervisor_user_id, foreman_user_id, remarks, status, created_by, updated_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, NOW(), NOW())
    `, [
      data.company_id, data.issue_no, data.financial_year, data.issue_date, data.location_id, data.job_reference,
      data.receiver_user_id, data.supervisor_user_id, data.foreman_user_id, data.remarks, data.user_id, data.user_id,
    ]);
    return result.insertId;
  },

  updateHeader: async (connection, id, data) => {
    await connection.query(`
      UPDATE material_issues SET issue_date = ?, location_id = ?, job_reference = ?, receiver_user_id = ?,
        supervisor_user_id = ?, foreman_user_id = ?, remarks = ?, updated_by = ?, updated_at = NOW()
      WHERE id = ?
    `, [
      data.issue_date, data.location_id, data.job_reference, data.receiver_user_id, data.supervisor_user_id,
      data.foreman_user_id, data.remarks, data.user_id, id,
    ]);
  },

  /** Draft lines only (posted lines are referenced by stock movements and cannot be deleted). */
  replaceLines: async (connection, id, lines) => {
    await connection.query('DELETE FROM material_issue_items WHERE material_issue_id = ?', [id]);
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      await connection.query(`
        INSERT INTO material_issue_items (material_issue_id, sort_order, lot_id, product_id, uom_id, unit, quantity, remarks)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [id, i + 1, l.lot_id, l.product_id, l.uom_id, l.unit, l.quantity, l.remarks]);
    }
  },

  setIssued: async (connection, id, userId) => {
    await connection.query(
      "UPDATE material_issues SET status = 'issued', posted_at = NOW(), posted_by = ?, updated_by = ?, updated_at = NOW() WHERE id = ?",
      [userId, userId, id]
    );
  },

  setCancelled: async (connection, id, userId) => {
    await connection.query(
      "UPDATE material_issues SET status = 'cancelled', cancelled_at = NOW(), cancelled_by = ?, updated_by = ?, updated_at = NOW() WHERE id = ?",
      [userId, userId, id]
    );
  },
};
