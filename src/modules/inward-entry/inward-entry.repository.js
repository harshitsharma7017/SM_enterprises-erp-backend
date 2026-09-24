import { pool } from '../../config/database.js';
import { companyScope } from '../../services/company-scope.service.js';

/**
 * Goods receipt (GRN) data access. inward_entries / inward_entry_items hold
 * both legacy integer inward entries (entry_type = 'legacy_inward', history)
 * and GRNs (entry_type = 'grn').
 *
 * Received-quantity rule (single source for PO receiving progress):
 *   received = SUM(COALESCE(received_quantity, received_qty)) over lines of
 *              POSTED, non-deleted receipts, excluding legacy entries that QC
 *              rejected (the old flow never counted those)
 *   drafts and cancelled receipts count for nothing.
 */
export const RECEIVED_CONDITION = `
  ie.deleted_at IS NULL AND ie.receipt_status = 'posted'
  AND NOT (ie.entry_type = 'legacy_inward' AND ie.status = 'rejected')
`;

const RECEIVED_BY_PO_LINE = `
  SELECT iei.purchase_order_item_id,
         SUM(CASE WHEN ${RECEIVED_CONDITION} THEN COALESCE(iei.received_quantity, iei.received_qty) ELSE 0 END) AS received_qty,
         SUM(CASE WHEN ie.deleted_at IS NULL AND ie.receipt_status = 'draft' THEN iei.received_quantity ELSE 0 END) AS draft_qty
  FROM inward_entry_items iei
  JOIN inward_entries ie ON ie.id = iei.inward_entry_id
  GROUP BY iei.purchase_order_item_id
`;

/**
 * Quantity of each PO line the mill shipped straight to the customer (POSTED
 * direct supplier dispatches). A PO line is fulfilled either way, so
 * received (GRN) + direct-dispatched never exceeds the ordered quantity.
 */
export const DIRECT_DISPATCHED_BY_PO_LINE = `
  SELECT di.purchase_order_item_id, SUM(di.quantity) AS direct_qty
  FROM dispatch_items di
  JOIN dispatches d ON d.id = di.dispatch_id
  WHERE d.status = 'posted' AND d.dispatch_type = 'DIRECT_SUPPLIER_DISPATCH'
  GROUP BY di.purchase_order_item_id
`;

/**
 * A PO line with everything receiving derives and validates. The receiving
 * unit is the planning line's frozen UOM for planning POs, else the
 * product's UOM; OC lines whose product has no UOM fall back to the PO
 * line's text unit with whole-number precision (their PO qty is an integer).
 */
const PO_LINE_SELECT = `
  SELECT poi.id, poi.purchase_order_id, poi.sort_order, poi.product_id, poi.description, poi.order_confirmation_item_id,
         COALESCE(poi.ordered_quantity, poi.qty) AS ordered_quantity,
         COALESCE(rcv.received_qty, 0) AS received_quantity,
         COALESCE(rcv.draft_qty, 0) AS draft_quantity,
         COALESCE(dd.direct_qty, 0) AS direct_dispatched_quantity,
         COALESCE(poi.ordered_quantity, poi.qty) - COALESCE(rcv.received_qty, 0) - COALESCE(dd.direct_qty, 0) AS pending_quantity,
         p.name AS product_name, p.item_group_code, p.company_id AS product_company_id,
         p.status AS product_status, p.deleted_at AS product_deleted_at,
         COALESCE(bpi.uom_id, p.uom_id) AS uom_id,
         COALESCE(u.code, poi.unit) AS unit,
         COALESCE(u.decimal_places, 0) AS uom_decimal_places,
         poi.material_requirement_id, mr.requirement_no
  FROM purchase_order_items poi
  LEFT JOIN products p ON p.id = poi.product_id
  LEFT JOIN material_requirements mr ON mr.id = poi.material_requirement_id
  LEFT JOIN brand_projection_items bpi ON bpi.id = mr.brand_projection_item_id
  LEFT JOIN uoms u ON u.id = COALESCE(bpi.uom_id, p.uom_id)
  LEFT JOIN (${RECEIVED_BY_PO_LINE}) rcv ON rcv.purchase_order_item_id = poi.id
  LEFT JOIN (${DIRECT_DISPATCHED_BY_PO_LINE}) dd ON dd.purchase_order_item_id = poi.id
`;

const HEADER_SELECT = `
  SELECT ie.*,
    po.po_num AS purchase_order_num, po.origin AS purchase_order_origin, po.status AS purchase_order_status,
    s.company_name AS supplier_name, s.display_code AS supplier_display_code,
    u1.name AS creator_name, u2.name AS qc_inspector_name, u3.name AS poster_name, u4.name AS canceller_name,
    cmp.code AS company_code, COALESCE(cmp.short_name, cmp.name) AS company_label,
    (SELECT COUNT(*) FROM inward_entry_items x WHERE x.inward_entry_id = ie.id) AS lines_count,
    (SELECT COUNT(*) FROM lots l WHERE l.inward_entry_id = ie.id) AS lots_count
  FROM inward_entries ie
  LEFT JOIN purchase_orders po ON po.id = ie.purchase_order_id
  LEFT JOIN suppliers s ON s.id = ie.supplier_id
  LEFT JOIN users u1 ON u1.id = ie.created_by
  LEFT JOIN users u2 ON u2.id = ie.qc_inspected_by
  LEFT JOIN users u3 ON u3.id = ie.posted_by
  LEFT JOIN users u4 ON u4.id = ie.cancelled_by
  LEFT JOIN companies cmp ON cmp.id = ie.company_id
`;

const isSet = (v) => v !== undefined && v !== null && v !== '';

export const inwardEntryRepository = {
  findAll: async (filters = {}) => {
    let query = `${HEADER_SELECT} WHERE ie.deleted_at IS NULL`;
    const params = [];

    if (['draft', 'posted', 'cancelled'].includes(filters.receipt_status)) {
      query += ' AND ie.receipt_status = ?';
      params.push(filters.receipt_status);
    }
    // Legacy QC status filter, kept for the historical inward list.
    if (['pending', 'approved', 'rejected'].includes(filters.status)) {
      query += ' AND ie.status = ?';
      params.push(filters.status);
    }
    if (['legacy_inward', 'grn'].includes(filters.entry_type)) {
      query += ' AND ie.entry_type = ?';
      params.push(filters.entry_type);
    }
    if (isSet(filters.purchase_order_id)) {
      query += ' AND ie.purchase_order_id = ?';
      params.push(Number(filters.purchase_order_id));
    }
    if (isSet(filters.supplier_id)) {
      query += ' AND ie.supplier_id = ?';
      params.push(Number(filters.supplier_id));
    }
    if (isSet(filters.date_from)) {
      query += ' AND ie.inward_date >= ?';
      params.push(filters.date_from);
    }
    if (isSet(filters.date_to)) {
      query += ' AND ie.inward_date <= ?';
      params.push(filters.date_to);
    }
    if (filters.search) {
      query += ` AND (ie.inward_no LIKE ? OR po.po_num LIKE ? OR s.company_name LIKE ? OR ie.challan_no LIKE ?
        OR EXISTS (SELECT 1 FROM lots l2 WHERE l2.inward_entry_id = ie.id AND l2.lot_no LIKE ?))`;
      const term = `%${filters.search}%`;
      params.push(term, term, term, term, term);
    }
    const companyFilter = companyScope.filterSql('ie.company_id', companyScope.parseFilter(filters.company_id));
    query += companyFilter.sql;
    params.push(...companyFilter.params);

    query += ' ORDER BY ie.id DESC';

    const page = parseInt(filters.page, 10) || 1;
    const limit = parseInt(filters.limit, 10) || 15;
    const [[{ total }]] = await pool.query(`SELECT COUNT(*) as total FROM (${query}) as sub`, params);

    query += ' LIMIT ? OFFSET ?';
    params.push(limit, (page - 1) * limit);
    const [rows] = await pool.query(query, params);
    return { rows, total };
  },

  findHeader: async (executor, id) => {
    const [rows] = await executor.query('SELECT * FROM inward_entries WHERE id = ? AND deleted_at IS NULL', [id]);
    return rows[0] || null;
  },

  /** Draft/completed quality inspections on the GRN's lots (block cancelling the GRN). */
  countActiveInspections: async (executor, id) => {
    const [[row]] = await executor.query(
      "SELECT COUNT(*) AS cnt FROM quality_inspections WHERE inward_entry_id = ? AND status IN ('draft', 'completed')",
      [id]
    );
    return row.cnt;
  },

  lockHeader: async (connection, id) => {
    const [rows] = await connection.query('SELECT * FROM inward_entries WHERE id = ? AND deleted_at IS NULL FOR UPDATE', [id]);
    return rows[0] || null;
  },

  /** Header + lines (with PO-line receiving figures) + lots + traceability. */
  findById: async (id) => {
    const [rows] = await pool.query(`${HEADER_SELECT} WHERE ie.id = ? AND ie.deleted_at IS NULL`, [id]);
    if (rows.length === 0) return null;
    const entry = rows[0];

    const [items] = await pool.query(`
      SELECT iei.*, p.name AS product_name, p.item_group_code, poi.design_no,
             COALESCE(poi.ordered_quantity, poi.qty) AS po_ordered_quantity,
             l.id AS lot_id, l.lot_no, l.status AS lot_status,
             (SELECT COALESCE(SUM(qi.inspected_quantity), 0) FROM quality_inspections qi
              WHERE qi.lot_id = l.id AND qi.status IN ('draft', 'completed')) AS qc_claimed_quantity,
             (SELECT COALESCE(SUM(qi.inspected_quantity), 0) FROM quality_inspections qi
              WHERE qi.lot_id = l.id AND qi.status = 'completed') AS qc_inspected_quantity
      FROM inward_entry_items iei
      LEFT JOIN products p ON p.id = iei.product_id
      LEFT JOIN purchase_order_items poi ON poi.id = iei.purchase_order_item_id
      LEFT JOIN lots l ON l.inward_entry_item_id = iei.id
      WHERE iei.inward_entry_id = ?
      ORDER BY iei.sort_order ASC, iei.id ASC
    `, [id]);

    const poLines = await inwardEntryRepository.findPoLines(pool, entry.purchase_order_id);
    const poLineById = Object.fromEntries(poLines.map((l) => [l.id, l]));
    entry.items = items.map((item) => ({
      ...item,
      uom_decimal_places: poLineById[item.purchase_order_item_id]?.uom_decimal_places ?? 0,
      po_received_quantity: poLineById[item.purchase_order_item_id]?.received_quantity ?? 0,
      po_pending_quantity: poLineById[item.purchase_order_item_id]?.pending_quantity ?? 0,
    }));
    entry.trace = await inwardEntryRepository.getPoTrace(entry.purchase_order_id);
    return entry;
  },

  /** Where the PO came from: OC, or plan/requirement/projection (for planning POs). */
  getPoTrace: async (poId) => {
    const [[po]] = await pool.query(`
      SELECT po.id, po.po_num, po.origin, po.status, po.order_confirmation_id, oc.oc_num,
             po.material_plan_id, mp.plan_no
      FROM purchase_orders po
      LEFT JOIN order_confirmations oc ON oc.id = po.order_confirmation_id
      LEFT JOIN material_plans mp ON mp.id = po.material_plan_id
      WHERE po.id = ?
    `, [poId]);
    if (!po) return null;
    const [requirements] = await pool.query(`
      SELECT DISTINCT mr.id AS material_requirement_id, mr.requirement_no, bp.id AS brand_projection_id,
             bp.projection_no, br.name AS brand_name
      FROM purchase_order_items poi
      JOIN material_requirements mr ON mr.id = poi.material_requirement_id
      JOIN brand_projections bp ON bp.id = mr.brand_projection_id
      LEFT JOIN brands br ON br.id = bp.brand_id
      WHERE poi.purchase_order_id = ?
    `, [poId]);
    return { ...po, requirements };
  },

  findPoLines: async (executor, poId) => {
    const [rows] = await executor.query(`${PO_LINE_SELECT} WHERE poi.purchase_order_id = ? ORDER BY poi.sort_order ASC, poi.id ASC`, [poId]);
    return rows;
  },

  lockPo: async (connection, poId) => {
    const [rows] = await connection.query('SELECT * FROM purchase_orders WHERE id = ? AND deleted_at IS NULL FOR UPDATE', [poId]);
    return rows[0] || null;
  },

  /** Row-locks the PO's lines so concurrent receipts of the same quantity serialise. */
  lockPoLines: async (connection, poId) => {
    await connection.query('SELECT id FROM purchase_order_items WHERE purchase_order_id = ? FOR UPDATE', [poId]);
  },

  findSupplier: async (executor, id) => {
    const [rows] = await executor.query('SELECT id, company_id, company_name, deleted_at FROM suppliers WHERE id = ?', [id]);
    return rows[0] || null;
  },

  /** Confirmed POs of a company that still have quantity to receive. */
  findEligiblePos: async (companyId) => {
    const [rows] = await pool.query(`
      SELECT po.id, po.po_num, po.origin, po.po_date, po.status, po.supplier_id,
             s.company_name AS supplier_name, oc.oc_num, mp.plan_no AS material_plan_no,
             SUM(GREATEST(COALESCE(poi.ordered_quantity, poi.qty) - COALESCE(rcv.received_qty, 0) - COALESCE(dd.direct_qty, 0), 0)) AS pending_total,
             COUNT(poi.id) AS lines_count
      FROM purchase_orders po
      JOIN purchase_order_items poi ON poi.purchase_order_id = po.id
      LEFT JOIN (${RECEIVED_BY_PO_LINE}) rcv ON rcv.purchase_order_item_id = poi.id
      LEFT JOIN (${DIRECT_DISPATCHED_BY_PO_LINE}) dd ON dd.purchase_order_item_id = poi.id
      LEFT JOIN suppliers s ON s.id = po.supplier_id
      LEFT JOIN order_confirmations oc ON oc.id = po.order_confirmation_id
      LEFT JOIN material_plans mp ON mp.id = po.material_plan_id
      WHERE po.deleted_at IS NULL AND po.company_id = ? AND po.status IN ('raised', 'partial')
      GROUP BY po.id
      HAVING pending_total > 0
      ORDER BY po.id DESC
    `, [companyId]);
    return rows;
  },

  insertHeader: async (connection, data) => {
    const [result] = await connection.query(`
      INSERT INTO inward_entries (
        company_id, entry_type, inward_no, financial_year, inward_date, purchase_order_id, supplier_id,
        challan_no, challan_date, remarks, receipt_status, status, created_by, updated_by, created_at, updated_at
      ) VALUES (?, 'grn', ?, ?, ?, ?, ?, ?, ?, ?, 'draft', 'pending', ?, ?, NOW(), NOW())
    `, [data.company_id, data.inward_no, data.financial_year, data.inward_date, data.purchase_order_id,
      data.supplier_id, data.challan_no, data.challan_date, data.remarks, data.created_by, data.updated_by]);
    return result.insertId;
  },

  updateHeader: async (connection, id, data) => {
    await connection.query(`
      UPDATE inward_entries SET inward_date = ?, challan_no = ?, challan_date = ?, remarks = ?,
        updated_by = ?, updated_at = NOW()
      WHERE id = ?
    `, [data.inward_date, data.challan_no, data.challan_date, data.remarks, data.updated_by, id]);
  },

  /** Delete-then-recreate — only ever called on a draft GRN (no lots yet). */
  replaceLines: async (connection, id, lines) => {
    await connection.query('DELETE FROM inward_entry_items WHERE inward_entry_id = ?', [id]);
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      await connection.query(`
        INSERT INTO inward_entry_items (
          inward_entry_id, purchase_order_item_id, product_id, sort_order, description, unit,
          ordered_qty, received_qty, passed_qty, rejected_qty, received_quantity, width_inch, supplier_lot_no, remarks
        ) VALUES (?, ?, ?, ?, ?, ?, 0, 0, 0, 0, ?, ?, ?, ?)
      `, [id, l.purchase_order_item_id, l.product_id, i, l.description, l.unit,
        l.received_quantity, l.width_inch, l.supplier_lot_no, l.remarks]);
    }
  },

  findLines: async (executor, id) => {
    const [rows] = await executor.query(
      'SELECT * FROM inward_entry_items WHERE inward_entry_id = ? ORDER BY sort_order ASC, id ASC',
      [id]
    );
    return rows;
  },

  setPosted: async (connection, id, userId) => {
    await connection.query(`
      UPDATE inward_entries SET receipt_status = 'posted', posted_at = NOW(), posted_by = ?, updated_by = ?, updated_at = NOW()
      WHERE id = ?
    `, [userId, userId, id]);
  },

  setCancelled: async (connection, id, userId) => {
    await connection.query(`
      UPDATE inward_entries SET receipt_status = 'cancelled', cancelled_at = NOW(), cancelled_by = ?, updated_by = ?, updated_at = NOW()
      WHERE id = ?
    `, [userId, userId, id]);
  },

  insertLot: async (connection, lot) => {
    const [result] = await connection.query(`
      INSERT INTO lots (
        company_id, lot_no, financial_year, inward_entry_id, inward_entry_item_id, purchase_order_id,
        purchase_order_item_id, supplier_id, product_id, uom_id, unit, quantity, width_inch, supplier_lot_no,
        received_date, status, created_by, updated_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'received', ?, ?, NOW(), NOW())
    `, [lot.company_id, lot.lot_no, lot.financial_year, lot.inward_entry_id, lot.inward_entry_item_id,
      lot.purchase_order_id, lot.purchase_order_item_id, lot.supplier_id, lot.product_id, lot.uom_id, lot.unit,
      lot.quantity, lot.width_inch, lot.supplier_lot_no, lot.received_date, lot.created_by, lot.created_by]);
    return result.insertId;
  },

  cancelLots: async (connection, inwardEntryId, userId) => {
    await connection.query(
      "UPDATE lots SET status = 'cancelled', updated_by = ?, updated_at = NOW() WHERE inward_entry_id = ?",
      [userId, inwardEntryId]
    );
  },

  // -- Legacy QC (old inward entries only; QC for GRNs is Phase 6) --

  updateItemQC: async (connection, itemId, inwardEntryId, passedQty, rejectedQty, qcRemarks) => {
    await connection.query(`
      UPDATE inward_entry_items
      SET passed_qty = ?, rejected_qty = ?, qc_remarks = ?
      WHERE id = ? AND inward_entry_id = ?
    `, [passedQty, rejectedQty, qcRemarks, itemId, inwardEntryId]);
  },

  softDelete: async (connection, id) => {
    await connection.query('UPDATE inward_entries SET deleted_at = NOW() WHERE id = ?', [id]);
  },
};
