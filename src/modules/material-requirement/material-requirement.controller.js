import { materialRequirementService } from './material-requirement.service.js';

export const materialRequirementController = {
  // GET /api/planning/material-requirements
  index: async (req, res, next) => {
    try {
      const result = await materialRequirementService.findAll({
        search: req.query.search,
        status: req.query.status,
        company_id: req.query.company_id,
        brand_id: req.query.brand_id,
        brand_projection_id: req.query.brand_projection_id,
        plannable: req.query.plannable,
        page: req.query.page || 1,
        limit: req.query.limit || 15,
      });
      res.status(200).json({ success: true, message: 'Material requirements retrieved successfully', data: result });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/planning/material-requirements/:id
  show: async (req, res, next) => {
    try {
      const requirement = await materialRequirementService.findById(req.params.id);
      if (!requirement) return res.status(404).json({ success: false, message: 'Material requirement not found' });
      res.status(200).json({ success: true, message: 'Material requirement retrieved successfully', data: { requirement } });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/planning/material-requirements/generate  { brand_projection_id }
  generate: async (req, res, next) => {
    try {
      const ids = await materialRequirementService.generateFromProjection(req.body.brand_projection_id, req.user.id);
      res.status(201).json({ success: true, message: `${ids.length} material requirement(s) generated.`, data: { ids } });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/planning/material-requirements/:id/close
  close: async (req, res, next) => {
    try {
      const requirement = await materialRequirementService.close(req.params.id, req.body?.remarks, req.user.id);
      res.status(200).json({ success: true, message: `Requirement ${requirement.requirement_no} closed.`, data: { requirement } });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/planning/material-requirements/:id/reopen
  reopen: async (req, res, next) => {
    try {
      const requirement = await materialRequirementService.reopen(req.params.id, req.user.id);
      res.status(200).json({ success: true, message: `Requirement ${requirement.requirement_no} reopened.`, data: { requirement } });
    } catch (error) {
      next(error);
    }
  },

  // DELETE /api/planning/material-requirements/:id
  destroy: async (req, res, next) => {
    try {
      await materialRequirementService.delete(req.params.id);
      res.status(200).json({ success: true, message: 'Material requirement deleted successfully.' });
    } catch (error) {
      next(error);
    }
  },
};
