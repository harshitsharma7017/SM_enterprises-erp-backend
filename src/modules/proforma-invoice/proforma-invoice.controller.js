import { proformaInvoiceService } from './proforma-invoice.service.js';
import { proformaInvoiceRepository } from './proforma-invoice.repository.js';
import { commercialDocument } from '../../services/commercial-document.service.js';

const FILTERS = ['company_id', 'status', 'buyer_id', 'order_confirmation_id', 'order', 'date_from', 'date_to', 'search', 'page', 'limit'];

const send = async (res, id, status, message) => {
  const pi = await proformaInvoiceRepository.findById(id);
  if (!pi) return res.status(404).json({ success: false, message: 'Proforma invoice not found' });
  res.status(status).json({ success: true, message: message?.(pi), data: pi });
};

export const proformaInvoiceController = {
  // GET /api/finance/proforma-invoices
  index: async (req, res, next) => {
    try {
      const result = await proformaInvoiceRepository.findAll(Object.fromEntries(FILTERS.map((k) => [k, req.query[k]])));
      res.json({ success: true, data: result.rows, meta: { total: result.total, page: result.page, limit: result.limit } });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/finance/proforma-invoices/form-data?company_id= | ?order_confirmation_id=&proforma_invoice_id=
  formData: async (req, res, next) => {
    try {
      res.json({ success: true, data: await proformaInvoiceService.formData(req.query) });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/finance/proforma-invoices/:id
  show: async (req, res, next) => {
    try {
      await send(res, req.params.id, 200);
    } catch (error) {
      next(error);
    }
  },

  // GET /api/finance/proforma-invoices/:id/document — PDF generated from the record
  document: async (req, res, next) => {
    try {
      const pi = await proformaInvoiceRepository.findById(req.params.id);
      if (!pi) return res.status(404).json({ success: false, message: 'Proforma invoice not found' });
      const buffer = commercialDocument.render({
        title: 'PROFORMA INVOICE',
        number: pi.pi_no,
        status: pi.status,
        parties: await commercialDocument.parties(pi.company_id, pi.buyer_id),
        currency: pi.currency_code,
        fields: [
          ['Date', commercialDocument.day(pi.pi_date)],
          ['Order', `${pi.oc_num} (${commercialDocument.day(pi.oc_date)})`],
          ['Buyer reference', pi.order_buyer_ref],
          ['Currency', pi.currency_code],
          ['Valid until', pi.valid_until ? commercialDocument.day(pi.valid_until) : null],
          ['Payment terms', pi.payment_terms],
          ['Reference', pi.reference],
        ],
        lines: pi.items.map((i) => ({
          description: i.product_name || i.description,
          detail: i.product_name && i.description ? i.description : null,
          quantity: i.quantity,
          decimals: i.uom_decimal_places,
          unit: i.unit,
          unit_price: i.unit_price,
          amount: i.amount,
        })),
        footer: [
          ['Confirmation reference', pi.confirmation_reference && `${pi.confirmation_reference}${pi.confirmation_date ? ` (${commercialDocument.day(pi.confirmation_date)})` : ''}`],
          ['Payment reference', pi.payment_reference && `${pi.payment_reference}${pi.payment_date ? ` (${commercialDocument.day(pi.payment_date)})` : ''}`],
          ['Remarks', pi.remarks],
          ['Cancelled', pi.status === 'cancelled' ? (pi.cancellation_reason || 'yes') : null],
        ],
      });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${commercialDocument.filename(pi.pi_no)}"`);
      res.send(buffer);
    } catch (error) {
      next(error);
    }
  },

  // POST /api/finance/proforma-invoices — draft
  create: async (req, res, next) => {
    try {
      const id = await proformaInvoiceService.create(req.body, req.user.id);
      await send(res, id, 201, (pi) => `Proforma invoice ${pi.pi_no} saved as draft.`);
    } catch (error) {
      next(error);
    }
  },

  // PUT /api/finance/proforma-invoices/:id — draft only
  update: async (req, res, next) => {
    try {
      await proformaInvoiceService.update(req.params.id, req.body, req.user.id);
      await send(res, req.params.id, 200, () => 'Proforma invoice updated.');
    } catch (error) {
      next(error);
    }
  },

  // POST /api/finance/proforma-invoices/:id/issue
  issue: async (req, res, next) => {
    try {
      await proformaInvoiceService.issue(req.params.id, req.user.id);
      await send(res, req.params.id, 200, (pi) => `Proforma invoice ${pi.pi_no} issued.`);
    } catch (error) {
      next(error);
    }
  },

  // POST /api/finance/proforma-invoices/:id/cancel
  cancel: async (req, res, next) => {
    try {
      await proformaInvoiceService.cancel(req.params.id, req.body?.reason, req.user.id);
      await send(res, req.params.id, 200, (pi) => `Proforma invoice ${pi.pi_no} cancelled.`);
    } catch (error) {
      next(error);
    }
  },

  // PUT /api/finance/proforma-invoices/:id/commercial-reference — issued only
  commercialReference: async (req, res, next) => {
    try {
      await proformaInvoiceService.updateCommercialReference(req.params.id, req.body, req.user.id);
      await send(res, req.params.id, 200, () => 'Confirmation / payment reference saved.');
    } catch (error) {
      next(error);
    }
  },
};
