import express from 'express';
import { productionPlanController } from './production-plan.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requirePermission, requireAnyPermission } from '../../middleware/rbac.middleware.js';

const router = express.Router();

router.use(authenticate);

router.get('/', requirePermission('production-plan.view'), productionPlanController.index);
router.get('/form-data', requireAnyPermission(['production-plan.create', 'production-plan.edit']), productionPlanController.formData);
// Booking processing against a plan line happens on the processing screen.
router.get('/open-lines', requireAnyPermission(['processing.edit', 'production-plan.view']), productionPlanController.openLines);
router.get('/:id', requirePermission('production-plan.view'), productionPlanController.show);
router.post('/', requirePermission('production-plan.create'), productionPlanController.store);
router.put('/:id', requirePermission('production-plan.edit'), productionPlanController.update);
router.post('/:id/mark-planned', requirePermission('production-plan.edit'), productionPlanController.markPlanned);
router.post('/:id/revert-to-draft', requirePermission('production-plan.edit'), productionPlanController.revertToDraft);
router.post('/:id/complete', requirePermission('production-plan.edit'), productionPlanController.complete);
router.post('/:id/cancel', requirePermission('production-plan.edit'), productionPlanController.cancel);
router.delete('/:id', requirePermission('production-plan.delete'), productionPlanController.destroy);

export default router;
