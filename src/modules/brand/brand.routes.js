import express from 'express';
import { brandController } from './brand.controller.js';
import { brandValidator } from './brand.validator.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/rbac.middleware.js';

const router = express.Router();

router.use(authenticate);

// GET /api/masters/brands
router.get('/', requirePermission('brand.view'), brandController.index);

// POST /api/masters/brands
router.post('/', requirePermission('brand.create'), brandValidator.validateStore, brandController.store);

// GET /api/masters/brands/:id
router.get('/:id', requirePermission('brand.view'), brandController.show);

// PUT /api/masters/brands/:id
router.put('/:id', requirePermission('brand.edit'), brandValidator.validateUpdate, brandController.update);

// DELETE /api/masters/brands/:id
router.delete('/:id', requirePermission('brand.delete'), brandController.destroy);

// PATCH /api/masters/brands/:id/toggle-status
router.patch('/:id/toggle-status', requirePermission('brand.edit'), brandController.toggleStatus);

export default router;
