/**
 * Report definitions: one authoritative query + filter list per report,
 * used by BOTH the paginated JSON endpoint and the Excel export (see
 * report-runner.js). Every query reads the existing source-of-truth tables
 * and reuses the existing figure queries — nothing is snapshotted and no
 * figure is re-derived here:
 *   PO pending        → inward-entry PO_LINE_SELECT (ordered − received − direct-dispatched)
 *   stock             → inventory BALANCE_SELECT (sum of the immutable ledger)
 *   QC                → the stored inspection quantities
 *   production        → the stored processing quantities
 *   orders            → Phase 10 allocations / Phase 11 posted dispatches + itemFigures()
 *   barcode history   → Phase 13 SCAN_SELECT
 *
 * base: SELECT … FROM … WHERE <always-true or fixed conditions> (the runner appends filters).
 * company: the company column the runner filters on (always, server-side).
 * columns: report columns, in export order. type: text | number | date | datetime.
 * filters: { name, label, kind: id | enum | like, column, values?, options? }.
 */
import { PO_LINE_SELECT } from '../inward-entry/inward-entry.repository.js';
import { BALANCE_SELECT } from '../inventory/inventory.repository.js';
import { SCAN_SELECT } from '../barcode/barcode.repository.js';
import { ACTIVE_ALLOCATED_BY_ITEM, DISPATCHED_BY_ITEM } from '../order-confirmation/order-fulfilment.repository.js';
import { itemFigures } from '../order-confirmation/order-fulfilment.service.js';

// Legacy rows with no company are labelled, so every row states its company.
const COMPANY_COLUMNS = `COALESCE(cmp.code, 'Unassigned') AS company_code, COALESCE(cmp.short_name, cmp.name, 'Unassigned') AS company_label`;
const company = { key: 'company_code', label: 'Company', type: 'text' };

// Shared filter shapes (each report lists only the ones that make sense for it).
const supplier = (column) => ({ name: 'supplier_id', label: 'Supplier', kind: 'id', column, options: 'suppliers' });
const product = (column) => ({ name: 'product_id', label: 'Material / product', kind: 'id', column, options: 'products' });
const materialType = (column) => ({ name: 'material_type_id', label: 'Material type', kind: 'id', column, options: 'material_types' });
const lot = (column) => ({ name: 'lot', label: 'Lot No.', kind: 'like', column });
const location = (column) => ({ name: 'location_id', label: 'Location', kind: 'id', column, options: 'locations' });
const enumFilter = (name, label, column, values) => ({ name, label, kind: 'enum', column, values });

export const REPORTS = [
  {
    key: 'purchase-orders',
    title: 'Purchase Orders',
    permission: 'purchase-order.view',
    company: 'po.company_id',
    base: `
      SELECT po.id AS purchase_order_id, pl.id AS purchase_order_item_id, po.company_id, ${COMPANY_COLUMNS},
             po.po_num, po.po_date, s.company_name AS supplier_name, po.origin, po.status,
             COALESCE(pl.product_name, pl.description) AS product_name, pl.item_group_code, pl.unit, pl.uom_decimal_places,
             pl.ordered_quantity, pl.received_quantity, pl.direct_dispatched_quantity, pl.pending_quantity,
             br.name AS brand_name
      FROM (${PO_LINE_SELECT}) pl
      JOIN purchase_orders po ON po.id = pl.purchase_order_id
      LEFT JOIN companies cmp ON cmp.id = po.company_id
      LEFT JOIN suppliers s ON s.id = po.supplier_id
      LEFT JOIN products p ON p.id = pl.product_id
      LEFT JOIN material_requirements mrq ON mrq.id = pl.material_requirement_id
      LEFT JOIN brand_projections bpj ON bpj.id = mrq.brand_projection_id
      LEFT JOIN brands br ON br.id = bpj.brand_id
      WHERE po.deleted_at IS NULL`,
    orderBy: 'po.po_date DESC, po.id DESC, pl.sort_order, pl.id',
    date: { column: 'po.po_date', type: 'date' },
    search: ['po.po_num', 's.company_name', 'pl.product_name', 'pl.item_group_code'],
    filters: [
      enumFilter('status', 'Status', 'po.status', ['draft', 'raised', 'partial', 'received', 'cancelled']),
      enumFilter('origin', 'Origin', 'po.origin', ['order_confirmation', 'material_requirement', 'material_plan']),
      supplier('po.supplier_id'),
      { name: 'brand_id', label: 'Brand', kind: 'id', column: 'bpj.brand_id', options: 'brands' },
      product('pl.product_id'),
      materialType('p.material_type_id'),
    ],
    columns: [
      company,
      { key: 'po_num', label: 'PO No.', type: 'text' },
      { key: 'po_date', label: 'PO Date', type: 'date' },
      { key: 'supplier_name', label: 'Supplier', type: 'text' },
      { key: 'origin', label: 'Origin', type: 'text' },
      { key: 'status', label: 'Status', type: 'text' },
      { key: 'brand_name', label: 'Brand', type: 'text' },
      { key: 'product_name', label: 'Material', type: 'text' },
      { key: 'item_group_code', label: 'Item Code', type: 'text' },
      { key: 'unit', label: 'UOM', type: 'text' },
      { key: 'ordered_quantity', label: 'Ordered', type: 'number' },
      { key: 'received_quantity', label: 'Received (GRN)', type: 'number' },
      { key: 'direct_dispatched_quantity', label: 'Direct-dispatched', type: 'number' },
      { key: 'pending_quantity', label: 'Pending', type: 'number' },
    ],
  },
  {
    key: 'grns',
    title: 'Goods Receipts (GRN)',
    permission: 'inward-entry.view',
    company: 'ie.company_id',
    base: `
      SELECT ie.id AS inward_entry_id, iei.id AS inward_entry_item_id, ie.company_id, ${COMPANY_COLUMNS},
             ie.inward_no, ie.inward_date, ie.challan_no, po.po_num, s.company_name AS supplier_name,
             COALESCE(p.name, iei.description) AS product_name, p.item_group_code,
             COALESCE(l.unit, u.code, iei.unit) AS unit, COALESCE(u.decimal_places, 0) AS uom_decimal_places,
             COALESCE(iei.received_quantity, iei.received_qty) AS received_quantity, iei.width_inch, iei.supplier_lot_no,
             l.id AS lot_id, l.lot_no, ie.receipt_status, ie.entry_type
      FROM inward_entry_items iei
      JOIN inward_entries ie ON ie.id = iei.inward_entry_id
      LEFT JOIN companies cmp ON cmp.id = ie.company_id
      LEFT JOIN purchase_orders po ON po.id = ie.purchase_order_id
      LEFT JOIN suppliers s ON s.id = ie.supplier_id
      LEFT JOIN products p ON p.id = iei.product_id
      LEFT JOIN lots l ON l.inward_entry_item_id = iei.id
      LEFT JOIN uoms u ON u.id = COALESCE(l.uom_id, p.uom_id)
      WHERE ie.deleted_at IS NULL`,
    orderBy: 'ie.inward_date DESC, ie.id DESC, iei.sort_order, iei.id',
    date: { column: 'ie.inward_date', type: 'date' },
    search: ['ie.inward_no', 'ie.challan_no', 'po.po_num', 's.company_name', 'p.name', 'l.lot_no', 'iei.supplier_lot_no'],
    filters: [
      enumFilter('status', 'Status', 'ie.receipt_status', ['draft', 'posted', 'cancelled']),
      supplier('ie.supplier_id'),
      product('iei.product_id'),
      materialType('p.material_type_id'),
      lot('l.lot_no'),
    ],
    columns: [
      company,
      { key: 'inward_no', label: 'GRN No.', type: 'text' },
      { key: 'inward_date', label: 'GRN Date', type: 'date' },
      { key: 'challan_no', label: 'Challan / Bill No.', type: 'text' },
      { key: 'po_num', label: 'PO No.', type: 'text' },
      { key: 'supplier_name', label: 'Supplier', type: 'text' },
      { key: 'product_name', label: 'Material', type: 'text' },
      { key: 'unit', label: 'UOM', type: 'text' },
      { key: 'received_quantity', label: 'Received', type: 'number' },
      { key: 'width_inch', label: 'Width (inch)', type: 'number' },
      { key: 'supplier_lot_no', label: 'Mill Lot No.', type: 'text' },
      { key: 'lot_no', label: 'Lot No.', type: 'text' },
      { key: 'receipt_status', label: 'Status', type: 'text' },
    ],
  },
  {
    key: 'stock',
    title: 'Lot Stock',
    permission: 'stock.view',
    company: 'sb.company_id',
    base: `SELECT sb.* FROM (${BALANCE_SELECT}) sb WHERE 1 = 1`,
    orderBy: 'sb.company_id, sb.location_code, sb.lot_no, sb.lot_id',
    date: { column: 'sb.last_movement_date', type: 'date', label: 'Last movement' },
    search: ['sb.lot_no', 'sb.product_name', 'sb.supplier_name', 'sb.inward_no', 'sb.lot_processing_no', 'sb.location_code'],
    filters: [
      enumFilter('stock_status', 'Stock', 'sb.stock_status', ['available', 'nil']),
      enumFilter('source_type', 'Source', 'sb.lot_source_type', ['grn', 'production']),
      location('sb.location_id'),
      supplier('sb.supplier_id'),
      product('sb.product_id'),
      materialType('sb.material_type_id'),
      lot('sb.lot_no'),
    ],
    columns: [
      company,
      { key: 'lot_no', label: 'Lot No.', type: 'text' },
      { key: 'lot_source_type', label: 'Source', type: 'text' },
      { key: 'product_name', label: 'Material', type: 'text' },
      { key: 'material_type_name', label: 'Material Type', type: 'text' },
      { key: 'unit', label: 'UOM', type: 'text' },
      { key: 'width_inch', label: 'Width (inch)', type: 'number' },
      { key: 'location_code', label: 'Location', type: 'text' },
      { key: 'quantity', label: 'Current Stock', type: 'number' },
      { key: 'supplier_name', label: 'Supplier', type: 'text' },
      { key: 'source_document', label: 'Source Document', type: 'text' },
      { key: 'last_movement_date', label: 'Last Movement', type: 'date' },
    ],
    mapRow: (r) => ({ ...r, source_document: r.inward_no || r.lot_processing_no || null }),
  },
  {
    key: 'qc',
    title: 'QC / Rejections',
    permission: 'inward-entry.view',
    company: 'qi.company_id',
    base: `
      SELECT qi.id AS quality_inspection_id, qi.company_id, ${COMPANY_COLUMNS}, qi.qc_no, qi.inspection_date,
             l.lot_no, ie.inward_no, po.po_num, s.company_name AS supplier_name, p.name AS product_name,
             COALESCE(u.code, qi.unit) AS unit, COALESCE(u.decimal_places, 0) AS uom_decimal_places,
             qi.inspected_quantity, qi.accepted_quantity, qi.rejected_quantity, qi.status, qi.result
      FROM quality_inspections qi
      LEFT JOIN companies cmp ON cmp.id = qi.company_id
      LEFT JOIN lots l ON l.id = qi.lot_id
      LEFT JOIN inward_entries ie ON ie.id = qi.inward_entry_id
      LEFT JOIN purchase_orders po ON po.id = qi.purchase_order_id
      LEFT JOIN suppliers s ON s.id = qi.supplier_id
      LEFT JOIN products p ON p.id = qi.product_id
      LEFT JOIN uoms u ON u.id = qi.uom_id
      WHERE 1 = 1`,
    orderBy: 'qi.inspection_date DESC, qi.id DESC',
    date: { column: 'qi.inspection_date', type: 'date' },
    search: ['qi.qc_no', 'l.lot_no', 'ie.inward_no', 'po.po_num', 's.company_name', 'p.name'],
    filters: [
      enumFilter('status', 'Status', 'qi.status', ['draft', 'completed', 'cancelled']),
      enumFilter('result', 'Result', 'qi.result', ['accepted', 'partially_accepted', 'rejected']),
      supplier('qi.supplier_id'),
      product('qi.product_id'),
      materialType('p.material_type_id'),
      lot('l.lot_no'),
    ],
    columns: [
      company,
      { key: 'qc_no', label: 'QC No.', type: 'text' },
      { key: 'inspection_date', label: 'Inspection Date', type: 'date' },
      { key: 'lot_no', label: 'Lot No.', type: 'text' },
      { key: 'inward_no', label: 'GRN No.', type: 'text' },
      { key: 'po_num', label: 'PO No.', type: 'text' },
      { key: 'supplier_name', label: 'Supplier', type: 'text' },
      { key: 'product_name', label: 'Material', type: 'text' },
      { key: 'unit', label: 'UOM', type: 'text' },
      { key: 'inspected_quantity', label: 'Inspected', type: 'number' },
      { key: 'accepted_quantity', label: 'Accepted', type: 'number' },
      { key: 'rejected_quantity', label: 'Rejected', type: 'number' },
      { key: 'status', label: 'Status', type: 'text' },
      { key: 'result', label: 'Result', type: 'text' },
    ],
  },
  {
    key: 'production',
    title: 'Production / Processing',
    permission: 'processing.view',
    company: 'pr.company_id',
    base: `
      SELECT pr.id AS processing_record_id, pri.id AS processing_record_item_id, pr.company_id, ${COMPANY_COLUMNS},
             pr.processing_no, pr.start_date, pr.completion_date, mi.issue_no, mi.job_reference,
             sl.lot_no AS source_lot_no, p.name AS product_name, COALESCE(u.code, pri.unit) AS unit,
             COALESCE(u.decimal_places, 0) AS uom_decimal_places,
             pri.issued_quantity, pri.consumed_quantity, pri.wastage_quantity, pri.balance_quantity,
             pp.name AS produced_product_name, pr.produced_quantity, pr.produced_unit, ol.lot_no AS output_lot_no, pr.status,
             CASE WHEN pr.output_posted_at IS NULL THEN 'no' ELSE 'yes' END AS output_posted
      FROM processing_record_items pri
      JOIN processing_records pr ON pr.id = pri.processing_record_id
      JOIN material_issues mi ON mi.id = pr.material_issue_id
      LEFT JOIN companies cmp ON cmp.id = pr.company_id
      LEFT JOIN lots sl ON sl.id = pri.lot_id
      LEFT JOIN products p ON p.id = pri.product_id
      LEFT JOIN uoms u ON u.id = pri.uom_id
      LEFT JOIN products pp ON pp.id = pr.produced_product_id
      LEFT JOIN lots ol ON ol.processing_record_id = pr.id
      WHERE 1 = 1`,
    orderBy: 'pr.start_date DESC, pr.id DESC, pri.id',
    date: { column: 'pr.start_date', type: 'date', label: 'Start date' },
    search: ['pr.processing_no', 'mi.issue_no', 'mi.job_reference', 'sl.lot_no', 'p.name', 'pp.name', 'ol.lot_no'],
    filters: [
      enumFilter('status', 'Status', 'pr.status', ['in_process', 'completed']),
      product('pri.product_id'),
      materialType('p.material_type_id'),
      lot('sl.lot_no'),
    ],
    columns: [
      company,
      { key: 'processing_no', label: 'Processing No.', type: 'text' },
      { key: 'start_date', label: 'Start Date', type: 'date' },
      { key: 'completion_date', label: 'Completion Date', type: 'date' },
      { key: 'issue_no', label: 'Material Issue', type: 'text' },
      { key: 'job_reference', label: 'Job Reference', type: 'text' },
      { key: 'source_lot_no', label: 'Source Lot', type: 'text' },
      { key: 'product_name', label: 'Material', type: 'text' },
      { key: 'unit', label: 'UOM', type: 'text' },
      { key: 'issued_quantity', label: 'Issued', type: 'number' },
      { key: 'consumed_quantity', label: 'Consumed', type: 'number' },
      { key: 'wastage_quantity', label: 'Wastage', type: 'number' },
      { key: 'balance_quantity', label: 'Balance', type: 'number' },
      { key: 'produced_product_name', label: 'Produced Product', type: 'text' },
      { key: 'produced_quantity', label: 'Produced (whole processing)', type: 'number' },
      { key: 'produced_unit', label: 'Produced UOM', type: 'text' },
      { key: 'output_lot_no', label: 'Finished Lot', type: 'text' },
      { key: 'status', label: 'Status', type: 'text' },
      { key: 'output_posted', label: 'Output Posted', type: 'text' },
    ],
  },
  {
    key: 'orders',
    title: 'Orders / Dispatch',
    permission: 'order-confirmation.view',
    company: 'oc.company_id',
    base: `
      SELECT oc.id AS order_confirmation_id, oci.id AS order_confirmation_item_id, oc.company_id, ${COMPANY_COLUMNS},
             oc.oc_num, oc.oc_date, b.company_name AS buyer_name, br.name AS brand_name,
             COALESCE(p.name, oci.design_no, oci.description) AS product_name, oci.design_no,
             COALESCE(pu.code, oci.unit) AS unit, COALESCE(pu.decimal_places, 0) AS uom_decimal_places,
             oci.qty AS ordered_quantity, COALESCE(al.allocated, 0) AS produced_quantity, COALESCE(dsp.dispatched, 0) AS dispatched,
             oc.status
      FROM order_confirmation_items oci
      JOIN order_confirmations oc ON oc.id = oci.order_confirmation_id
      LEFT JOIN companies cmp ON cmp.id = oc.company_id
      LEFT JOIN buyers b ON b.id = oc.buyer_id
      LEFT JOIN brands br ON br.id = oc.brand_id
      LEFT JOIN products p ON p.id = oci.product_id
      LEFT JOIN uoms pu ON pu.id = p.uom_id
      LEFT JOIN (${ACTIVE_ALLOCATED_BY_ITEM}) al ON al.order_confirmation_item_id = oci.id
      LEFT JOIN (${DISPATCHED_BY_ITEM}) dsp ON dsp.order_confirmation_item_id = oci.id
      WHERE oc.deleted_at IS NULL`,
    orderBy: 'oc.oc_date DESC, oc.id DESC, oci.sort_order, oci.id',
    date: { column: 'oc.oc_date', type: 'date' },
    search: ['oc.oc_num', 'oc.buyer_ref', 'b.company_name', 'p.name', 'oci.design_no', 'oci.description'],
    filters: [
      enumFilter('status', 'Order status', 'oc.status', ['draft', 'sent', 'confirmed', 'cancelled']),
      { name: 'buyer_id', label: 'Customer', kind: 'id', column: 'oc.buyer_id', options: 'buyers' },
      { name: 'brand_id', label: 'Brand', kind: 'id', column: 'oc.brand_id', options: 'brands' },
      product('oci.product_id'),
      materialType('p.material_type_id'),
    ],
    columns: [
      company,
      { key: 'oc_num', label: 'Order No.', type: 'text' },
      { key: 'oc_date', label: 'Order Date', type: 'date' },
      { key: 'buyer_name', label: 'Customer', type: 'text' },
      { key: 'brand_name', label: 'Brand', type: 'text' },
      { key: 'product_name', label: 'Product', type: 'text' },
      { key: 'unit', label: 'UOM', type: 'text' },
      { key: 'ordered_quantity', label: 'Ordered', type: 'number' },
      { key: 'produced_quantity', label: 'Produced (allocated)', type: 'number' },
      { key: 'dispatched_quantity', label: 'Dispatched', type: 'number' },
      { key: 'pending_quantity', label: 'Pending', type: 'number' },
      { key: 'status', label: 'Order Status', type: 'text' },
      { key: 'fulfilment_status', label: 'Line Fulfilment', type: 'text' },
    ],
    // The Phase 10 per-line figures (pending = ordered − dispatched, fulfilment status), unchanged.
    mapRow: (r) => itemFigures(r, r.dispatched),
  },
  {
    key: 'barcodes',
    title: 'Barcode Scan History',
    permission: 'barcode.view',
    company: 'bs.company_id',
    base: `${SCAN_SELECT} WHERE 1 = 1`,
    orderBy: 'bs.id DESC',
    date: { column: 'bs.scanned_at', type: 'datetime', label: 'Scanned' },
    search: ['bs.barcode_value', 'l.lot_no', 'us.name', 'p.name'],
    filters: [
      enumFilter('context', 'Context', 'bs.context', ['lookup', 'material_issue', 'dispatch']),
      enumFilter('result', 'Result', 'bs.result', ['found', 'not_found', 'retired']),
      enumFilter('duplicate', 'Duplicate', 'bs.is_duplicate', ['1', '0']),
      location('bs.location_id'),
      lot('l.lot_no'),
    ],
    columns: [
      company,
      { key: 'scanned_at', label: 'Scanned At', type: 'datetime' },
      { key: 'barcode_value', label: 'Barcode', type: 'text' },
      { key: 'lot_no', label: 'Lot No.', type: 'text' },
      { key: 'product_name', label: 'Material', type: 'text' },
      { key: 'context', label: 'Context', type: 'text' },
      { key: 'location_code', label: 'Location', type: 'text' },
      { key: 'result', label: 'Result', type: 'text' },
      { key: 'duplicate', label: 'Duplicate', type: 'text' },
      { key: 'previous_scanned_at', label: 'Previous Scan', type: 'datetime' },
      { key: 'previous_scanned_by_name', label: 'Previous Scan By', type: 'text' },
      { key: 'scanned_by_name', label: 'User', type: 'text' },
    ],
    mapRow: (r) => ({ ...r, duplicate: r.is_duplicate ? 'yes' : 'no' }),
  },
];

export const findReport = (key) => REPORTS.find((r) => r.key === key) || null;
