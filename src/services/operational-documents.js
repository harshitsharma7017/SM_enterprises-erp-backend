/**
 * One builder per operational document. Each loads the record through the
 * module's own findById (the same data its detail screen shows) and lays it
 * out with operationalDocument.render. Returns null when the record does not
 * exist. Quantities print at the UOM's precision; nothing is recalculated.
 */
import { pool } from '../config/database.js';
import { operationalDocument as doc, qty, money, day } from './operational-document.service.js';
import { purchaseOrderRepository } from '../modules/purchase-order/purchase-order.repository.js';
import { inwardEntryRepository } from '../modules/inward-entry/inward-entry.repository.js';
import { qualityControlRepository } from '../modules/quality-control/quality-control.repository.js';
import { supplierReturnRepository } from '../modules/supplier-return/supplier-return.repository.js';
import { debitNoteRepository } from '../modules/debit-note/debit-note.repository.js';
import { materialIssueRepository } from '../modules/production/material-issue.repository.js';
import { processingRepository } from '../modules/production/processing.repository.js';

/** Header mark for anything that is not the final, posted state. */
const markFor = (status, finalStates) => {
  if (!status || finalStates.includes(status)) return null;
  if (status === 'cancelled') return 'CANCELLED';
  return `${String(status).replace(/_/g, ' ').toUpperCase()} - NOT FINAL`;
};
const width = (w) => (w === null || w === undefined || w === '' ? '' : `${Number(w)}"`);
const lotRef = (l) => [l.lot_no, l.width_inch ? `width ${width(l.width_inch)}` : null, l.supplier_lot_no ? `mill lot ${l.supplier_lot_no}` : null].filter(Boolean).join(', ');

/** Product name + UOM precision for PO lines (the PO line only carries the product id). */
const productsById = async (ids) => {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return {};
  const [rows] = await pool.query(
    `SELECT p.id, p.name, p.item_group_code, u.code AS uom_code, COALESCE(u.decimal_places, 0) AS decimals
     FROM products p LEFT JOIN uoms u ON u.id = p.uom_id WHERE p.id IN (?)`,
    [unique]
  );
  return Object.fromEntries(rows.map((r) => [r.id, r]));
};

const colourSummary = (colours) => (colours || [])
  .map((c) => `${c.colour || '-'}: ${(c.sizes || []).map((s) => `${s.size || '-'} x ${s.qty}`).join(', ')}`)
  .join('; ');

export const operationalDocuments = {
  purchaseOrder: async (id) => {
    const po = await purchaseOrderRepository.findById(id);
    if (!po) return null;
    const products = await productsById((po.items || []).map((i) => i.product_id));
    let total = 0;
    let priced = 0;
    const rows = (po.items || []).map((item, i) => {
      const p = products[item.product_id] || {};
      const ordered = item.ordered_quantity ?? item.qty;
      const amount = item.cost_price !== null && item.cost_price !== undefined ? Number(ordered) * Number(item.cost_price) : null;
      if (amount !== null) { total += Math.round(amount * 100); priced += 1; }
      return {
        cells: [i + 1, p.name || item.design_no || item.description, qty(ordered, p.decimals), item.unit || p.uom_code, money(item.cost_price), money(amount), qty(item.received_quantity, p.decimals), qty(item.pending_quantity, p.decimals)],
        detail: [item.design_no && item.design_no !== p.name ? `Design: ${item.design_no}` : null, item.description, colourSummary(item.colours) || null,
          item.brand_spec?.summary ? `Brand spec - ${item.brand_spec.summary}` : null,
          Number(item.direct_dispatched_quantity) > 0 ? `Direct-dispatched by supplier: ${qty(item.direct_dispatched_quantity, p.decimals)}` : null, item.remarks].filter(Boolean).join('  |  '),
      };
    });
    return {
      filename: doc.filename(po.po_num),
      buffer: doc.render({
        title: 'PURCHASE ORDER',
        number: po.po_num,
        mark: markFor(po.status, ['raised', 'partial', 'received']),
        company: await doc.company(po.company_id),
        party: { label: 'Supplier', ...(await doc.supplier(po.supplier_id)) },
        fields: [
          ['PO date', day(po.po_date)],
          ['Dispatch by', po.dispatch_date ? day(po.dispatch_date) : null],
          ['Order (contract)', po.oc_num],
          ['Material plan', po.material_plan_no],
          ['Status', po.status],
          ['Confirmed', po.confirmed_at ? `${day(po.confirmed_at)}${po.confirmer_name ? ` by ${po.confirmer_name}` : ''}` : null],
        ],
        columns: [
          { label: '#', width: 3 }, { label: 'Item', width: 30 }, { label: 'Ordered', width: 11, right: true }, { label: 'Unit', width: 5 },
          { label: 'Rate', width: 9, right: true }, { label: 'Amount', width: 11, right: true }, { label: 'Received', width: 10, right: true }, { label: 'Pending', width: 10, right: true },
        ],
        rows,
        summary: [['Total of priced lines', priced ? (total / 100).toFixed(2) : null]],
        footer: [['Delivery', po.delivery_details], ['Packing', po.packing_details], ['Remarks', po.remarks]],
        notes: ['Amount = ordered quantity x rate. No tax, discount or freight is calculated by the ERP.', 'Pending = ordered - received - direct-dispatched by the supplier.'],
        signatures: ['Prepared by', 'Authorised signatory'],
      }),
    };
  },

  grn: async (id) => {
    const grn = await inwardEntryRepository.findById(id);
    if (!grn) return null;
    return {
      filename: doc.filename(grn.inward_no),
      buffer: doc.render({
        title: grn.entry_type === 'grn' ? 'GOODS RECEIPT NOTE' : 'INWARD ENTRY',
        number: grn.inward_no,
        mark: markFor(grn.receipt_status, ['posted']),
        company: await doc.company(grn.company_id),
        party: { label: 'Supplier', ...(await doc.supplier(grn.supplier_id)) },
        fields: [
          ['GRN date', day(grn.inward_date)],
          ['Purchase order', grn.purchase_order_num],
          ['Challan / bill no.', grn.challan_no],
          ['Challan date', grn.challan_date ? day(grn.challan_date) : null],
          ['QC status', grn.status],
          ['Posted', grn.posted_at ? `${day(grn.posted_at)}${grn.poster_name ? ` by ${grn.poster_name}` : ''}` : null],
        ],
        columns: [
          { label: '#', width: 3 }, { label: 'Product', width: 30 }, { label: 'Lot', width: 17 }, { label: 'Width', width: 7, right: true },
          { label: 'Mill lot', width: 12 }, { label: 'Received', width: 13, right: true }, { label: 'Unit', width: 5 },
        ],
        rows: (grn.items || []).map((l, i) => ({
          cells: [i + 1, l.product_name, l.lot_no, width(l.width_inch), l.supplier_lot_no, qty(l.received_quantity, l.uom_decimal_places), l.unit],
          detail: l.remarks,
        })),
        footer: [['Remarks', grn.remarks]],
        notes: ['Received quantity is before quality inspection; accepted / rejected quantities are on the QC report.'],
        signatures: ['Received by (store)', 'Checked by', 'Authorised signatory'],
      }),
    };
  },

  qualityInspection: async (id) => {
    const qc = await qualityControlRepository.findById(id);
    if (!qc) return null;
    const dp = qc.uom_decimal_places;
    return {
      filename: doc.filename(qc.qc_no),
      buffer: doc.render({
        title: 'QUALITY INSPECTION REPORT',
        number: qc.qc_no,
        mark: markFor(qc.status, ['completed']),
        company: await doc.company(qc.company_id),
        party: { label: 'Supplier', ...(await doc.supplier(qc.supplier_id)) },
        fields: [
          ['Inspection date', day(qc.inspection_date)],
          ['Result', qc.result ? String(qc.result).replace(/_/g, ' ') : null],
          ['Product', qc.product_name],
          ['Lot', lotRef(qc)],
          ['GRN', `${qc.inward_no} (${day(qc.inward_date)})`],
          ['Purchase order', qc.po_num],
        ],
        columns: [
          { label: 'Inspected', width: 18, right: true }, { label: 'Accepted', width: 18, right: true },
          { label: 'Rejected', width: 18, right: true }, { label: 'Marked for return', width: 20, right: true }, { label: 'Unit', width: 6 },
        ],
        rows: [{ cells: [qty(qc.inspected_quantity, dp), qty(qc.accepted_quantity, dp), qty(qc.rejected_quantity, dp), qty(qc.return_quantity, dp), qc.unit] }],
        summary: [
          ['Shade', qc.shade],
          ['Edge-to-edge shade', qc.edge_to_edge_shade],
          ['Weaving defects', qc.weaving_defects],
          ['Posted to stock', qc.stock_movement_no ? `${qty(qc.stock_quantity, dp)} ${qc.unit} at ${qc.stock_location_code} (${qc.stock_movement_no}, ${day(qc.stock_movement_date)})` : null],
          ['Returned to supplier', Number(qc.returned_quantity) > 0 ? `${qty(qc.returned_quantity, dp)} ${qc.unit}` : null],
          ['Debited', Number(qc.debited_quantity) > 0 ? `${qty(qc.debited_quantity, dp)} ${qc.unit}, amount ${money(qc.debited_amount)}` : null],
        ],
        footer: [['Remarks', qc.remarks], ['Completed', qc.completed_at ? `${day(qc.completed_at)}${qc.completer_name ? ` by ${qc.completer_name}` : ''}` : null]],
        signatures: ['Inspected by', 'Approved by'],
      }),
    };
  },

  supplierReturn: async (id) => {
    const ret = await supplierReturnRepository.findById(id);
    if (!ret) return null;
    return {
      filename: doc.filename(ret.return_no),
      buffer: doc.render({
        title: 'RETURN CHALLAN (MATERIAL RETURNED TO SUPPLIER)',
        number: ret.return_no,
        mark: markFor(ret.status, ['posted']),
        company: await doc.company(ret.company_id),
        party: { label: 'Returned to', ...(await doc.supplier(ret.supplier_id)) },
        fields: [
          ['Return date', day(ret.return_date)],
          ['QC report', `${ret.qc_no} (${day(ret.inspection_date)})`],
          ['GRN', `${ret.inward_no} (${day(ret.inward_date)})`],
          ['Purchase order', ret.po_num],
          ['Supplier challan', ret.trace?.challan_no],
        ],
        columns: [{ label: '#', width: 3 }, { label: 'Product', width: 34 }, { label: 'Lot', width: 36 }, { label: 'Quantity', width: 15, right: true }, { label: 'Unit', width: 6 }],
        rows: [{ cells: [1, ret.product_name, lotRef(ret), qty(ret.quantity, ret.uom_decimal_places), ret.unit] }],
        summary: [['Rejected at QC', `${qty(ret.qc_rejected_quantity, ret.uom_decimal_places)} ${ret.unit}`]],
        footer: [['Reason', ret.reason], ['Remarks', ret.remarks]],
        signatures: ['Dispatched by', 'Received by (supplier)'],
      }),
    };
  },

  debitNote: async (id) => {
    const dn = await debitNoteRepository.findById(id);
    if (!dn) return null;
    return {
      filename: doc.filename(dn.debit_note_no),
      buffer: doc.render({
        title: 'DEBIT NOTE',
        number: dn.debit_note_no,
        mark: markFor(dn.status, ['posted']),
        company: await doc.company(dn.company_id),
        party: { label: 'To', ...(await doc.supplier(dn.supplier_id)) },
        fields: [
          ['Date', day(dn.debit_note_date)],
          ['Against', dn.return_no ? `Return ${dn.return_no} (${day(dn.return_date)})` : 'Rejected quantity (no return)'],
          ['QC report', `${dn.qc_no} (${day(dn.inspection_date)})`],
          ['GRN', `${dn.inward_no} (${day(dn.inward_date)})`],
          ['Purchase order', dn.po_num],
          ['Supplier challan', dn.trace?.challan_no],
        ],
        columns: [
          { label: '#', width: 3 }, { label: 'Product / lot', width: 44 }, { label: 'Quantity', width: 14, right: true },
          { label: 'Unit', width: 5 }, { label: 'Rate', width: 12, right: true }, { label: 'Amount', width: 16, right: true },
        ],
        rows: [{ cells: [1, `${dn.product_name} - ${dn.lot_no}`, qty(dn.quantity, dn.uom_decimal_places), dn.unit, money(dn.unit_price), money(dn.amount)] }],
        summary: [['Amount debited', money(dn.amount)]],
        footer: [['Reason', dn.reason], ['Remarks', dn.remarks]],
        notes: ['No tax is calculated by the ERP. Tax / statutory details: [format pending client approval]'],
        signatures: ['Prepared by', 'Authorised signatory'],
      }),
    };
  },

  materialIssue: async (id) => {
    const mi = await materialIssueRepository.findById(id);
    if (!mi) return null;
    return {
      filename: doc.filename(mi.issue_no),
      buffer: doc.render({
        title: 'MATERIAL ISSUE SLIP',
        number: mi.issue_no,
        mark: markFor(mi.status, ['issued']),
        company: await doc.company(mi.company_id),
        fields: [
          ['Issue date', day(mi.issue_date)],
          ['From location', `${mi.location_code} - ${mi.location_name}`],
          ['Job reference', mi.job_reference],
          ['Received by', mi.receiver_name],
          ['Supervisor', mi.supervisor_name],
          ['Foreman', mi.foreman_name],
          ['Processing', mi.processing_no],
        ],
        columns: [
          { label: '#', width: 3 }, { label: 'Product', width: 28 }, { label: 'Lot', width: 17 }, { label: 'Width', width: 7, right: true },
          { label: 'Source GRN', width: 20 }, { label: 'Issued', width: 13, right: true }, { label: 'Unit', width: 5 },
        ],
        rows: (mi.items || []).map((l, i) => ({
          cells: [i + 1, l.product_name, l.lot_no, width(l.width_inch), l.inward_no, qty(l.quantity, l.uom_decimal_places), l.unit],
          detail: l.remarks,
        })),
        footer: [['Remarks', mi.remarks]],
        signatures: ['Issued by (store)', 'Received by', 'Supervisor', 'Foreman'],
      }),
    };
  },

  processing: async (id) => {
    const pr = await processingRepository.findById(id);
    if (!pr) return null;
    return {
      filename: doc.filename(pr.processing_no),
      buffer: doc.render({
        title: 'PRODUCTION / PROCESSING RECORD',
        number: pr.processing_no,
        mark: markFor(pr.status, ['completed']),
        company: await doc.company(pr.company_id),
        fields: [
          ['Material issue', `${pr.issue_no} (${day(pr.issue_date)})`],
          ['Job reference', pr.job_reference],
          ['Start date', pr.start_date ? day(pr.start_date) : null],
          ['Completion date', pr.completion_date ? day(pr.completion_date) : null],
          ['Supervisor', pr.supervisor_name],
          ['Foreman', pr.foreman_name],
        ],
        columns: [
          { label: 'Lot consumed', width: 18 }, { label: 'Product', width: 24 }, { label: 'Issued', width: 11, right: true }, { label: 'Consumed', width: 11, right: true },
          { label: 'Wastage', width: 10, right: true }, { label: 'Balance', width: 10, right: true }, { label: 'Unit', width: 5 },
        ],
        rows: (pr.items || []).map((l) => {
          const dp = l.uom_decimal_places;
          return {
            cells: [l.lot_no, l.product_name, qty(l.issued_quantity, dp), qty(l.consumed_quantity, dp), qty(l.wastage_quantity, dp), qty(l.balance_quantity, dp), l.unit],
            detail: [l.inward_no && `GRN ${l.inward_no}`, l.supplier_name, l.remarks].filter(Boolean).join('  |  '),
          };
        }),
        summary: [
          ['Produced', pr.produced_product_name ? `${pr.produced_product_name}: ${qty(pr.produced_quantity, pr.produced_uom_decimal_places)} ${pr.produced_unit || pr.produced_uom_code || ''}` : null],
          ['Finished lot', pr.output_lot_no ? `${pr.output_lot_no} at ${pr.output_location_code} (${pr.output_movement_no}, ${day(pr.output_movement_date)})` : null],
        ],
        footer: [['Remarks', pr.remarks]],
        notes: ['Consumed, wastage and balance are as recorded; the ERP applies no conversion formula.'],
        signatures: ['Supervisor', 'Foreman', 'Checked by'],
      }),
    };
  },
};

/**
 * GET /:id/document handler for a builder — the PDF as a download, or 404.
 * Mounted after the module's own view permission check.
 */
export const documentHandler = (build, label) => async (req, res, next) => {
  try {
    const result = await build(req.params.id);
    if (!result) return res.status(404).json({ success: false, message: `${label} not found` });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.buffer);
  } catch (error) {
    next(error);
  }
};
