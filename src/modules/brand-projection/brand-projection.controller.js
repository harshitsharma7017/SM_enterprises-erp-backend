import { brandProjectionService } from './brand-projection.service.js';

export const brandProjectionController = {
  // GET /api/planning/brand-projections
  index: async (req, res, next) => {
    try {
      const result = await brandProjectionService.findAll({
        search: req.query.search,
        status: req.query.status,
        company_id: req.query.company_id,
        brand_id: req.query.brand_id,
        period_from: req.query.period_from,
        period_to: req.query.period_to,
        page: req.query.page || 1,
        limit: req.query.limit || 15,
      });
      res.status(200).json({ success: true, message: 'Brand projections retrieved successfully', data: result });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/planning/brand-projections/form-data
  formData: async (req, res, next) => {
    try {
      const data = await brandProjectionService.getFormData(req.query.projection_id || null);
      res.status(200).json({ success: true, message: 'Form data retrieved successfully', data });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/planning/brand-projections/:id
  show: async (req, res, next) => {
    try {
      const projection = await brandProjectionService.findById(req.params.id);
      if (!projection) return res.status(404).json({ success: false, message: 'Brand projection not found' });
      res.status(200).json({ success: true, message: 'Brand projection retrieved successfully', data: { projection } });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/planning/brand-projections
  store: async (req, res, next) => {
    try {
      const projection = await brandProjectionService.create(req.body, req.validatedItems, req.user.id);
      res.status(201).json({ success: true, message: `Brand projection ${projection.projection_no} created successfully.`, data: { projection } });
    } catch (error) {
      next(error);
    }
  },

  // PUT /api/planning/brand-projections/:id
  update: async (req, res, next) => {
    try {
      const projection = await brandProjectionService.update(req.params.id, req.body, req.validatedItems, req.user.id);
      res.status(200).json({ success: true, message: `Brand projection ${projection.projection_no} updated successfully.`, data: { projection } });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/planning/brand-projections/:id/finalize
  finalize: async (req, res, next) => {
    try {
      const projection = await brandProjectionService.finalize(req.params.id, req.user.id);
      res.status(200).json({ success: true, message: `Brand projection ${projection.projection_no} finalized.`, data: { projection } });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/planning/brand-projections/:id/reopen
  reopen: async (req, res, next) => {
    try {
      const projection = await brandProjectionService.reopen(req.params.id, req.user.id);
      res.status(200).json({ success: true, message: `Brand projection ${projection.projection_no} reopened as draft.`, data: { projection } });
    } catch (error) {
      next(error);
    }
  },

  // DELETE /api/planning/brand-projections/:id
  destroy: async (req, res, next) => {
    try {
      await brandProjectionService.delete(req.params.id);
      res.status(200).json({ success: true, message: 'Brand projection deleted successfully.' });
    } catch (error) {
      next(error);
    }
  },
};
