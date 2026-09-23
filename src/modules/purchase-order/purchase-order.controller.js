import { purchaseOrderService } from './purchase-order.service.js';
import { purchaseOrderRepository } from './purchase-order.repository.js';

export const purchaseOrderController = {
  index: async (req, res, next) => {
    try {
      const { search, limit = 15, page = 1, sort, direction, supplier_id, status, company_id } = req.query;
      const offset = (page - 1) * limit;

      const { rows, total } = await purchaseOrderRepository.findAll({
        search, limit, offset, sort, direction, supplier_id, status, company_id
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
      const po = await purchaseOrderService.create(req.body, userId);
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
      
      const po = await purchaseOrderService.update(poId, req.body, userId);
      res.json({
        success: true,
        message: 'Purchase Order updated successfully',
        data: po
      });
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
