import { orderConfirmationService } from './order-confirmation.service.js';
import { orderFulfilmentService } from './order-fulfilment.service.js';
import { orderConfirmationRepository } from './order-confirmation.repository.js';

export const orderConfirmationController = {
  index: async (req, res, next) => {
    try {
      const { search, limit = 15, page = 1, sort, direction, buyer_id, status, company_id, date_from, date_to } = req.query;
      const offset = (page - 1) * limit;
      const brand_id = Number.isInteger(Number(req.query.brand_id)) && Number(req.query.brand_id) > 0 ? Number(req.query.brand_id) : null;

      const { rows, total } = await orderConfirmationRepository.findAll({
        search, limit, offset, sort, direction, buyer_id, status, company_id, brand_id, date_from, date_to
      });

      res.json({
        success: true,
        data: await orderFulfilmentService.decorateList(rows),
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
      // Just an endpoint that could return meta-data required for the create form
      res.json({ success: true, message: 'Create form dependencies can be fetched here.' });
    } catch (error) {
      next(error);
    }
  },

  store: async (req, res, next) => {
    try {
      const userId = req.user.id;
      const oc = await orderConfirmationService.create(req.body, userId);
      res.status(201).json({
        success: true,
        message: 'Order Confirmation created successfully',
        data: oc
      });
    } catch (error) {
      next(error);
    }
  },

  show: async (req, res, next) => {
    try {
      const oc = await orderConfirmationRepository.findById(req.params.id);
      if (!oc) {
        return res.status(404).json({ success: false, message: 'Order Confirmation not found' });
      }
      res.json({ success: true, data: oc });
    } catch (error) {
      next(error);
    }
  },

  edit: async (req, res, next) => {
    try {
      const oc = await orderConfirmationRepository.findById(req.params.id);
      if (!oc) {
        return res.status(404).json({ success: false, message: 'Order Confirmation not found' });
      }
      res.json({ success: true, data: oc });
    } catch (error) {
      next(error);
    }
  },

  update: async (req, res, next) => {
    try {
      const userId = req.user.id;
      const ocId = req.params.id;
      
      const existing = await orderConfirmationRepository.findById(ocId);
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Order Confirmation not found' });
      }
      
      const oc = await orderConfirmationService.update(ocId, req.body, userId);
      res.json({
        success: true,
        message: 'Order Confirmation updated successfully',
        data: oc
      });
    } catch (error) {
      next(error);
    }
  },

  destroy: async (req, res, next) => {
    try {
      const existing = await orderConfirmationRepository.findById(req.params.id);
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Order Confirmation not found' });
      }

      await orderConfirmationService.delete(req.params.id);
      res.json({ success: true, message: 'Order Confirmation deleted successfully' });
    } catch (error) {
      next(error);
    }
  },

  convertFromInquiry: async (req, res, next) => {
    try {
      const inquiryId = req.params.id;
      const userId = req.user.id;
      
      const oc = await orderConfirmationService.convertFromInquiry(inquiryId, userId);
      
      res.status(201).json({
        success: true,
        message: 'Inquiry converted to Order Confirmation successfully',
        data: oc
      });
    } catch (error) {
      next(error);
    }
  },

  raisePurchaseOrders: async (req, res, next) => {
    try {
      const ocId = req.params.id;
      const { item_ids } = req.body;
      const userId = req.user.id;
      
      const purchaseOrders = await orderConfirmationService.raisePurchaseOrders(ocId, item_ids, userId);
      
      res.status(201).json({
        success: true,
        message: `Successfully raised ${purchaseOrders.length} Purchase Order(s)`,
        data: purchaseOrders
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/sales/order-confirmations/form-brands?company_id=
  formBrands: async (req, res, next) => {
    try {
      res.json({ success: true, data: await orderConfirmationRepository.findFormBrands(req.query.company_id) });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/sales/order-confirmations/:id/cancel
  cancel: async (req, res, next) => {
    try {
      const oc = await orderConfirmationService.cancel(req.params.id, req.body?.reason, req.user.id);
      res.json({ success: true, message: `Order ${oc.oc_num} cancelled.`, data: oc });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/sales/order-confirmations/:id/fulfilment — ordered / produced / dispatched / pending
  fulfilment: async (req, res, next) => {
    try {
      res.json({ success: true, data: await orderFulfilmentService.fulfilment(req.params.id) });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/sales/order-confirmations/:id/allocation-form-data?item_id=
  allocationFormData: async (req, res, next) => {
    try {
      res.json({ success: true, data: await orderFulfilmentService.allocationFormData(req.params.id, req.query.item_id) });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/sales/order-confirmations/:id/allocations
  allocate: async (req, res, next) => {
    try {
      await orderFulfilmentService.allocate(req.params.id, req.body, req.user.id);
      res.status(201).json({ success: true, message: 'Production allocated to the order.', data: await orderFulfilmentService.fulfilment(req.params.id) });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/sales/order-confirmations/:id/allocations/:allocationId/cancel
  cancelAllocation: async (req, res, next) => {
    try {
      await orderFulfilmentService.cancelAllocation(req.params.id, req.params.allocationId, req.body?.reason, req.user.id);
      res.json({ success: true, message: 'Allocation cancelled.', data: await orderFulfilmentService.fulfilment(req.params.id) });
    } catch (error) {
      next(error);
    }
  },
};
