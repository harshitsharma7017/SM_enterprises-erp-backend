import { purchaseOrderService } from './purchase-order.service.js';
import { purchaseOrderRepository } from './purchase-order.repository.js';
import { garmentPoService, GARMENT_ORIGINS } from './garment-po.service.js';

export const purchaseOrderController = {
  index: async (req, res, next) => {
    try {
      const { search, limit = 15, page = 1, sort, direction, supplier_id, status, company_id, origin } = req.query;
      const offset = (page - 1) * limit;

      const { rows, total } = await purchaseOrderRepository.findAll({
        search, limit, offset, sort, direction, supplier_id, status, company_id, origin
      });

      res.json({
        success: true,
        data: rows,
        meta: {
          total,
          page: Number(page),
          last_page: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      next(error);
    }
  },

  create: async (req, res, next) => {
    try {
      res.json({ success: true, message: 'Create form dependencies can be fetched here.' });
    } catch (error) {
      next(error);
    }
  },

  store: async (req, res, next) => {
    try {
      const userId = req.user.id;
      const po = req.garmentPo
        ? await garmentPoService.create(req.body, userId)
        : await purchaseOrderService.create(req.body, userId);
      res.status(201).json({
        success: true,
        message: 'Purchase Order created successfully',
        data: po
      });
    } catch (error) {
      next(error);
    }
  },

  show: async (req, res, next) => {
    try {
      const po = await purchaseOrderRepository.findById(req.params.id);
      if (!po) {
        return res.status(404).json({ success: false, message: 'Purchase Order not found' });
      }
      res.json({ success: true, data: po });
    } catch (error) {
      next(error);
    }
  },

  edit: async (req, res, next) => {
    try {
      const po = await purchaseOrderRepository.findById(req.params.id);
      if (!po) {
        return res.status(404).json({ success: false, message: 'Purchase Order not found' });
      }
      res.json({ success: true, data: po });
    } catch (error) {
      next(error);
    }
  },

  update: async (req, res, next) => {
    try {
      const userId = req.user.id;
      const poId = req.params.id;
      
      const existing = await purchaseOrderRepository.findById(poId);
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Purchase Order not found' });
      }
      
      const po = req.garmentPo
        ? await garmentPoService.update(poId, req.body, userId)
        : await purchaseOrderService.update(poId, req.body, userId);
      res.json({
        success: true,
        message: 'Purchase Order updated successfully',
        data: po
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/procurement/purchase-orders/procurement-sources
  // Suppliers + requirements (or a planned material plan's lines) with
  // Required / Ordered / Remaining, for the planning-origin PO form.
  sources: async (req, res, next) => {
    try {
      const companyId = Number(req.query.company_id);
      const origin = req.query.origin;
      if (!Number.isInteger(companyId) || companyId <= 0 || !GARMENT_ORIGINS.includes(origin)) {
        return res.status(400).json({ success: false, message: 'Validation failed', errors: ['company_id and a planning origin are required'] });
      }
      const data = await garmentPoService.getSources({
        companyId,
        origin,
        planId: req.query.material_plan_id ? Number(req.query.material_plan_id) : null,
        poId: req.query.purchase_order_id ? Number(req.query.purchase_order_id) : null,
      });
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/procurement/purchase-orders/:id/confirm  (draft → raised)
  confirm: async (req, res, next) => {
    try {
      const po = await garmentPoService.confirm(req.params.id, req.user.id);
      res.json({ success: true, message: `Purchase Order ${po.po_num} confirmed.`, data: po });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/procurement/purchase-orders/:id/cancel  (draft/raised → cancelled)
  cancel: async (req, res, next) => {
    try {
      const po = await garmentPoService.cancel(req.params.id, req.user.id);
      res.json({ success: true, message: `Purchase Order ${po.po_num} cancelled.`, data: po });
    } catch (error) {
      next(error);
    }
  },

  destroy: async (req, res, next) => {
    try {
      const existing = await purchaseOrderRepository.findById(req.params.id);
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Purchase Order not found' });
      }

      await purchaseOrderService.delete(req.params.id);
      res.json({ success: true, message: 'Purchase Order deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
};
