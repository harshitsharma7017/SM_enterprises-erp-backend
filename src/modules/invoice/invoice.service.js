import { pool } from '../../config/database.js';
import { invoiceRepository } from './invoice.repository.js';
import { numberSeriesService, financialYearFor } from '../../services/number-series.service.js';
import { quantity } from '../../services/quantity.service.js';
import { companyScope } from '../../services/company-scope.service.js';

const INVOICE_SERIES = { module: 'invoice', prefix: 'INV/' };

const notFound = () => ({ status: 404, message: 'Invoice not found' });
const rejected = (message, errors) => ({ status: 422, message, errors });

const inTransaction = async (work) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await work(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const dateFor = (value) => {
  const [y, m, d] = String(value).slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
};

const blank = (v) => v === undefined || v === null || String(v).trim() === '';
const text = (v) => (blank(v) ? null : String(v).trim());
const micro = (v) => quantity.toMicro(v);
const fromMicro = (v) => quantity.fromMicro(v);

/**
 * Invoice lines: each bills one POSTED dispatch line, at most once per
 * invoice, and together with the other ISSUED invoices never more than was
 * dispatched on it. All lines share one company, one customer and one order
 * (or, for direct dispatches with no order, none). Product, UOM, lot, PO
 * line and order item come from the dispatch line; the price is the order
 * item's price, when there is an order item.
 */
const checkLines = (rows, lines) => {
  const errors = [];
  const byId = Object.fromEntries(rows.map((r) => [r.dispatch_item_id, r]));
  const seen = new Set();
  const output = [];
  let source = null;
  lines.forEach((line, index) => {
    const label = `Line ${index + 1}`;
    const row = byId[line.dispatch_item_id];
    if (!row) {
      errors.push(`${label}: dispatch line not found`);
      return;
    }
    if (seen.has(row.dispatch_item_id)) {
      errors.push(`${label}: dispatch line of ${row.dispatch_no} appears twice`);
      return;
    }
    seen.add(row.dispatch_item_id);
    if (row.dispatch_status !== 'posted') {
      errors.push(`${label}: ${row.dispatch_no} is ${row.dispatch_status}; only posted dispatches can be invoiced`);
      return;
    }
    if (row.buyer_id === null) {
      errors.push(`${label}: ${row.dispatch_no} has no customer to invoice`);
      return;
    }
    const key = { company_id: row.company_id, buyer_id: row.buyer_id, order_confirmation_id: row.order_confirmation_id ?? null };
    if (!source) source = { ...key, oc_num: row.oc_num };
    else if (key.company_id !== source.company_id) {
      errors.push(`${label}: ${row.dispatch_no} belongs to a different company`);
      return;
    } else if (key.buyer_id !== source.buyer_id) {
      errors.push(`${label}: ${row.dispatch_no} was dispatched to a different customer`);
      return;
    } else if (key.order_confirmation_id !== source.order_confirmation_id) {
      errors.push(`${label}: ${row.dispatch_no} belongs to a different order`);
      return;
    }
    if (row.product_company_id !== null && row.product_company_id !== row.company_id) {
      errors.push(`${label}: ${row.product_name} is not a product of this company`);
      return;
    }
    const qtyError = quantity.validate(line.quantity, row.uom_decimal_places, `${label}: quantity`);
    if (qtyError) {
      errors.push(qtyError);
      return;
    }
    const left = micro(row.dispatched_quantity) - micro(row.invoiced_quantity);
    if (micro(line.quantity) > left) {
      errors.push(`${label}: invoicing ${String(line.quantity).trim()} exceeds the ${fromMicro(Math.max(left, 0))}${row.unit ? ` ${row.unit}` : ''} of ${row.dispatch_no} (${row.product_name}) dispatched and not yet invoiced`);
      return;
    }
    output.push({
      dispatch_id: row.dispatch_id,
      dispatch_item_id: row.dispatch_item_id,
      order_confirmation_item_id: row.order_confirmation_item_id,
      lot_id: row.lot_id,
      purchase_order_item_id: row.purchase_order_item_id,
      product_id: row.product_id,
      uom_id: row.uom_id,
      unit: row.unit,
      description: [row.design_no, row.item_description].filter((v) => !blank(v)).join(' — ') || null,
      quantity: String(line.quantity).trim(),
      unit_price: row.order_confirmation_item_id && row.price !== null ? row.price : null,
      remarks: text(line.remarks),
    });
  });
  if (errors.length > 0) throw rejected(`Invoice lines are invalid: ${errors.join('; ')}`, errors);
  return { source, lines: output };
};

/**
 * Whole-invoice validation. `pi` is the (locked) proforma invoice to link,
 * if any: it must be issued, of the same order and company.
 */
const validate = async (executor, data, { pi = null, excludeInvoiceId = 0 } = {}) => {
  const ids = (data.items || []).map((l) => Number(l.dispatch_item_id)).filter((v) => Number.isInteger(v) && v > 0);
  const rows = ids.length ? await invoiceRepository.findInvoiceable(executor, 'di.id IN (?)', [ids], excludeInvoiceId) : [];
  const { source, lines } = checkLines(rows, data.items);
  if (!blank(data.company_id) && Number(data.company_id) !== source.company_id) throw rejected('The dispatches belong to a different company.');
  await companyScope.assertActiveCompany(source.company_id, executor);
  const [[buyer]] = await executor.query('SELECT id, company_name, company_id, deleted_at FROM buyers WHERE id = ?', [source.buyer_id]);
  if (!buyer || buyer.deleted_at) throw rejected('The customer of these dispatches no longer exists.');
  if (buyer.company_id !== null && buyer.company_id !== source.company_id) throw rejected(`${buyer.company_name} belongs to a different company.`);
  let currencyId = null;
  if (source.order_confirmation_id) {
    const [[oc]] = await executor.query('SELECT id, oc_num, company_id, status, currency_id FROM order_confirmations WHERE id = ? AND deleted_at IS NULL', [source.order_confirmation_id]);
    if (!oc) throw rejected('The order of these dispatches no longer exists.');
    if (oc.company_id !== source.company_id) throw rejected(`${oc.oc_num} belongs to a different company.`);
    currencyId = oc.currency_id;
  }
  if (!blank(data.proforma_invoice_id)) {
    if (!pi) throw rejected('Proforma invoice not found.');
    if (pi.status !== 'issued') throw rejected(`${pi.pi_no} is ${pi.status}; only an issued proforma invoice can be linked.`);
    if (pi.company_id !== source.company_id) throw rejected(`${pi.pi_no} belongs to a different company.`);
    if (pi.order_confirmation_id !== source.order_confirmation_id) throw rejected(`${pi.pi_no} is for a different order than these dispatches.`);
  }
  return {
    header: {
      company_id: source.company_id,
      buyer_id: source.buyer_id,
      order_confirmation_id: source.order_confirmation_id,
      proforma_invoice_id: blank(data.proforma_invoice_id) ? null : pi.id,
      currency_id: currencyId,
    },
    lines,
  };
};

const lockProformaIfLinked = async (connection, piId) => (blank(piId) ? null : invoiceRepository.lockProforma(connection, piId));

export const invoiceService = {
  /**
   * Form data: a company's orders / direct dispatches with dispatched
   * quantity not yet invoiced; or one order's (or one direct dispatch's)
   * posted dispatch lines with what is left to invoice, plus the order's
   * issued proforma invoices.
   */
  formData: async ({ company_id: companyId, order_confirmation_id: ocId, dispatch_id: dispatchId, invoice_id: invoiceId }) => {
    const exclude = blank(invoiceId) ? 0 : Number(invoiceId);
    if (!blank(dispatchId)) {
      const [[d]] = await pool.query(`
        SELECT d.id, d.dispatch_no, d.status, d.company_id, d.dispatch_type, MIN(oci.order_confirmation_id) AS order_confirmation_id
        FROM dispatches d JOIN dispatch_items di ON di.dispatch_id = d.id
        LEFT JOIN order_confirmation_items oci ON oci.id = di.order_confirmation_item_id
        WHERE d.id = ? GROUP BY d.id`, [dispatchId]);
      if (!d) throw { status: 404, message: 'Dispatch not found' };
      if (d.order_confirmation_id) return invoiceService.formData({ order_confirmation_id: d.order_confirmation_id, invoice_id: invoiceId });
      const lines = await invoiceRepository.findInvoiceable(pool, "d.id = ? AND d.status = 'posted' AND di.order_confirmation_item_id IS NULL", [d.id], exclude);
      return { dispatch: d, order: null, lines, proforma_invoices: [] };
    }
    if (!blank(ocId)) {
      const [[oc]] = await pool.query(`
        SELECT oc.id, oc.oc_num, oc.status, oc.company_id, oc.buyer_id, b.company_name AS buyer_name, cur.iso_code AS currency_code
        FROM order_confirmations oc LEFT JOIN buyers b ON b.id = oc.buyer_id LEFT JOIN currencies cur ON cur.id = oc.currency_id
        WHERE oc.id = ? AND oc.deleted_at IS NULL`, [ocId]);
      if (!oc) throw { status: 404, message: 'Order not found' };
      const lines = await invoiceRepository.findInvoiceable(pool, "d.status = 'posted' AND oci.order_confirmation_id = ?", [oc.id], exclude);
      return { order: oc, dispatch: null, lines, proforma_invoices: await invoiceRepository.findIssuedProformas(pool, oc.id) };
    }
    const id = Number(companyId);
    if (!Number.isInteger(id) || id <= 0) throw rejected('company_id is required');
    return invoiceRepository.findInvoiceableSources(id);
  },

  /** Draft (unnumbered): everything derived from the dispatch lines; reserves nothing (issuing re-checks under lock). */
  create: async (data, userId) => inTransaction(async (connection) => {
    const pi = await lockProformaIfLinked(connection, data.proforma_invoice_id);
    const { header, lines } = await validate(connection, data, { pi });
    const id = await invoiceRepository.insertHeader(connection, {
      ...header,
      invoice_date: data.invoice_date,
      reference: text(data.reference),
      remarks: text(data.remarks),
      user_id: userId,
    });
    await invoiceRepository.replaceItems(connection, id, lines);
    return id;
  }),

  /** Draft only; the company cannot change and every line is re-derived from its dispatch line. */
  update: async (id, data, userId) => {
    await inTransaction(async (connection) => {
      const existing = await invoiceRepository.lock(connection, id);
      if (!existing) throw notFound();
      if (existing.status !== 'draft') throw rejected(`An ${existing.status} invoice cannot be edited.`);
      if (!blank(data.company_id) && Number(data.company_id) !== existing.company_id) throw rejected('The company of an invoice cannot be changed.');
      const pi = await lockProformaIfLinked(connection, data.proforma_invoice_id);
      const { header, lines } = await validate(connection, { ...data, company_id: existing.company_id }, { pi, excludeInvoiceId: existing.id });
      await invoiceRepository.updateHeader(connection, id, {
        ...header,
        invoice_date: data.invoice_date,
        reference: text(data.reference),
        remarks: text(data.remarks),
        user_id: userId,
      });
      await invoiceRepository.replaceItems(connection, id, lines);
    });
  },

  /**
   * draft → issued. Locks the invoice and its lines, the linked PI, then the
   * billed dispatch lines (ascending), re-validates against the other issued
   * invoices, and only then takes the next invoice number — so a number is
   * never consumed by a draft or a failed issue. Issuing twice fails on status.
   */
  issue: async (id, userId) => {
    await inTransaction(async (connection) => {
      const existing = await invoiceRepository.lock(connection, id);
      if (!existing) throw notFound();
      if (existing.status !== 'draft') throw rejected(`Only a draft invoice can be issued (this one is ${existing.status}).`);
      const saved = await invoiceRepository.lockItems(connection, id);
      if (saved.length === 0) throw rejected('Add at least one line before issuing.');
      const pi = await lockProformaIfLinked(connection, existing.proforma_invoice_id);
      await invoiceRepository.lockDispatchItems(connection, saved.map((l) => l.dispatch_item_id));
      await validate(connection, {
        company_id: existing.company_id,
        proforma_invoice_id: existing.proforma_invoice_id,
        items: saved.map((l) => ({ dispatch_item_id: l.dispatch_item_id, quantity: String(Number(l.quantity)) })),
      }, { pi, excludeInvoiceId: existing.id });
      const financialYear = financialYearFor(dateFor(existing.invoice_date));
      await numberSeriesService.ensure(connection, INVOICE_SERIES.module, INVOICE_SERIES.prefix, financialYear);
      const invoiceNo = await numberSeriesService.next(connection, INVOICE_SERIES.module, financialYear);
      await invoiceRepository.setIssued(connection, id, invoiceNo, financialYear, userId);
    });
  },

  /** Drafts only: undoing an issued invoice needs an accounting treatment (credit note / reversal) not yet defined. */
  cancel: async (id, reason, userId) => {
    await inTransaction(async (connection) => {
      const existing = await invoiceRepository.lock(connection, id);
      if (!existing) throw notFound();
      if (existing.status === 'cancelled') throw rejected('This invoice is already cancelled.');
      if (existing.status !== 'draft') throw rejected('An issued invoice cannot be cancelled: its reversal / credit-note treatment is not defined yet.');
      await invoiceRepository.setCancelled(connection, id, text(reason), userId);
    });
  },
};
