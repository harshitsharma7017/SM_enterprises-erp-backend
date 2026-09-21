import express from 'express';
import { categoryController } from './category.controller.js';
import { categoryValidator } from './category.validator.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/rbac.middleware.js';

const router = express.Router();

router.use(authenticate);

// GET /api/masters/categories
router.get(
  '/', 
  requirePermission('category.view'), 
  categoryController.index
);

// POST /api/masters/categories
router.post(
  '/', 
  requirePermission('category.create'), 
  categoryValidator.validateStoreCategory, 
  categoryController.store
);

// GET /api/masters/categories/:id
router.get(
  '/:id', 
  requirePermission('category.view'), 
  categoryController.show
);

// PUT /api/masters/categories/:id
router.put(
  '/:id', 
  requirePermission('category.edit'), 
  categoryValidator.validateUpdateCategory, 
  categoryController.update
);

// DELETE /api/masters/categories/:id
router.delete(
  '/:id', 
  requirePermission('category.delete'), 
  categoryController.destroy
);

// PATCH /api/masters/categories/:id/toggle-status
router.patch(
  '/:id/toggle-status', 
  requirePermission('category.edit'), 
  categoryController.toggleStatus
);

export default router;
