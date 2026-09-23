import { inwardEntryService } from './inward-entry.service.js';
import { inwardEntryRepository } from './inward-entry.repository.js';

export const inwardEntryController = {
  // GET /api/procurement/inward-entries — GRNs and legacy inward entries
  index: async (req, res, next) => {
    try {
      const filters = {
        receipt_status: req.query.receipt_status,
        status: req.query.status,
        entry_type: req.query.entry_type,
        purchase_order_id: req.query.purchase_order_id,
        supplier_id: req.query.supplier_id,
        company_id: req.query.company_id,
        date_from: req.query.date_from,
        date_to: req.query.date_to,
        search: req.query.search,
        page: req.query.page,
        limit: req.query.limit,
      };
      const result = await inwardEntryRepository.findAll(filters);
      res.json({
        success: true,
        data: result.rows,
        meta: {
          total: result.total,
          page: parseInt(filters.page, 10) || 1,
          limit: parseInt(filters.limit, 10) || 15,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/procurement/inward-entries/eligible-pos?company_id=
  eligiblePos: async (req, res, next) => {
    try {
      const companyId = Number(req.query.company_id);
      if (!Number.isInteger(companyId) || companyId <= 0) {
        return res.status(400).json({ success: false, message: 'Validation failed', errors: ['company_id is required'] });
      }
      const data = await inwardEntryService.eligiblePurchaseOrders(companyId);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/procurement/inward-entries/po-details/:id — PO lines with Ordered / Received / Pending
  poDetails: async (req, res, next) => {
    try {
      const data = await inwardEntryService.receivingLines(req.params.id);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/procurement/inward-entries/:id
  show: async (req, res, next) => {
    try {
      const entry = await inwardEntryRepository.findById(req.params.id);
      if (!entry) return res.status(404).json({ success: false, message: 'Goods receipt not found' });
      res.json({ success: true, data: entry });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/procurement/inward-entries — draft GRN
  create: async (req, res, next) => {
    try {
      const id = await inwardEntryService.create(req.body, req.user.id);
      const entry = await inwardEntryRepository.findById(id);
      res.status(201).json({ success: true, message: `Goods receipt ${entry.inward_no} saved as draft.`, data: entry });
    } catch (error) {
      next(error);
    }
  },

  // PUT /api/procurement/inward-entries/:id — draft GRN only
  update: async (req, res, next) => {
    try {
      await inwardEntryService.update(req.params.id, req.body, req.user.id);
      const entry = await inwardEntryRepository.findById(req.params.id);
      res.json({ success: true, message: 'Goods receipt updated.', data: entry });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/procurement/inward-entries/:id/post — draft → posted (creates lots)
  post: async (req, res, next) => {
    try {
      await inwardEntryService.post(req.params.id, req.user.id);
      const entry = await inwardEntryRepository.findById(req.params.id);
      res.json({ success: true, message: `Goods receipt ${entry.inward_no} posted — ${entry.lots_count} lot(s) created.`, data: entry });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/procurement/inward-entries/:id/cancel
  cancel: async (req, res, next) => {
    try {
      await inwardEntryService.cancel(req.params.id, req.user.id);
      const entry = await inwardEntryRepository.findById(req.params.id);
      res.json({ success: true, message: `Goods receipt ${entry.inward_no} cancelled.`, data: entry });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/procurement/inward-entries/:id/approve — legacy inward QC only
  approve: async (req, res, next) => {
    try {
      await inwardEntryService.approve(req.params.id, req.body, req.user.id);
      res.json({ success: true, message: 'QC processed successfully' });
    } catch (error) {
      next(error);
    }
  },

  // DELETE /api/procurement/inward-entries/:id — draft GRN only
  destroy: async (req, res, next) => {
    try {
      await inwardEntryService.delete(req.params.id);
      res.json({ success: true, message: 'Goods receipt deleted successfully' });
    } catch (error) {
      next(error);
    }
  },
};
