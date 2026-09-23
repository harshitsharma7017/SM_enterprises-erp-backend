import express from 'express';
import { brandProjectionController } from './brand-projection.controller.js';
import { brandProjectionValidator } from './brand-projection.validator.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requirePermission, requireAnyPermission } from '../../middleware/rbac.middleware.js';

const router = express.Router();

router.use(authenticate);

// GET /api/planning/brand-projections
router.get('/', requirePermission('brand-projection.view'), brandProjectionController.index);

// GET /api/planning/brand-projections/form-data — brands/products for the create & edit forms
router.get(
  '/form-data',
  requireAnyPermission(['brand-projection.create', 'brand-projection.edit']),
  brandProjectionController.formData
);

// POST /api/planning/brand-projections
router.post('/', requirePermission('brand-projection.create'), brandProjectionValidator.validateStore, brandProjectionController.store);

// GET /api/planning/brand-projections/:id
router.get('/:id', requirePermission('brand-projection.view'), brandProjectionController.show);

// PUT /api/planning/brand-projections/:id
router.put('/:id', requirePermission('brand-projection.edit'), brandProjectionValidator.validateUpdate, brandProjectionController.update);

// POST /api/planning/brand-projections/:id/finalize
router.post('/:id/finalize', requirePermission('brand-projection.edit'), brandProjectionController.finalize);

// POST /api/planning/brand-projections/:id/reopen
router.post('/:id/reopen', requirePermission('brand-projection.edit'), brandProjectionController.reopen);

// DELETE /api/planning/brand-projections/:id
router.delete('/:id', requirePermission('brand-projection.delete'), brandProjectionController.destroy);

export default router;
