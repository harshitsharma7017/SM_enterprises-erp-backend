import { qualityControlService } from './quality-control.service.js';
import { qualityControlRepository } from './quality-control.repository.js';

const FILTERS = ['status', 'company_id', 'supplier_id', 'purchase_order_id', 'inward_entry_id', 'lot_id', 'po', 'grn', 'lot', 'date_from', 'date_to', 'search', 'page', 'limit'];

export const qualityControlController = {
  // GET /api/quality-control
  index: async (req, res, next) => {
    try {
      const filters = Object.fromEntries(FILTERS.map((k) => [k, req.query[k]]));
      const result = await qualityControlRepository.findAll(filters);
      res.json({ success: true, data: result.rows, meta: { total: result.total, page: result.page, limit: result.limit } });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/quality-control/form-data?company_id= | ?lot_id=
  formData: async (req, res, next) => {
    try {
      const data = await qualityControlService.formData(req.query);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/quality-control/:id
  show: async (req, res, next) => {
    try {
      const qc = await qualityControlRepository.findById(req.params.id);
      if (!qc) return res.status(404).json({ success: false, message: 'Quality inspection not found' });
      res.json({ success: true, data: qc });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/quality-control — draft inspection of a lot
  create: async (req, res, next) => {
    try {
      const id = await qualityControlService.create(req.body, req.user.id);
      const qc = await qualityControlRepository.findById(id);
      res.status(201).json({ success: true, message: `Inspection ${qc.qc_no} saved as draft.`, data: qc });
    } catch (error) {
      next(error);
    }
  },

  // PUT /api/quality-control/:id — draft only
  update: async (req, res, next) => {
    try {
      await qualityControlService.update(req.params.id, req.body, req.user.id);
      const qc = await qualityControlRepository.findById(req.params.id);
      res.json({ success: true, message: 'Inspection updated.', data: qc });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/quality-control/:id/complete — draft → completed
  complete: async (req, res, next) => {
    try {
      await qualityControlService.complete(req.params.id, req.user.id);
      const qc = await qualityControlRepository.findById(req.params.id);
      res.json({ success: true, message: `Inspection ${qc.qc_no} completed.`, data: qc });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/quality-control/:id/cancel
  cancel: async (req, res, next) => {
    try {
      await qualityControlService.cancel(req.params.id, req.body?.reason, req.user.id);
      const qc = await qualityControlRepository.findById(req.params.id);
      res.json({ success: true, message: `Inspection ${qc.qc_no} cancelled.`, data: qc });
    } catch (error) {
      next(error);
    }
  },
};
