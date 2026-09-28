import { proformaInvoiceService } from './proforma-invoice.service.js';
import { proformaInvoiceRepository } from './proforma-invoice.repository.js';
import { commercialDocuments, documentHandler } from '../../services/operational-documents.js';
import { documentArchive } from '../../services/document-archive.service.js';

const FILTERS = ['company_id', 'status', 'stage', 'buyer_id', 'order_confirmation_id', 'order', 'date_from', 'date_to', 'search', 'page', 'limit'];

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
  document: documentHandler(commercialDocuments.proformaInvoice, 'Proforma invoice'),

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
      await documentArchive.capture('proforma_invoice', Number(req.params.id), 'issued', req.user.id);
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
