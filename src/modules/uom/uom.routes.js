import express from 'express';
import { uomController } from './uom.controller.js';
import { uomValidator } from './uom.validator.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/rbac.middleware.js';

const router = express.Router();

router.use(authenticate);

// GET /api/masters/uoms
router.get('/', requirePermission('uom.view'), uomController.index);

// POST /api/masters/uoms
router.post('/', requirePermission('uom.create'), uomValidator.validateStore, uomController.store);

// GET /api/masters/uoms/:id
router.get('/:id', requirePermission('uom.view'), uomController.show);

// PUT /api/masters/uoms/:id
router.put('/:id', requirePermission('uom.edit'), uomValidator.validateUpdate, uomController.update);

// DELETE /api/masters/uoms/:id
router.delete('/:id', requirePermission('uom.delete'), uomController.destroy);

// PATCH /api/masters/uoms/:id/toggle-status
router.patch('/:id/toggle-status', requirePermission('uom.edit'), uomController.toggleStatus);

export default router;
