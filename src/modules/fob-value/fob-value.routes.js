import express from 'express';
import { fobValueController } from './fob-value.controller.js';
import { fobValueValidator } from './fob-value.validator.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/rbac.middleware.js';

const router = express.Router();

router.use(authenticate);

// GET /api/masters/fob-values
router.get(
  '/',
  requirePermission('fob-value.view'),
  fobValueController.index
);

// GET /api/masters/fob-values/create
router.get(
  '/create',
  requirePermission('fob-value.create'),
  fobValueController.create
);

// POST /api/masters/fob-values
router.post(
  '/',
  requirePermission('fob-value.create'),
  fobValueValidator.validateStore,
  fobValueController.store
);

// GET /api/masters/fob-values/:id
router.get(
  '/:id',
  requirePermission('fob-value.view'),
  fobValueController.show
);

// GET /api/masters/fob-values/:id/edit
router.get(
  '/:id/edit',
  requirePermission('fob-value.edit'),
  fobValueController.edit
);

// PUT /api/masters/fob-values/:id
router.put(
  '/:id',
  requirePermission('fob-value.edit'),
  fobValueValidator.validateUpdate,
  fobValueController.update
);

// DELETE /api/masters/fob-values/:id
router.delete(
  '/:id',
  requirePermission('fob-value.delete'),
  fobValueController.destroy
);

// PATCH /api/masters/fob-values/:id/toggle-status
router.patch(
  '/:id/toggle-status',
  requirePermission('fob-value.edit'),
  fobValueController.toggleStatus
);

export default router;
