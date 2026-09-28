import { brandSpecService } from './brand-spec.service.js';

const handle = (fn) => async (req, res, next) => {
  try {
    await fn(req, res);
  } catch (error) {
    if ([404, 422].includes(error.status)) {
      return res.status(error.status).json({ success: false, message: error.message, ...(error.errors ? { errors: error.errors } : {}) });
    }
    next(error);
  }
};

export const brandSpecController = {
  // GET /api/masters/brands/:id/specs
  index: handle(async (req, res) => {
    res.json({ success: true, data: await brandSpecService.list(req.params.id) });
  }),

  // POST /api/masters/brands/:id/specs
  store: handle(async (req, res) => {
    const spec = await brandSpecService.create(req.params.id, req.body || {}, req.user.id);
    res.status(201).json({ success: true, message: `Specification for ${spec.product_name} saved.`, data: spec });
  }),

  // PUT /api/masters/brands/:id/specs/:specId
  update: handle(async (req, res) => {
    const spec = await brandSpecService.update(req.params.id, req.params.specId, req.body || {}, req.user.id);
    res.json({ success: true, message: `Specification for ${spec.product_name} updated.`, data: spec });
  }),

  // DELETE /api/masters/brands/:id/specs/:specId
  destroy: handle(async (req, res) => {
    await brandSpecService.delete(req.params.id, req.params.specId);
    res.json({ success: true, message: 'Specification deleted.' });
  }),
};
