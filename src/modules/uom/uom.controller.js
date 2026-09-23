import { uomService } from './uom.service.js';

const sendKnownError = (res, error) => {
  if (error.status === 404 || error.status === 400) {
    res.status(error.status).json({ success: false, message: error.message });
    return true;
  }
  return false;
};

export const uomController = {
  // GET /api/masters/uoms
  index: async (req, res, next) => {
    try {
      const result = await uomService.findAll({
        search: req.query.search,
        status: req.query.status,
        page: req.query.page || 1,
        limit: req.query.limit || 15,
      });
      res.status(200).json({ success: true, message: 'UOMs retrieved successfully', data: result });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/masters/uoms/:id
  show: async (req, res, next) => {
    try {
      const uom = await uomService.findById(req.params.id);
      if (!uom) return res.status(404).json({ success: false, message: 'UOM not found' });
      res.status(200).json({ success: true, message: 'UOM retrieved successfully', data: { uom } });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/masters/uoms
  store: async (req, res, next) => {
    try {
      const uom = await uomService.create(req.body, req.user.id);
      res.status(201).json({ success: true, message: `UOM ${uom.code} created successfully.`, data: { uom } });
    } catch (error) {
      next(error);
    }
  },

  // PUT /api/masters/uoms/:id
  update: async (req, res, next) => {
    try {
      const uom = await uomService.update(req.params.id, req.body, req.user.id);
      res.status(200).json({ success: true, message: `UOM ${uom.code} updated successfully.`, data: { uom } });
    } catch (error) {
      if (sendKnownError(res, error)) return;
      next(error);
    }
  },

  // PATCH /api/masters/uoms/:id/toggle-status
  toggleStatus: async (req, res, next) => {
    try {
      const uom = await uomService.toggleStatus(req.params.id, req.user.id);
      res.status(200).json({ success: true, message: `UOM ${uom.code} marked ${uom.status}.`, data: { uom } });
    } catch (error) {
      if (sendKnownError(res, error)) return;
      next(error);
    }
  },

  // DELETE /api/masters/uoms/:id
  destroy: async (req, res, next) => {
    try {
      await uomService.delete(req.params.id);
      res.status(200).json({ success: true, message: 'UOM deleted successfully.' });
    } catch (error) {
      if (sendKnownError(res, error)) return;
      next(error);
    }
  },
};
