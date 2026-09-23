import { materialPlanService } from './material-plan.service.js';

const respond = (res, status, message, plan) => res.status(status).json({ success: true, message, data: { plan } });

export const materialPlanController = {
  // GET /api/planning/material-plans
  index: async (req, res, next) => {
    try {
      const result = await materialPlanService.findAll({
        search: req.query.search,
        status: req.query.status,
        company_id: req.query.company_id,
        period_from: req.query.period_from,
        period_to: req.query.period_to,
        page: req.query.page || 1,
        limit: req.query.limit || 15,
      });
      res.status(200).json({ success: true, message: 'Material plans retrieved successfully', data: result });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/planning/material-plans/:id
  show: async (req, res, next) => {
    try {
      const plan = await materialPlanService.findById(req.params.id);
      if (!plan) return res.status(404).json({ success: false, message: 'Material plan not found' });
      respond(res, 200, 'Material plan retrieved successfully', plan);
    } catch (error) {
      next(error);
    }
  },

  // POST /api/planning/material-plans
  store: async (req, res, next) => {
    try {
      const plan = await materialPlanService.create(req.body, req.validatedItems, req.user.id);
      respond(res, 201, `Material plan ${plan.plan_no} created successfully.`, plan);
    } catch (error) {
      next(error);
    }
  },

  // PUT /api/planning/material-plans/:id
  update: async (req, res, next) => {
    try {
      const plan = await materialPlanService.update(req.params.id, req.body, req.validatedItems, req.user.id);
      respond(res, 200, `Material plan ${plan.plan_no} updated successfully.`, plan);
    } catch (error) {
      next(error);
    }
  },

  // POST /api/planning/material-plans/:id/mark-planned
  markPlanned: async (req, res, next) => {
    try {
      const plan = await materialPlanService.markPlanned(req.params.id, req.user.id);
      respond(res, 200, `Material plan ${plan.plan_no} marked planned.`, plan);
    } catch (error) {
      next(error);
    }
  },

  // POST /api/planning/material-plans/:id/revert-to-draft
  revertToDraft: async (req, res, next) => {
    try {
      const plan = await materialPlanService.revertToDraft(req.params.id, req.user.id);
      respond(res, 200, `Material plan ${plan.plan_no} reverted to draft.`, plan);
    } catch (error) {
      next(error);
    }
  },

  // POST /api/planning/material-plans/:id/close
  close: async (req, res, next) => {
    try {
      const plan = await materialPlanService.close(req.params.id, req.user.id);
      respond(res, 200, `Material plan ${plan.plan_no} closed.`, plan);
    } catch (error) {
      next(error);
    }
  },

  // DELETE /api/planning/material-plans/:id
  destroy: async (req, res, next) => {
    try {
      await materialPlanService.delete(req.params.id);
      res.status(200).json({ success: true, message: 'Material plan deleted successfully.' });
    } catch (error) {
      next(error);
    }
  },
};
