import { invoiceService } from './invoice.service.js';
import { invoiceRepository } from './invoice.repository.js';
import { commercialDocument } from '../../services/commercial-document.service.js';

const FILTERS = ['company_id', 'status', 'buyer_id', 'order_confirmation_id', 'proforma_invoice_id', 'dispatch_id', 'order', 'dispatch', 'date_from', 'date_to', 'search', 'page', 'limit'];

// Drafts carry no number until issued.
const label = (invoice) => invoice.invoice_no || `Draft invoice #${invoice.id}`;

const send = async (res, id, status, message) => {
  const invoice = await invoiceRepository.findById(id);
  if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
  res.status(status).json({ success: true, message: message?.(invoice), data: invoice });
};

export const invoiceController = {
  // GET /api/finance/invoices
  index: async (req, res, next) => {
    try {
      const result = await invoiceRepository.findAll(Object.fromEntries(FILTERS.map((k) => [k, req.query[k]])));
      res.json({ success: true, data: result.rows, meta: { total: result.total, page: result.page, limit: result.limit } });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/finance/invoices/form-data?company_id= | ?order_confirmation_id= | ?dispatch_id= (&invoice_id=)
  formData: async (req, res, next) => {
    try {
      res.json({ success: true, data: await invoiceService.formData(req.query) });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/finance/invoices/:id
  show: async (req, res, next) => {
    try {
      await send(res, req.params.id, 200);
    } catch (error) {
      next(error);
    }
  },

  // GET /api/finance/invoices/:id/document — PDF generated from the record
  document: async (req, res, next) => {
    try {
      const invoice = await invoiceRepository.findById(req.params.id);
      if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
      const buffer = commercialDocument.render({
        title: 'INVOICE',
        number: label(invoice),
        status: invoice.status,
        parties: await commercialDocument.parties(invoice.company_id, invoice.buyer_id),
        currency: invoice.currency_code,
        fields: [
          ['Date', commercialDocument.day(invoice.invoice_date)],
          ['Order', invoice.oc_num && `${invoice.oc_num} (${commercialDocument.day(invoice.oc_date)})`],
          ['Buyer reference', invoice.order_buyer_ref],
          ['Proforma invoice', invoice.pi_no],
          ['Dispatches', invoice.dispatch_nos],
          ['Currency', invoice.currency_code],
          ['Reference', invoice.reference],
        ],
        lines: invoice.items.map((i) => ({
          description: i.product_name,
          detail: [i.description, `Dispatch ${i.dispatch_no}`, i.lot_no && `Lot ${i.lot_no}`, i.po_num && `PO ${i.po_num}`].filter(Boolean).join(' · '),
          quantity: i.quantity,
          decimals: i.uom_decimal_places,
          unit: i.unit,
          unit_price: i.unit_price,
          amount: i.amount,
        })),
        footer: [
          ['Remarks', invoice.remarks],
          ['Cancelled', invoice.status === 'cancelled' ? (invoice.cancellation_reason || 'yes') : null],
        ],
      });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${commercialDocument.filename(invoice.invoice_no || `INVOICE-DRAFT-${invoice.id}`)}"`);
      res.send(buffer);
    } catch (error) {
      next(error);
    }
  },

  // POST /api/finance/invoices — draft
  create: async (req, res, next) => {
    try {
      const id = await invoiceService.create(req.body, req.user.id);
      await send(res, id, 201, (i) => `${label(i)} saved.`);
    } catch (error) {
      next(error);
    }
  },

  // PUT /api/finance/invoices/:id — draft only
  update: async (req, res, next) => {
    try {
      await invoiceService.update(req.params.id, req.body, req.user.id);
      await send(res, req.params.id, 200, () => 'Invoice updated.');
    } catch (error) {
      next(error);
    }
  },

  // POST /api/finance/invoices/:id/issue — assigns the invoice number
  issue: async (req, res, next) => {
    try {
      await invoiceService.issue(req.params.id, req.user.id);
      await send(res, req.params.id, 200, (i) => `Invoice ${i.invoice_no} issued.`);
    } catch (error) {
      next(error);
    }
  },

  // POST /api/finance/invoices/:id/cancel — draft only
  cancel: async (req, res, next) => {
    try {
      await invoiceService.cancel(req.params.id, req.body?.reason, req.user.id);
      await send(res, req.params.id, 200, (i) => `${label(i)} cancelled.`);
    } catch (error) {
      next(error);
    }
  },
};
