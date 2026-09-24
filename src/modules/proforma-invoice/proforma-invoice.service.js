import { pool } from '../../config/database.js';
import { proformaInvoiceRepository } from './proforma-invoice.repository.js';
import { numberSeriesService, financialYearFor } from '../../services/number-series.service.js';
import { quantity } from '../../services/quantity.service.js';
import { companyScope } from '../../services/company-scope.service.js';

const PI_SERIES = { module: 'proforma_invoice', prefix: 'PI/' };

const notFound = () => ({ status: 404, message: 'Proforma invoice not found' });
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

/** The order: confirmed, company-owned, in an active company, with a buyer usable by that company. */
const checkOrder = async (executor, oc, companyId) => {
  if (!oc) throw rejected('Order not found.');
  if (oc.status !== 'confirmed') throw rejected(`A proforma invoice needs a confirmed order (${oc.oc_num} is ${oc.status}).`);
  if (oc.company_id === null) throw rejected(`${oc.oc_num} has no company yet.`);
  if (!blank(companyId) && Number(companyId) !== oc.company_id) throw rejected(`${oc.oc_num} belongs to a different company.`);
  await companyScope.assertActiveCompany(oc.company_id, executor);
  const [[buyer]] = await executor.query('SELECT id, company_name, company_id, deleted_at FROM buyers WHERE id = ?', [oc.buyer_id]);
  if (!buyer || buyer.deleted_at) throw rejected(`The buyer of ${oc.oc_num} no longer exists.`);
  if (buyer.company_id !== null && buyer.company_id !== oc.company_id) throw rejected(`${buyer.company_name} belongs to a different company than ${oc.oc_num}.`);
};

/**
 * PI lines: each is one line of the order, at most once. Product, UOM, unit,
 * description and price come from the order item. Together with the other
 * ISSUED proforma invoices of the order, a line never covers more than the
 * item's ordered quantity.
 */
const checkLines = (oc, orderLines, lines) => {
  const errors = [];
  const byId = Object.fromEntries(orderLines.map((l) => [l.id, l]));
  const seen = new Set();
  const output = [];
  lines.forEach((line, index) => {
    const label = `Line ${index + 1}`;
    const item = byId[line.order_confirmation_item_id];
    if (!item) {
      errors.push(`${label}: the item does not belong to ${oc.oc_num}`);
      return;
    }
    if (seen.has(item.id)) {
      errors.push(`${label}: the order item appears twice`);
      return;
    }
    seen.add(item.id);
    const name = item.product_name || item.design_no || item.description || `item ${item.id}`;
    if (item.product_id && (item.product_deleted_at || (item.product_company_id !== null && item.product_company_id !== oc.company_id))) {
      errors.push(`${label}: ${name} is not a product of this company`);
      return;
    }
    const qtyError = quantity.validate(line.quantity, item.uom_decimal_places, `${label}: quantity`);
    if (qtyError) {
      errors.push(qtyError);
      return;
    }
    const left = micro(item.ordered_quantity) - micro(item.proforma_quantity);
    if (micro(line.quantity) > left) {
      errors.push(`${label}: ${String(line.quantity).trim()} exceeds the ${fromMicro(Math.max(left, 0))} of ${name} ordered and not yet on an issued proforma invoice`);
      return;
    }
    output.push({
      order_confirmation_item_id: item.id,
      product_id: item.product_id || null,
      uom_id: item.product_id ? item.uom_id : null,
      unit: item.unit || item.uom_code || null,
      description: [item.design_no, item.description].filter((v) => !blank(v)).join(' — ') || null,
      quantity: String(line.quantity).trim(),
      unit_price: item.price === null ? null : item.price,
      remarks: text(line.remarks),
    });
  });
  if (errors.length > 0) throw rejected(`Proforma invoice lines are invalid: ${errors.join('; ')}`, errors);
  return output;
};

const validate = async (executor, data, oc, excludePiId = 0) => {
  await checkOrder(executor, oc, data.company_id);
  const orderLines = await proformaInvoiceRepository.findOrderLines(executor, oc.id, excludePiId);
  return checkLines(oc, orderLines, data.items);
};

const headerFields = (data, oc) => ({
  valid_until: text(data.valid_until),
  reference: text(data.reference),
  payment_terms: data.payment_terms === undefined ? text(oc.payment_terms) : text(data.payment_terms),
  remarks: text(data.remarks),
});

export const proformaInvoiceService = {
  /** A company's confirmed orders, or one order's lines with what is left to put on a PI. */
  formData: async ({ company_id: companyId, order_confirmation_id: ocId, proforma_invoice_id: piId }) => {
    if (!blank(ocId)) {
      const [[oc]] = await pool.query(`
        SELECT oc.id, oc.oc_num, oc.oc_date, oc.status, oc.company_id, oc.buyer_id, oc.currency_id, oc.payment_terms, oc.buyer_ref,
               b.company_name AS buyer_name, cur.iso_code AS currency_code
        FROM order_confirmations oc LEFT JOIN buyers b ON b.id = oc.buyer_id LEFT JOIN currencies cur ON cur.id = oc.currency_id
        WHERE oc.id = ? AND oc.deleted_at IS NULL`, [ocId]);
      if (!oc) throw { status: 404, message: 'Order not found' };
      return { order: oc, lines: await proformaInvoiceRepository.findOrderLines(pool, oc.id, blank(piId) ? 0 : Number(piId)) };
    }
    const id = Number(companyId);
    if (!Number.isInteger(id) || id <= 0) throw rejected('company_id is required');
    return { orders: await proformaInvoiceRepository.findEligibleOrders(id) };
  },

  /** Draft: company, buyer and currency are the order's; reserves nothing (issuing re-checks under lock). */
  create: async (data, userId) => inTransaction(async (connection) => {
    const oc = await proformaInvoiceRepository.findOrder(connection, data.order_confirmation_id);
    const lines = await validate(connection, data, oc);
    const financialYear = financialYearFor(dateFor(data.pi_date));
    await numberSeriesService.ensure(connection, PI_SERIES.module, PI_SERIES.prefix, financialYear);
    const piNo = await numberSeriesService.next(connection, PI_SERIES.module, financialYear);
    const id = await proformaInvoiceRepository.insertHeader(connection, {
      company_id: oc.company_id,
      pi_no: piNo,
      financial_year: financialYear,
      pi_date: data.pi_date,
      buyer_id: oc.buyer_id,
      order_confirmation_id: oc.id,
      currency_id: oc.currency_id,
      ...headerFields(data, oc),
      user_id: userId,
    });
    await proformaInvoiceRepository.replaceItems(connection, id, lines);
    return id;
  }),

  /** Draft only; the order and company are fixed once created. */
  update: async (id, data, userId) => {
    await inTransaction(async (connection) => {
      const existing = await proformaInvoiceRepository.lock(connection, id);
      if (!existing) throw notFound();
      if (existing.status !== 'draft') throw rejected(`An ${existing.status} proforma invoice cannot be edited.`);
      if (!blank(data.company_id) && Number(data.company_id) !== existing.company_id) throw rejected('The company of a proforma invoice cannot be changed.');
      const oc = await proformaInvoiceRepository.findOrder(connection, existing.order_confirmation_id);
      const lines = await validate(connection, { ...data, company_id: existing.company_id }, oc, existing.id);
      await proformaInvoiceRepository.updateHeader(connection, id, {
        pi_date: data.pi_date,
        currency_id: oc.currency_id,
        ...headerFields(data, oc),
        user_id: userId,
      });
      await proformaInvoiceRepository.replaceItems(connection, id, lines);
    });
  },

  /**
   * draft → issued. Locks the PI, its lines and the order (so two PIs of one
   * order issue one after the other), re-validates against the other issued
   * PIs, then freezes it.
   */
  issue: async (id, userId) => {
    await inTransaction(async (connection) => {
      const existing = await proformaInvoiceRepository.lock(connection, id);
      if (!existing) throw notFound();
      if (existing.status !== 'draft') throw rejected(`Only a draft proforma invoice can be issued (this one is ${existing.status}).`);
      const saved = await proformaInvoiceRepository.lockItems(connection, id);
      if (saved.length === 0) throw rejected('Add at least one line before issuing.');
      const oc = await proformaInvoiceRepository.findOrder(connection, existing.order_confirmation_id, { lock: true });
      await validate(connection, {
        company_id: existing.company_id,
        items: saved.map((l) => ({ order_confirmation_item_id: l.order_confirmation_item_id, quantity: String(Number(l.quantity)) })),
      }, oc, existing.id);
      await proformaInvoiceRepository.setIssued(connection, id, userId);
    });
  },

  /** Draft or issued → cancelled (read-only). Not while a live invoice refers to it. */
  cancel: async (id, reason, userId) => {
    await inTransaction(async (connection) => {
      const existing = await proformaInvoiceRepository.lock(connection, id);
      if (!existing) throw notFound();
      if (existing.status === 'cancelled') throw rejected('This proforma invoice is already cancelled.');
      if (existing.status === 'issued' && blank(reason)) throw rejected('A reason is required to cancel an issued proforma invoice.');
      const invoices = await proformaInvoiceRepository.countLiveInvoices(connection, id);
      if (invoices > 0) throw rejected(`${existing.pi_no} cannot be cancelled: ${invoices} invoice(s) refer to it.`);
      await proformaInvoiceRepository.setCancelled(connection, id, text(reason), userId);
    });
  },

  /**
   * Issued PIs only: record the customer's confirmation and payment
   * references as entered. Changes no status and computes no balance — the
   * payment workflow is not defined yet.
   */
  updateCommercialReference: async (id, data, userId) => {
    await inTransaction(async (connection) => {
      const existing = await proformaInvoiceRepository.lock(connection, id);
      if (!existing) throw notFound();
      if (existing.status !== 'issued') throw rejected('Confirmation / payment references can only be recorded on an issued proforma invoice.');
      await proformaInvoiceRepository.setCommercialReference(connection, id, {
        confirmation_reference: text(data.confirmation_reference),
        confirmation_date: text(data.confirmation_date),
        payment_reference: text(data.payment_reference),
        payment_date: text(data.payment_date),
        commercial_remarks: text(data.commercial_remarks),
      }, userId);
    });
  },
};
