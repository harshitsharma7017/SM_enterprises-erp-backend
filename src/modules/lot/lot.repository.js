import { pool } from '../../config/database.js';
import { companyScope } from '../../services/company-scope.service.js';
import { QC_TOTALS_BY_LOT, RETURN_TOTALS_BY_LOT } from '../quality-control/qc-ledger.js';
import { STOCK_BY_LOT } from '../inventory/stock-ledger.js';

const isSet = (v) => v !== undefined && v !== null && v !== '';

const SELECT = `
  SELECT l.*, p.name AS product_name, p.item_group_code, s.company_name AS supplier_name,
         po.po_num, po.origin AS purchase_order_origin, ie.inward_no, ie.receipt_status,
         u.code AS uom_code, COALESCE(u.decimal_places, 0) AS uom_decimal_places,
         cmp.code AS company_code, COALESCE(cmp.short_name, cmp.name) AS company_label,
         lpr.processing_no, lpr.material_issue_id AS production_material_issue_id,
         COALESCE(qt.claimed_quantity, 0) AS qc_claimed_quantity,
         COALESCE(qt.inspected_quantity, 0) AS qc_inspected_quantity,
         COALESCE(qt.accepted_quantity, 0) AS qc_accepted_quantity,
         COALESCE(qt.rejected_quantity, 0) AS qc_rejected_quantity,
         COALESCE(rt.returned_quantity, 0) AS returned_quantity,
         COALESCE(st.stock_quantity, 0) AS stock_quantity,
         COALESCE(st.stock_received_quantity, 0) AS stock_received_quantity,
         COALESCE(st.stock_issued_quantity, 0) AS stock_issued_quantity,
         CASE WHEN COALESCE(qt.inspected_quantity, 0) = 0 THEN 'not_inspected'
              WHEN qt.inspected_quantity < l.quantity THEN 'partially_inspected'
              ELSE 'inspected' END AS qc_state
  FROM lots l
  LEFT JOIN products p ON p.id = l.product_id
  LEFT JOIN suppliers s ON s.id = l.supplier_id
  LEFT JOIN purchase_orders po ON po.id = l.purchase_order_id
  LEFT JOIN inward_entries ie ON ie.id = l.inward_entry_id
  LEFT JOIN uoms u ON u.id = l.uom_id
  LEFT JOIN companies cmp ON cmp.id = l.company_id
  LEFT JOIN processing_records lpr ON lpr.id = l.processing_record_id
  LEFT JOIN (${QC_TOTALS_BY_LOT}) qt ON qt.lot_id = l.id
  LEFT JOIN (${RETURN_TOTALS_BY_LOT}) rt ON rt.lot_id = l.id
  LEFT JOIN (${STOCK_BY_LOT}) st ON st.lot_id = l.id
`;

/** Lot → GRN → PO → (OC) or (plan → requirement → projection). */
export const findLotTrace = async (lotId) => {
  const [[trace]] = await pool.query(`
    SELECT ie.inward_date, ie.challan_no, po.po_date, po.status AS purchase_order_status,
           po.order_confirmation_id, oc.oc_num,
           poi.material_requirement_id, mr.requirement_no,
           mpi.material_plan_id, mp.plan_no,
           mr.brand_projection_id, bp.projection_no, br.name AS brand_name
    FROM lots l
    JOIN inward_entries ie ON ie.id = l.inward_entry_id
    JOIN purchase_orders po ON po.id = l.purchase_order_id
    JOIN purchase_order_items poi ON poi.id = l.purchase_order_item_id
    LEFT JOIN order_confirmations oc ON oc.id = po.order_confirmation_id
    LEFT JOIN material_requirements mr ON mr.id = poi.material_requirement_id
    LEFT JOIN material_plan_items mpi ON mpi.id = poi.material_plan_item_id
    LEFT JOIN material_plans mp ON mp.id = mpi.material_plan_id
    LEFT JOIN brand_projections bp ON bp.id = mr.brand_projection_id
    LEFT JOIN brands br ON br.id = bp.brand_id
    WHERE l.id = ?
  `, [lotId]);
  return trace || null;
};

/**
 * Where a finished-material (production) lot came from: processing record →
 * material issue → the issued source lots, each with its own lot trace
 * (GRN → PO → supplier → OC or plan/requirement/projection).
 */
export const findProductionSource = async (processingRecordId) => {
  const [[record]] = await pool.query(`
    SELECT pr.id AS processing_record_id, pr.processing_no, pr.status, pr.start_date, pr.completion_date,
           pr.produced_quantity, pr.produced_unit, mi.id AS material_issue_id, mi.issue_no, mi.issue_date, mi.job_reference
    FROM processing_records pr JOIN material_issues mi ON mi.id = pr.material_issue_id
    WHERE pr.id = ?`, [processingRecordId]);
  if (!record) return null;
  const [sources] = await pool.query(`
    SELECT pri.lot_id, pri.issued_quantity, pri.consumed_quantity, pri.unit, l.lot_no, l.width_inch, l.supplier_lot_no,
           l.inward_entry_id, l.purchase_order_id, ie.inward_no, po.po_num, po.origin AS purchase_order_origin,
           s.company_name AS supplier_name, p.name AS product_name, p.item_group_code,
           COALESCE(u.decimal_places, 0) AS uom_decimal_places,
           sm.id AS issue_movement_id, sm.movement_no AS issue_movement_no
    FROM processing_record_items pri
    JOIN lots l ON l.id = pri.lot_id
    LEFT JOIN inward_entries ie ON ie.id = l.inward_entry_id
    LEFT JOIN purchase_orders po ON po.id = l.purchase_order_id
    LEFT JOIN suppliers s ON s.id = l.supplier_id
    LEFT JOIN products p ON p.id = pri.product_id
    LEFT JOIN uoms u ON u.id = pri.uom_id
    LEFT JOIN stock_movements sm ON sm.material_issue_item_id = pri.material_issue_item_id AND sm.movement_type = 'MATERIAL_ISSUE'
    WHERE pri.processing_record_id = ?
    ORDER BY pri.id`, [processingRecordId]);
  record.sources = await Promise.all(sources.map(async (s) => ({ ...s, trace: await findLotTrace(s.lot_id) })));
  return record;
};

/** Orders a finished lot / processing record's output is allocated to (active and cancelled, newest last). */
export const findOrderAllocations = async (column, id) => {
  const [rows] = await pool.query(`
    SELECT a.id, a.quantity, a.unit, a.status, a.created_at, a.lot_id, l.lot_no,
           oc.id AS order_confirmation_id, oc.oc_num, oc.status AS order_status,
           b.company_name AS buyer_name, oci.design_no, oci.description AS item_description, oci.qty AS item_ordered_quantity
    FROM order_item_production_allocations a
    JOIN lots l ON l.id = a.lot_id
    JOIN order_confirmations oc ON oc.id = a.order_confirmation_id
    JOIN order_confirmation_items oci ON oci.id = a.order_confirmation_item_id
    LEFT JOIN buyers b ON b.id = oc.buyer_id
    WHERE a.${column} = ?
    ORDER BY a.id`, [id]);
  return rows;
};

export const lotRepository = {
  findAll: async ({ search, status, source_type, company_id, product_id, purchase_order_id, inward_entry_id, page = 1, limit = 15 }) => {
    let query = `${SELECT} WHERE 1 = 1`;
    const params = [];
    if (search) {
      query += ' AND (l.lot_no LIKE ? OR l.supplier_lot_no LIKE ? OR p.name LIKE ? OR po.po_num LIKE ? OR ie.inward_no LIKE ? OR lpr.processing_no LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term, term, term, term);
    }
    if (source_type === 'grn' || source_type === 'production') {
      query += ' AND l.source_type = ?';
      params.push(source_type);
    }
    if (status === 'received' || status === 'cancelled') {
      query += ' AND l.status = ?';
      params.push(status);
    }
    for (const [column, value] of [['l.product_id', product_id], ['l.purchase_order_id', purchase_order_id], ['l.inward_entry_id', inward_entry_id]]) {
      if (isSet(value)) {
        query += ` AND ${column} = ?`;
        params.push(Number(value));
      }
    }
    const companyFilter = companyScope.filterSql('l.company_id', companyScope.parseFilter(company_id));
    query += companyFilter.sql;
    params.push(...companyFilter.params);
    query += ' ORDER BY l.id DESC';

    const [[{ total }]] = await pool.query(`SELECT COUNT(*) as total FROM (${query}) as t`, params);
    const safeLimit = Number(limit) > 0 ? Math.min(Number(limit), 500) : 15;
    const safePage = Number(page) > 0 ? Number(page) : 1;
    query += ' LIMIT ? OFFSET ?';
    params.push(safeLimit, (safePage - 1) * safeLimit);
    const [rows] = await pool.query(query, params);
    return { data: rows, total, page: safePage, limit: safeLimit };
  },

  /** Lot + its trace (GRN → PO → OC or plan → requirement → projection) + its inspections. */
  findById: async (id) => {
    const [rows] = await pool.query(`${SELECT} WHERE l.id = ?`, [id]);
    if (rows.length === 0) return null;
    const lot = rows[0];
    lot.trace = await findLotTrace(lot.id);
    const [inspections] = await pool.query(`
      SELECT qi.id, qi.qc_no, qi.inspection_date, qi.inspected_quantity, qi.accepted_quantity,
             qi.rejected_quantity, qi.status, qi.result,
             (SELECT sm.movement_no FROM stock_movements sm
              WHERE sm.quality_inspection_id = qi.id AND sm.movement_type = 'QC_ACCEPTED_RECEIPT') AS stock_movement_no,
             COALESCE((SELECT SUM(sr.quantity) FROM supplier_returns sr
                       WHERE sr.quality_inspection_id = qi.id AND sr.status = 'posted'), 0) AS returned_quantity
      FROM quality_inspections qi WHERE qi.lot_id = ? ORDER BY qi.id
    `, [id]);
    lot.inspections = inspections;
    const [issues] = await pool.query(`
      SELECT mii.id AS material_issue_item_id, mi.id AS material_issue_id, mi.issue_no, mi.issue_date, mi.status,
             mi.job_reference, mii.quantity, pr.id AS processing_record_id, pr.processing_no, pr.status AS processing_status
      FROM material_issue_items mii
      JOIN material_issues mi ON mi.id = mii.material_issue_id
      LEFT JOIN processing_records pr ON pr.material_issue_id = mi.id
      WHERE mii.lot_id = ? AND mi.status <> 'cancelled'
      ORDER BY mi.id
    `, [id]);
    lot.material_issues = issues;
    lot.production = lot.processing_record_id ? await findProductionSource(lot.processing_record_id) : null;
    lot.order_allocations = lot.source_type === 'production' ? await findOrderAllocations('lot_id', lot.id) : [];
    return lot;
  },
};
