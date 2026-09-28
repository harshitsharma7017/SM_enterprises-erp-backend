/**
 * One builder per generated document, all in the house layout
 * (document-layout.js). Each loads the record through the module's own
 * findById — the same data its detail screen shows — and returns
 * { filename, buffer }, or null when the record does not exist. Quantities
 * print at the UOM's precision; amounts are as recorded. Nothing is
 * recalculated and no tax is computed.
 */
import { pool } from '../config/database.js';
import { renderDocument, loadLetterhead } from './document-layout.js';
import { amountInWords } from '../utils/amount-words.js';
import { purchaseOrderRepository } from '../modules/purchase-order/purchase-order.repository.js';
import { inwardEntryRepository } from '../modules/inward-entry/inward-entry.repository.js';
import { qualityControlRepository } from '../modules/quality-control/quality-control.repository.js';
import { supplierReturnRepository } from '../modules/supplier-return/supplier-return.repository.js';
import { debitNoteRepository } from '../modules/debit-note/debit-note.repository.js';
import { materialIssueRepository } from '../modules/production/material-issue.repository.js';
import { processingRepository } from '../modules/production/processing.repository.js';
import { proformaInvoiceRepository } from '../modules/proforma-invoice/proforma-invoice.repository.js';
import { invoiceRepository } from '../modules/invoice/invoice.repository.js';
import { dispatchRepository } from '../modules/dispatch/dispatch.repository.js';

const has = (v) => v !== null && v !== undefined && String(v).trim() !== '';

// ---------------- formatting ----------------

/** "2026-09-28" → "28-09-2026". */
export const day = (value) => {
  if (!value) return null;
  const s = value instanceof Date ? value.toISOString() : String(value);
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : s;
};
/** A quantity at its UOM precision, Indian digit grouping. */
export const qty = (value, decimals = 0) => (has(value)
  ? Number(value).toLocaleString('en-IN', { minimumFractionDigits: Number(decimals) || 0, maximumFractionDigits: Number(decimals) || 0 })
  : '');
export const money = (value) => (has(value) ? Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-');
const width = (w) => (has(w) ? `${Number(w)}"` : '');
const filename = (number) => `${String(number).replace(/[/\\]/g, '-')}.pdf`;

/** Banner for anything that is not the final, posted state. */
const markFor = (status, finalStates, draftText = 'DRAFT - NOT FINAL') => {
  if (!status || finalStates.includes(status)) return null;
  if (status === 'cancelled') return 'CANCELLED';
  return status === 'draft' ? draftText : `${String(status).replace(/_/g, ' ').toUpperCase()} - NOT FINAL`;
};

// ---------------- parties ----------------

const supplierParty = async (supplierId, title) => {
  if (!supplierId) return null;
  const [[s]] = await pool.query(`
    SELECT s.display_code, s.company_name, s.name_on_bill, s.address, s.pincode, s.gst_number, s.pan_number,
           ci.name AS city, st.name AS state, co.name AS country
    FROM suppliers s LEFT JOIN cities ci ON ci.id = s.city_id LEFT JOIN states st ON st.id = s.state_id
    LEFT JOIN countries co ON co.id = s.country_id WHERE s.id = ?`, [supplierId]);
  if (!s) return null;
  return {
    title,
    lines: [
      `${s.name_on_bill || s.company_name}${s.display_code ? ` (${s.display_code})` : ''}`,
      s.address,
      [s.city, s.state, s.pincode].filter(has).join(', '),
      s.country && s.country !== 'India' ? s.country : null,
      [s.gst_number && `GSTIN: ${s.gst_number}`, s.pan_number && `PAN: ${s.pan_number}`].filter(Boolean).join('   '),
    ],
  };
};

const buyerParty = async (buyerId, title) => {
  if (!buyerId) return null;
  const [[b]] = await pool.query(`
    SELECT b.company_name, b.name_on_export_invoice, b.display_code, b.address, b.pincode, b.gst_vat_no,
           COALESCE(ci.name, b.city) AS city, COALESCE(st.name, b.state) AS state, co.name AS country
    FROM buyers b LEFT JOIN cities ci ON ci.id = b.city_id LEFT JOIN states st ON st.id = b.state_id
    LEFT JOIN countries co ON co.id = b.country_id WHERE b.id = ?`, [buyerId]);
  if (!b) return null;
  return {
    title,
    lines: [
      b.name_on_export_invoice || b.company_name,
      b.address,
      [b.city, b.state, b.pincode].filter(has).join(', '),
      b.country,
      b.gst_vat_no && `GST / VAT: ${b.gst_vat_no}`,
    ],
  };
};

const colourSummary = (colours) => (colours || [])
  .map((c) => `${c.colour || '-'}: ${(c.sizes || []).map((s) => `${s.size || '-'} x ${s.qty}`).join(', ')}`)
  .join('; ');

/** Product name + UOM precision for PO lines (the PO line only carries the product id). */
const productsById = async (ids) => {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return {};
  const [rows] = await pool.query(
    `SELECT p.id, p.name, p.item_group_code, p.hsn_code, u.code AS uom_code, COALESCE(u.decimal_places, 0) AS decimals
     FROM products p LEFT JOIN uoms u ON u.id = p.uom_id WHERE p.id IN (?)`,
    [unique]
  );
  return Object.fromEntries(rows.map((r) => [r.id, r]));
};

const NO_TAX = 'No tax, discount or freight is calculated by the ERP.';

// ---------------- operational documents ----------------

export const operationalDocuments = {
  purchaseOrder: async (id) => {
    const po = await purchaseOrderRepository.findById(id);
    if (!po) return null;
    const letterhead = await loadLetterhead(po.company_id);
    const products = await productsById((po.items || []).map((i) => i.product_id));
    let total = 0;
    let priced = 0;
    const rows = (po.items || []).map((item, i) => {
      const p = products[item.product_id] || {};
      const ordered = item.ordered_quantity ?? item.qty;
      const amount = has(item.cost_price) ? Number(ordered) * Number(item.cost_price) : null;
      if (amount !== null) {
        total += Math.round(amount * 100);
        priced += 1;
      }
      return {
        cells: [i + 1, p.name || item.design_no || item.description, p.hsn_code, qty(ordered, p.decimals), item.unit || p.uom_code, has(item.cost_price) ? money(item.cost_price) : '-', amount === null ? '-' : money(amount)],
        sub: [item.design_no && item.design_no !== p.name ? `Design: ${item.design_no}` : null, item.description, colourSummary(item.colours) || null,
          item.brand_spec?.summary ? `Brand spec: ${item.brand_spec.summary}` : null, item.remarks].filter(Boolean).join('  |  '),
      };
    });
    return {
      filename: filename(po.po_num),
      buffer: renderDocument({
        letterhead,
        title: 'PURCHASE ORDER',
        number: po.po_num,
        mark: markFor(po.status, ['raised', 'partial', 'received'], 'DRAFT - NOT CONFIRMED'),
        parties: [
          await supplierParty(po.supplier_id, 'Supplier'),
          { title: 'Deliver to', lines: [letterhead.company.name, po.delivery_details || letterhead.company.address] },
        ],
        facts: [
          ['PO number', po.po_num], ['PO date', day(po.po_date)], ['Dispatch by', day(po.dispatch_date)], ['Status', po.status],
          ['Order (contract)', po.oc_num], ['Material plan', po.material_plan_no], ['Confirmed', po.confirmed_at ? day(po.confirmed_at) : null],
        ],
        table: {
          columns: [{ label: '#', width: 0.35, align: 'center' }, { label: 'Item', width: 3.6 }, { label: 'HSN', width: 0.9 }, { label: 'Quantity', width: 1.1, align: 'right' },
            { label: 'Unit', width: 0.6 }, { label: 'Rate', width: 0.9, align: 'right' }, { label: 'Amount', width: 1.2, align: 'right' }],
          rows,
        },
        totals: priced ? [['Total of priced lines', money(total / 100), { strong: true }]] : [],
        sections: [
          { title: 'Packing', text: po.packing_details },
          { title: 'Remarks', text: po.remarks },
          { title: 'Terms & conditions', text: letterhead.settings.purchase_terms, small: true },
        ],
        signatures: [{ label: 'Prepared by' }, { label: 'Authorised Signatory', name: letterhead.settings.signatory_name, forCompany: true }],
        generatedNote: `Amount = quantity x rate. ${NO_TAX}`,
      }),
    };
  },

  grn: async (id) => {
    const grn = await inwardEntryRepository.findById(id);
    if (!grn) return null;
    const letterhead = await loadLetterhead(grn.company_id);
    return {
      filename: filename(grn.inward_no),
      buffer: renderDocument({
        letterhead,
        title: grn.entry_type === 'grn' ? 'GOODS RECEIPT NOTE' : 'INWARD ENTRY',
        number: grn.inward_no,
        mark: markFor(grn.receipt_status, ['posted'], 'DRAFT - NOT POSTED'),
        parties: [await supplierParty(grn.supplier_id, 'Received from')],
        facts: [
          ['GRN number', grn.inward_no], ['GRN date', day(grn.inward_date)], ['Purchase order', grn.purchase_order_num], ['QC status', grn.status],
          ['Supplier challan / bill', grn.challan_no], ['Challan date', day(grn.challan_date)], ['Posted', grn.posted_at ? `${day(grn.posted_at)}${grn.poster_name ? ` by ${grn.poster_name}` : ''}` : null],
        ],
        table: {
          columns: [{ label: '#', width: 0.35, align: 'center' }, { label: 'Product', width: 2.8 }, { label: 'Lot', width: 1.5 }, { label: 'Width', width: 0.7, align: 'right' },
            { label: 'Mill lot', width: 1.1 }, { label: 'Received', width: 1.1, align: 'right' }, { label: 'Unit', width: 0.6 }],
          rows: (grn.items || []).map((l, i) => ({
            cells: [i + 1, l.product_name, l.lot_no, width(l.width_inch), l.supplier_lot_no, qty(l.received_quantity, l.uom_decimal_places), l.unit],
            sub: l.remarks,
          })),
        },
        sections: [{ title: 'Remarks', text: grn.remarks }],
        signatures: [{ label: 'Received by (Store)' }, { label: 'Checked by' }, { label: 'Authorised Signatory', forCompany: true }],
        generatedNote: 'Received quantity is before quality inspection; accepted / rejected quantities are on the QC report.',
      }),
    };
  },

  qualityInspection: async (id) => {
    const qc = await qualityControlRepository.findById(id);
    if (!qc) return null;
    const letterhead = await loadLetterhead(qc.company_id);
    const dp = qc.uom_decimal_places;
    return {
      filename: filename(qc.qc_no),
      buffer: renderDocument({
        letterhead,
        title: 'QUALITY INSPECTION REPORT',
        number: qc.qc_no,
        mark: markFor(qc.status, ['completed'], 'DRAFT - NOT COMPLETED'),
        parties: [await supplierParty(qc.supplier_id, 'Supplier')],
        facts: [
          ['QC number', qc.qc_no], ['Inspection date', day(qc.inspection_date)], ['Result', qc.result ? String(qc.result).replace(/_/g, ' ') : null], ['Status', qc.status],
          ['Product', qc.product_name], ['Lot', qc.lot_no], ['Width', width(qc.width_inch)], ['Mill lot', qc.supplier_lot_no],
          ['GRN', `${qc.inward_no} (${day(qc.inward_date)})`], ['Purchase order', qc.po_num], ['Supplier challan', qc.trace?.challan_no],
        ],
        table: {
          columns: [{ label: 'Inspected', align: 'right' }, { label: 'Accepted', align: 'right' }, { label: 'Rejected', align: 'right' }, { label: 'Marked for return', align: 'right' }, { label: 'Unit', width: 0.5 }],
          rows: [{ cells: [qty(qc.inspected_quantity, dp), qty(qc.accepted_quantity, dp), qty(qc.rejected_quantity, dp), qty(qc.return_quantity, dp), qc.unit] }],
        },
        sections: [
          { title: 'Inspection', text: [qc.shade && `Shade: ${qc.shade}`, qc.edge_to_edge_shade && `Edge-to-edge shade: ${qc.edge_to_edge_shade}`, qc.weaving_defects && `Weaving defects: ${qc.weaving_defects}`].filter(Boolean).join('\n') },
          { title: 'Outcome', text: [
            qc.stock_movement_no && `Accepted into stock: ${qty(qc.stock_quantity, dp)} ${qc.unit} at ${qc.stock_location_code} (${qc.stock_movement_no}, ${day(qc.stock_movement_date)})`,
            Number(qc.returned_quantity) > 0 && `Returned to supplier: ${qty(qc.returned_quantity, dp)} ${qc.unit}`,
            Number(qc.debited_quantity) > 0 && `Debited: ${qty(qc.debited_quantity, dp)} ${qc.unit}, amount ${money(qc.debited_amount)}`,
          ].filter(Boolean).join('\n') },
          { title: 'Remarks', text: qc.remarks },
        ],
        signatures: [{ label: 'Inspected by', name: qc.completer_name }, { label: 'Approved by' }],
      }),
    };
  },

  supplierReturn: async (id) => {
    const ret = await supplierReturnRepository.findById(id);
    if (!ret) return null;
    const letterhead = await loadLetterhead(ret.company_id);
    const dp = ret.uom_decimal_places;
    return {
      filename: filename(ret.return_no),
      buffer: renderDocument({
        letterhead,
        title: 'RETURN CHALLAN',
        number: ret.return_no,
        mark: markFor(ret.status, ['posted'], 'DRAFT - NOT POSTED'),
        parties: [await supplierParty(ret.supplier_id, 'Returned to')],
        facts: [
          ['Return number', ret.return_no], ['Return date', day(ret.return_date)], ['QC report', `${ret.qc_no} (${day(ret.inspection_date)})`], ['Status', ret.status],
          ['GRN', `${ret.inward_no} (${day(ret.inward_date)})`], ['Purchase order', ret.po_num], ['Supplier challan', ret.trace?.challan_no],
        ],
        table: {
          columns: [{ label: '#', width: 0.35, align: 'center' }, { label: 'Product', width: 2.8 }, { label: 'Lot', width: 1.5 }, { label: 'Width', width: 0.7, align: 'right' },
            { label: 'Mill lot', width: 1.1 }, { label: 'Quantity', width: 1.1, align: 'right' }, { label: 'Unit', width: 0.6 }],
          rows: [{ cells: [1, ret.product_name, ret.lot_no, width(ret.width_inch), ret.supplier_lot_no, qty(ret.quantity, dp), ret.unit] }],
        },
        sections: [
          { title: 'Reason for return', text: [ret.reason, `Rejected at QC: ${qty(ret.qc_rejected_quantity, dp)} ${ret.unit}`].filter(Boolean).join('\n') },
          { title: 'Remarks', text: ret.remarks },
        ],
        signatures: [{ label: 'Dispatched by' }, { label: "Receiver's signature & stamp" }, { label: 'Authorised Signatory', forCompany: true }],
        generatedNote: 'Material returned against the quality inspection above.',
      }),
    };
  },

  debitNote: async (id) => {
    const dn = await debitNoteRepository.findById(id);
    if (!dn) return null;
    const letterhead = await loadLetterhead(dn.company_id);
    return {
      filename: filename(dn.debit_note_no),
      buffer: renderDocument({
        letterhead,
        title: 'DEBIT NOTE',
        number: dn.debit_note_no,
        mark: markFor(dn.status, ['posted'], 'DRAFT - NOT POSTED'),
        parties: [await supplierParty(dn.supplier_id, 'To')],
        facts: [
          ['Debit note number', dn.debit_note_no], ['Date', day(dn.debit_note_date)], ['Status', dn.status],
          ['Against', dn.return_no ? `Return ${dn.return_no} (${day(dn.return_date)})` : 'Rejected quantity (no return)'],
          ['QC report', `${dn.qc_no} (${day(dn.inspection_date)})`], ['GRN', `${dn.inward_no} (${day(dn.inward_date)})`], ['Purchase order', dn.po_num], ['Supplier challan', dn.trace?.challan_no],
        ],
        table: {
          columns: [{ label: '#', width: 0.35, align: 'center' }, { label: 'Description', width: 3.4 }, { label: 'Quantity', width: 1.1, align: 'right' },
            { label: 'Unit', width: 0.6 }, { label: 'Rate', width: 0.9, align: 'right' }, { label: 'Amount', width: 1.2, align: 'right' }],
          rows: [{ cells: [1, `${dn.product_name} - lot ${dn.lot_no}`, qty(dn.quantity, dn.uom_decimal_places), dn.unit, has(dn.unit_price) ? money(dn.unit_price) : '-', money(dn.amount)], sub: dn.reason }],
        },
        totals: [['Amount debited', money(dn.amount), { strong: true }]],
        sections: [{ title: 'Remarks', text: dn.remarks }],
        signatures: [{ label: 'Prepared by' }, { label: 'Authorised Signatory', name: letterhead.settings.signatory_name, forCompany: true }],
        generatedNote: NO_TAX,
      }),
    };
  },

  materialIssue: async (id) => {
    const mi = await materialIssueRepository.findById(id);
    if (!mi) return null;
    const letterhead = await loadLetterhead(mi.company_id);
    return {
      filename: filename(mi.issue_no),
      buffer: renderDocument({
        letterhead,
        title: 'MATERIAL ISSUE SLIP',
        number: mi.issue_no,
        mark: markFor(mi.status, ['issued'], 'DRAFT - NOT ISSUED'),
        facts: [
          ['Issue number', mi.issue_no], ['Issue date', day(mi.issue_date)], ['From location', `${mi.location_code} - ${mi.location_name}`], ['Job reference', mi.job_reference],
          ['Received by', mi.receiver_name], ['Supervisor', mi.supervisor_name], ['Foreman', mi.foreman_name], ['Processing', mi.processing_no],
        ],
        table: {
          columns: [{ label: '#', width: 0.35, align: 'center' }, { label: 'Product', width: 2.6 }, { label: 'Lot', width: 1.4 }, { label: 'Width', width: 0.7, align: 'right' },
            { label: 'Source', width: 1.5 }, { label: 'Issued', width: 1, align: 'right' }, { label: 'Unit', width: 0.6 }],
          rows: (mi.items || []).map((l, i) => ({
            cells: [i + 1, l.product_name, l.lot_no, width(l.width_inch), l.inward_no ? `GRN ${l.inward_no}` : 'Opening stock', qty(l.quantity, l.uom_decimal_places), l.unit],
            sub: l.remarks,
          })),
        },
        sections: [{ title: 'Remarks', text: mi.remarks }],
        signatures: [{ label: 'Issued by (Store)' }, { label: 'Received by', name: mi.receiver_name }, { label: 'Supervisor', name: mi.supervisor_name }, { label: 'Foreman', name: mi.foreman_name }],
      }),
    };
  },

  processing: async (id) => {
    const pr = await processingRepository.findById(id);
    if (!pr) return null;
    const letterhead = await loadLetterhead(pr.company_id);
    return {
      filename: filename(pr.processing_no),
      buffer: renderDocument({
        letterhead,
        title: 'PRODUCTION RECORD',
        number: pr.processing_no,
        mark: markFor(pr.status, ['completed'], 'IN PROCESS - NOT COMPLETED'),
        facts: [
          ['Processing number', pr.processing_no], ['Material issue', `${pr.issue_no} (${day(pr.issue_date)})`], ['Job reference', pr.job_reference], ['Production plan', pr.production_plan_no],
          ['Start date', day(pr.start_date)], ['Completion date', day(pr.completion_date)], ['Supervisor', pr.supervisor_name], ['Foreman', pr.foreman_name],
        ],
        table: {
          columns: [{ label: 'Lot consumed', width: 1.4 }, { label: 'Product', width: 2.2 }, { label: 'Issued', width: 0.9, align: 'right' }, { label: 'Consumed', width: 0.95, align: 'right' },
            { label: 'Wastage', width: 0.9, align: 'right' }, { label: 'Balance', width: 0.9, align: 'right' }, { label: 'Unit', width: 0.55 }],
          rows: (pr.items || []).map((l) => {
            const dp = l.uom_decimal_places;
            return {
              cells: [l.lot_no, l.product_name, qty(l.issued_quantity, dp), qty(l.consumed_quantity, dp), qty(l.wastage_quantity, dp), qty(l.balance_quantity, dp), l.unit],
              sub: [l.inward_no && `GRN ${l.inward_no}`, l.supplier_name, l.remarks].filter(Boolean).join('  |  '),
            };
          }),
        },
        totals: pr.produced_product_name ? [[`Produced: ${pr.produced_product_name}`, `${qty(pr.produced_quantity, pr.produced_uom_decimal_places)} ${pr.produced_unit || pr.produced_uom_code || ''}`, { strong: true }]] : [],
        sections: [
          { title: 'Finished lot', text: pr.output_lot_no ? `${pr.output_lot_no} posted to ${pr.output_location_code} (${pr.output_movement_no}, ${day(pr.output_movement_date)})` : null },
          { title: 'Remarks', text: pr.remarks },
        ],
        signatures: [{ label: 'Supervisor', name: pr.supervisor_name }, { label: 'Foreman', name: pr.foreman_name }, { label: 'Checked by' }],
        generatedNote: 'Consumed, wastage and balance are as recorded; the ERP applies no conversion formula.',
      }),
    };
  },

  /** Delivery challan for a dispatch — stock dispatch (from our location) or direct supplier dispatch. */
  deliveryChallan: async (id) => {
    const d = await dispatchRepository.findById(id);
    if (!d) return null;
    const letterhead = await loadLetterhead(d.company_id);
    const direct = d.dispatch_type === 'DIRECT_SUPPLIER_DISPATCH';
    const consignee = d.buyer_id ? await buyerParty(d.buyer_id, 'Consignee') : null;
    return {
      filename: filename(d.dispatch_no || `DISPATCH-DRAFT-${d.id}`),
      buffer: renderDocument({
        letterhead,
        title: 'DELIVERY CHALLAN',
        number: d.dispatch_no || `Draft dispatch #${d.id}`,
        mark: markFor(d.status, ['posted'], 'DRAFT - NOT POSTED'),
        parties: [
          consignee
            ? { ...consignee, lines: [...consignee.lines, has(d.destination_address) ? `Deliver at: ${d.destination_address}` : null] }
            : { title: 'Consignee', lines: [d.destination_name, d.destination_address] },
          { title: 'Transport', lines: [d.transporter || 'Transporter: -', d.vehicle_no && `Vehicle: ${d.vehicle_no}`, d.document_reference && `LR / challan: ${d.document_reference}`] },
        ],
        facts: [
          ['Challan number', d.dispatch_no], ['Date', day(d.dispatch_date)], ['Order', d.oc_num], [direct ? 'Purchase order' : 'From location', direct ? d.po_num : `${d.location_code} - ${d.location_name}`],
          ['Dispatch', direct ? `Direct from supplier: ${d.supplier_name}` : 'From our stock'], ['Invoice / bill ref.', d.invoice_reference],
        ],
        table: {
          columns: [{ label: '#', width: 0.35, align: 'center' }, { label: 'Description of goods', width: 3.2 }, { label: 'Lot', width: 1.4 }, { label: 'Quantity', width: 1.1, align: 'right' }, { label: 'Unit', width: 0.6 }],
          rows: (d.items || []).map((l, i) => ({
            cells: [i + 1, l.product_name, l.lot_no || (direct ? 'Supplier' : ''), qty(l.quantity, l.uom_decimal_places), l.unit],
            sub: [l.design_no && l.design_no !== l.product_name ? `Design: ${l.design_no}` : null, l.remarks].filter(Boolean).join('  |  '),
          })),
        },
        sections: [{ title: 'Remarks', text: d.remarks }],
        signatures: [{ label: 'Prepared by' }, { label: "Receiver's signature & stamp" }, { label: 'Authorised Signatory', forCompany: true }],
        generatedNote: 'Goods sent against the order above; not a tax invoice.',
      }),
    };
  },
};

// ---------------- commercial documents ----------------

const currencyOf = (row) => row.currency_code || row.currency_name || '';

export const commercialDocuments = {
  proformaInvoice: async (id) => {
    const pi = await proformaInvoiceRepository.findById(id);
    if (!pi) return null;
    const letterhead = await loadLetterhead(pi.company_id);
    const currency = currencyOf(pi);
    return {
      filename: filename(pi.pi_no),
      buffer: renderDocument({
        letterhead,
        title: 'PROFORMA INVOICE',
        number: pi.pi_no,
        mark: markFor(pi.status, ['issued'], 'DRAFT - NOT ISSUED'),
        parties: [await buyerParty(pi.buyer_id, 'Buyer')],
        facts: [
          ['PI number', pi.pi_no], ['PI date', day(pi.pi_date)], ['Valid until', day(pi.valid_until)], ['Currency', currency],
          ['Order', `${pi.oc_num} (${day(pi.oc_date)})`], ['Buyer reference', pi.order_buyer_ref], ['Customer reference', pi.reference], ['Payment terms', pi.payment_terms],
        ],
        table: {
          columns: [{ label: '#', width: 0.35, align: 'center' }, { label: 'Description', width: 3.5 }, { label: 'Quantity', width: 1.1, align: 'right' },
            { label: 'Unit', width: 0.6 }, { label: `Unit price${currency ? ` (${currency})` : ''}`, width: 1.1, align: 'right' }, { label: `Amount${currency ? ` (${currency})` : ''}`, width: 1.2, align: 'right' }],
          rows: pi.items.map((i, n) => ({
            cells: [n + 1, i.product_name || i.description, qty(i.quantity, i.uom_decimal_places), i.unit, has(i.unit_price) ? money(i.unit_price) : 'Not priced', has(i.amount) ? money(i.amount) : '-'],
            sub: [i.product_name && i.description && i.description !== i.product_name ? i.description : null, i.design_no && i.design_no !== i.product_name ? `Design: ${i.design_no}` : null].filter(Boolean).join('  |  '),
          })),
        },
        totals: [[`Total${currency ? ` (${currency})` : ''}`, money(pi.total_amount || 0), { strong: true }]],
        amountInWords: amountInWords(pi.total_amount || 0, currency || 'INR'),
        bank: true,
        sections: [
          { title: 'Buyer confirmation / payment', text: [
            pi.confirmation_reference && `Confirmation: ${pi.confirmation_reference}${pi.confirmation_date ? ` (${day(pi.confirmation_date)})` : ''}`,
            pi.payment_reference && `Payment: ${pi.payment_reference}${pi.payment_date ? ` (${day(pi.payment_date)})` : ''}`,
          ].filter(Boolean).join('\n') },
          { title: 'Remarks', text: [pi.remarks, pi.status === 'cancelled' ? `Cancelled: ${pi.cancellation_reason || 'yes'}` : null].filter(Boolean).join('\n') },
          { title: 'Terms & conditions', text: letterhead.settings.sales_terms, small: true },
        ],
        signatures: [{ label: 'Authorised Signatory', name: letterhead.settings.signatory_name, forCompany: true }],
        generatedNote: `Amount = quantity x the order item's unit price. ${NO_TAX}`,
      }),
    };
  },

  invoice: async (id) => {
    const invoice = await invoiceRepository.findById(id);
    if (!invoice) return null;
    const letterhead = await loadLetterhead(invoice.company_id);
    const currency = currencyOf(invoice);
    const number = invoice.invoice_no || `Draft invoice #${invoice.id}`;
    return {
      filename: filename(invoice.invoice_no || `INVOICE-DRAFT-${invoice.id}`),
      buffer: renderDocument({
        letterhead,
        title: 'INVOICE',
        number,
        mark: markFor(invoice.status, ['issued'], 'DRAFT - NOT ISSUED'),
        parties: [await buyerParty(invoice.buyer_id, 'Bill to')],
        facts: [
          ['Invoice number', invoice.invoice_no], ['Invoice date', day(invoice.invoice_date)], ['Currency', currency], ['Proforma invoice', invoice.pi_no],
          ['Order', invoice.oc_num && `${invoice.oc_num} (${day(invoice.oc_date)})`], ['Buyer reference', invoice.order_buyer_ref], ['Dispatches', invoice.dispatch_nos], ['Reference', invoice.reference],
        ],
        table: {
          columns: [{ label: '#', width: 0.35, align: 'center' }, { label: 'Description', width: 3.5 }, { label: 'Quantity', width: 1.1, align: 'right' },
            { label: 'Unit', width: 0.6 }, { label: `Unit price${currency ? ` (${currency})` : ''}`, width: 1.1, align: 'right' }, { label: `Amount${currency ? ` (${currency})` : ''}`, width: 1.2, align: 'right' }],
          rows: invoice.items.map((i, n) => ({
            cells: [n + 1, i.product_name, qty(i.quantity, i.uom_decimal_places), i.unit, has(i.unit_price) ? money(i.unit_price) : 'Not priced', has(i.amount) ? money(i.amount) : '-'],
            sub: [i.description && i.description !== i.product_name ? i.description : null, `Dispatch ${i.dispatch_no}`, i.lot_no && `Lot ${i.lot_no}`, i.po_num && `PO ${i.po_num}`].filter(Boolean).join('  |  '),
          })),
        },
        totals: [[`Total${currency ? ` (${currency})` : ''}`, money(invoice.total_amount || 0), { strong: true }]],
        amountInWords: amountInWords(invoice.total_amount || 0, currency || 'INR'),
        bank: true,
        sections: [
          { title: 'Remarks', text: [invoice.remarks, invoice.status === 'cancelled' ? `Cancelled: ${invoice.cancellation_reason || 'yes'}` : null].filter(Boolean).join('\n') },
          { title: 'Terms & conditions', text: letterhead.settings.sales_terms, small: true },
        ],
        signatures: [{ label: 'Authorised Signatory', name: letterhead.settings.signatory_name, forCompany: true }],
        generatedNote: `${NO_TAX} Tax details: format pending client approval.`,
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
