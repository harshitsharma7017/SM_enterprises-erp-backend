import express from 'express';
import { materialTypeController } from './material-type.controller.js';
import { materialTypeValidator } from './material-type.validator.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/rbac.middleware.js';

const router = express.Router();

router.use(authenticate);

// GET /api/masters/material-types
router.get('/', requirePermission('material-type.view'), materialTypeController.index);

// POST /api/masters/material-types
router.post('/', requirePermission('material-type.create'), materialTypeValidator.validateStore, materialTypeController.store);

// GET /api/masters/material-types/:id
router.get('/:id', requirePermission('material-type.view'), materialTypeController.show);

// PUT /api/masters/material-types/:id
router.put('/:id', requirePermission('material-type.edit'), materialTypeValidator.validateUpdate, materialTypeController.update);

// DELETE /api/masters/material-types/:id
router.delete('/:id', requirePermission('material-type.delete'), materialTypeController.destroy);

// PATCH /api/masters/material-types/:id/toggle-status
router.patch('/:id/toggle-status', requirePermission('material-type.edit'), materialTypeController.toggleStatus);

export default router;
