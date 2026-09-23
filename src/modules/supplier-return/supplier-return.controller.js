import { supplierReturnService } from './supplier-return.service.js';
import { supplierReturnRepository } from './supplier-return.repository.js';

const FILTERS = ['status', 'company_id', 'supplier_id', 'purchase_order_id', 'inward_entry_id', 'lot_id', 'quality_inspection_id', 'po', 'grn', 'lot', 'date_from', 'date_to', 'search', 'page', 'limit'];

export const supplierReturnController = {
  // GET /api/procurement/supplier-returns
  index: async (req, res, next) => {
    try {
      const filters = Object.fromEntries(FILTERS.map((k) => [k, req.query[k]]));
      const result = await supplierReturnRepository.findAll(filters);
      res.json({ success: true, data: result.rows, meta: { total: result.total, page: result.page, limit: result.limit } });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/procurement/supplier-returns/form-data?company_id= | ?quality_inspection_id=
  formData: async (req, res, next) => {
    try {
      const data = await supplierReturnService.formData(req.query);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/procurement/supplier-returns/:id
  show: async (req, res, next) => {
    try {
      const ret = await supplierReturnRepository.findById(req.params.id);
      if (!ret) return res.status(404).json({ success: false, message: 'Supplier return not found' });
      res.json({ success: true, data: ret });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/procurement/supplier-returns — draft return
  create: async (req, res, next) => {
    try {
      const id = await supplierReturnService.create(req.body, req.user.id);
      const ret = await supplierReturnRepository.findById(id);
      res.status(201).json({ success: true, message: `Supplier return ${ret.return_no} saved as draft.`, data: ret });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/procurement/supplier-returns/:id/post
  post: async (req, res, next) => {
    try {
      await supplierReturnService.post(req.params.id, req.user.id);
      const ret = await supplierReturnRepository.findById(req.params.id);
      res.json({ success: true, message: `Supplier return ${ret.return_no} posted.`, data: ret });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/procurement/supplier-returns/:id/cancel
  cancel: async (req, res, next) => {
    try {
      await supplierReturnService.cancel(req.params.id, req.user.id);
      const ret = await supplierReturnRepository.findById(req.params.id);
      res.json({ success: true, message: `Supplier return ${ret.return_no} cancelled.`, data: ret });
    } catch (error) {
      next(error);
    }
  },
};
