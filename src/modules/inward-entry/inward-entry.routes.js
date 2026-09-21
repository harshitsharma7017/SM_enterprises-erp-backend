import express from 'express';
import { inwardEntryController } from './inward-entry.controller.js';
import { inwardEntryValidator } from './inward-entry.validator.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/rbac.middleware.js';
import { validate } from '../../middleware/validation.middleware.js';

const router = express.Router();

router.use(authenticate);

// GET /api/procurement/inward-entries
router.get('/', requirePermission('inward-entry.view'), inwardEntryController.index);

// GET /api/procurement/inward-entries/po-details/:id
router.get('/po-details/:id', requirePermission('inward-entry.view'), inwardEntryController.poDetails);

// GET /api/procurement/inward-entries/:id
router.get('/:id', requirePermission('inward-entry.view'), inwardEntryController.show);

// POST /api/procurement/inward-entries
router.post(
  '/',
  requirePermission('inward-entry.create'),
  validate(inwardEntryValidator.create),
  inwardEntryController.create
);

// PUT /api/procurement/inward-entries/:id
router.put(
  '/:id',
  requirePermission('inward-entry.edit'),
  validate(inwardEntryValidator.update),
  inwardEntryController.update
);

// DELETE /api/procurement/inward-entries/:id
router.delete('/:id', requirePermission('inward-entry.delete'), inwardEntryController.destroy);

// POST /api/procurement/inward-entries/:id/approve
router.post(
  '/:id/approve',
  requirePermission('inward-entry.approve'),
  validate(inwardEntryValidator.approve),
  inwardEntryController.approve
);

export default router;
