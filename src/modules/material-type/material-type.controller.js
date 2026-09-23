import { materialTypeService } from './material-type.service.js';

const sendKnownError = (res, error) => {
  if (error.status === 404 || error.status === 400) {
    res.status(error.status).json({ success: false, message: error.message });
    return true;
  }
  return false;
};

export const materialTypeController = {
  // GET /api/masters/material-types
  index: async (req, res, next) => {
    try {
      const result = await materialTypeService.findAll({
        search: req.query.search,
        status: req.query.status,
        company_id: req.query.company_id,
        page: req.query.page || 1,
        limit: req.query.limit || 15,
      });
      res.status(200).json({ success: true, message: 'Material types retrieved successfully', data: result });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/masters/material-types/:id
  show: async (req, res, next) => {
    try {
      const materialType = await materialTypeService.findById(req.params.id);
      if (!materialType) return res.status(404).json({ success: false, message: 'Material type not found' });
      res.status(200).json({ success: true, message: 'Material type retrieved successfully', data: { materialType } });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/masters/material-types
  store: async (req, res, next) => {
    try {
      const materialType = await materialTypeService.create(req.body, req.user.id);
      res.status(201).json({ success: true, message: `Material type ${materialType.code} created successfully.`, data: { materialType } });
    } catch (error) {
      next(error);
    }
  },

  // PUT /api/masters/material-types/:id
  update: async (req, res, next) => {
    try {
      const materialType = await materialTypeService.update(req.params.id, req.body, req.user.id);
      res.status(200).json({ success: true, message: `Material type ${materialType.code} updated successfully.`, data: { materialType } });
    } catch (error) {
      if (sendKnownError(res, error)) return;
      next(error);
    }
  },

  // PATCH /api/masters/material-types/:id/toggle-status
  toggleStatus: async (req, res, next) => {
    try {
      const materialType = await materialTypeService.toggleStatus(req.params.id, req.user.id);
      res.status(200).json({ success: true, message: `Material type ${materialType.code} marked ${materialType.status}.`, data: { materialType } });
    } catch (error) {
      if (sendKnownError(res, error)) return;
      next(error);
    }
  },

  // DELETE /api/masters/material-types/:id
  destroy: async (req, res, next) => {
    try {
      await materialTypeService.delete(req.params.id);
      res.status(200).json({ success: true, message: 'Material type deleted successfully.' });
    } catch (error) {
      if (sendKnownError(res, error)) return;
      next(error);
    }
  },
};
