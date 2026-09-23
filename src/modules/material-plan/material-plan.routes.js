import express from 'express';
import { materialPlanController } from './material-plan.controller.js';
import { materialPlanValidator } from './material-plan.validator.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/rbac.middleware.js';

const router = express.Router();

router.use(authenticate);

// GET /api/planning/material-plans
router.get('/', requirePermission('material-plan.view'), materialPlanController.index);

// POST /api/planning/material-plans
router.post('/', requirePermission('material-plan.create'), materialPlanValidator.validateStore, materialPlanController.store);

// GET /api/planning/material-plans/:id
router.get('/:id', requirePermission('material-plan.view'), materialPlanController.show);

// PUT /api/planning/material-plans/:id
router.put('/:id', requirePermission('material-plan.edit'), materialPlanValidator.validateUpdate, materialPlanController.update);

// POST /api/planning/material-plans/:id/mark-planned
router.post('/:id/mark-planned', requirePermission('material-plan.edit'), materialPlanController.markPlanned);

// POST /api/planning/material-plans/:id/revert-to-draft
router.post('/:id/revert-to-draft', requirePermission('material-plan.edit'), materialPlanController.revertToDraft);

// POST /api/planning/material-plans/:id/close
router.post('/:id/close', requirePermission('material-plan.edit'), materialPlanController.close);

// DELETE /api/planning/material-plans/:id
router.delete('/:id', requirePermission('material-plan.delete'), materialPlanController.destroy);

export default router;
