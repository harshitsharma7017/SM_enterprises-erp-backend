import { productionPlanService } from './production-plan.service.js';

const FILTERS = ['company_id', 'status', 'date_from', 'date_to', 'search', 'page', 'limit'];

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

const sendPlan = async (res, id, status = 200, message = null) => {
  const plan = await productionPlanService.findById(id);
  if (!plan) return res.status(404).json({ success: false, message: 'Production plan not found' });
  res.status(status).json({ success: true, message: message ? message(plan) : undefined, data: plan });
};

export const productionPlanController = {
  // GET /api/production/plans
  index: handle(async (req, res) => {
    res.json({ success: true, data: await productionPlanService.findAll(Object.fromEntries(FILTERS.map((k) => [k, req.query[k]]))) });
  }),
  // GET /api/production/plans/form-data?company_id=
  formData: handle(async (req, res) => {
    res.json({ success: true, data: await productionPlanService.formData(req.query.company_id) });
  }),
  // GET /api/production/plans/open-lines?company_id= — lines of planned plans (processing booking)
  openLines: handle(async (req, res) => {
    res.json({ success: true, data: await productionPlanService.openLines(req.query.company_id) });
  }),
  // GET /api/production/plans/:id
  show: handle(async (req, res) => sendPlan(res, req.params.id)),
  // POST /api/production/plans
  store: handle(async (req, res) => {
    const id = await productionPlanService.create(req.body || {}, req.user.id);
    await sendPlan(res, id, 201, (p) => `Production plan ${p.plan_no} saved as draft.`);
  }),
  // PUT /api/production/plans/:id
  update: handle(async (req, res) => {
    await productionPlanService.update(req.params.id, req.body || {}, req.user.id);
    await sendPlan(res, req.params.id, 200, (p) => `Production plan ${p.plan_no} updated.`);
  }),
  // POST /api/production/plans/:id/mark-planned
  markPlanned: handle(async (req, res) => {
    await productionPlanService.markPlanned(req.params.id, req.user.id);
    await sendPlan(res, req.params.id, 200, (p) => `${p.plan_no} is planned; processing can now be booked against it.`);
  }),
  // POST /api/production/plans/:id/revert-to-draft
  revertToDraft: handle(async (req, res) => {
    await productionPlanService.revertToDraft(req.params.id, req.user.id);
    await sendPlan(res, req.params.id, 200, (p) => `${p.plan_no} is back to draft.`);
  }),
  // POST /api/production/plans/:id/complete
  complete: handle(async (req, res) => {
    await productionPlanService.complete(req.params.id, req.user.id);
    await sendPlan(res, req.params.id, 200, (p) => `${p.plan_no} completed.`);
  }),
  // POST /api/production/plans/:id/cancel
  cancel: handle(async (req, res) => {
    await productionPlanService.cancel(req.params.id, req.body?.reason, req.user.id);
    await sendPlan(res, req.params.id, 200, (p) => `${p.plan_no} cancelled.`);
  }),
  // DELETE /api/production/plans/:id
  destroy: handle(async (req, res) => {
    await productionPlanService.delete(req.params.id);
    res.json({ success: true, message: 'Production plan deleted.' });
  }),
};
