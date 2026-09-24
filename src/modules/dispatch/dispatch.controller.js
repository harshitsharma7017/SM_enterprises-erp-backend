import { dispatchService } from './dispatch.service.js';
import { dispatchRepository } from './dispatch.repository.js';

const FILTERS = ['company_id', 'dispatch_type', 'status', 'buyer_id', 'order_confirmation_id', 'purchase_order_id', 'supplier_id', 'order', 'po', 'date_from', 'date_to', 'search', 'page', 'limit'];

const send = async (res, id, status, message) => {
  const dispatch = await dispatchRepository.findById(id);
  if (!dispatch) return res.status(404).json({ success: false, message: 'Dispatch not found' });
  res.status(status).json({ success: true, message: message?.(dispatch), data: dispatch });
};

export const dispatchController = {
  // GET /api/dispatches
  index: async (req, res, next) => {
    try {
      const result = await dispatchRepository.findAll(Object.fromEntries(FILTERS.map((k) => [k, req.query[k]])));
      res.json({ success: true, data: result.rows, meta: { total: result.total, page: result.page, limit: result.limit } });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/dispatches/form-data?type=&company_id= | &order_confirmation_id=&location_id= | &purchase_order_id=
  formData: async (req, res, next) => {
    try {
      res.json({ success: true, data: await dispatchService.formData(req.query) });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/dispatches/:id
  show: async (req, res, next) => {
    try {
      await send(res, req.params.id, 200);
    } catch (error) {
      next(error);
    }
  },

  // POST /api/dispatches — draft
  create: async (req, res, next) => {
    try {
      const id = await dispatchService.create(req.body, req.user.id);
      await send(res, id, 201, (d) => `Dispatch ${d.dispatch_no} saved as draft.`);
    } catch (error) {
      next(error);
    }
  },

  // PUT /api/dispatches/:id — draft only
  update: async (req, res, next) => {
    try {
      await dispatchService.update(req.params.id, req.body, req.user.id);
      await send(res, req.params.id, 200, () => 'Dispatch updated.');
    } catch (error) {
      next(error);
    }
  },

  // POST /api/dispatches/:id/post
  post: async (req, res, next) => {
    try {
      await dispatchService.post(req.params.id, req.user.id);
      await send(res, req.params.id, 200, (d) => `Dispatch ${d.dispatch_no} posted.`);
    } catch (error) {
      next(error);
    }
  },

  // POST /api/dispatches/:id/cancel — draft only
  cancel: async (req, res, next) => {
    try {
      await dispatchService.cancel(req.params.id, req.body?.reason, req.user.id);
      await send(res, req.params.id, 200, (d) => `Dispatch ${d.dispatch_no} cancelled.`);
    } catch (error) {
      next(error);
    }
  },
};
