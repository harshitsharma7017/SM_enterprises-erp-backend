import express from 'express';
import { orderFormatController } from './order-format.controller.js';
import { orderFormatValidator } from './order-format.validator.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/rbac.middleware.js';
import { uploadMiddleware, handleUploadErrors } from '../../middleware/upload.middleware.js';

const router = express.Router();

router.use(authenticate);

// GET /api/masters/formats
router.get(
  '/', 
  requirePermission('po-format.view'), 
  orderFormatController.index
);

// GET /api/masters/formats/defaults
router.get(
  '/defaults',
  requirePermission('po-format.view'),
  orderFormatController.getDefaults
);

// POST /api/masters/formats
router.post(
  '/', 
  requirePermission('po-format.create'),
  handleUploadErrors(uploadMiddleware.array('images', 10)),
  orderFormatValidator.validateStore,
  orderFormatController.store
);

// GET /api/masters/formats/:id
router.get(
  '/:id', 
  requirePermission('po-format.view'), 
  orderFormatController.show
);

// PUT /api/masters/formats/:id
router.put(
  '/:id', 
  requirePermission('po-format.edit'),
  handleUploadErrors(uploadMiddleware.array('images', 10)),
  orderFormatValidator.validateUpdate,
  orderFormatController.update
);

// DELETE /api/masters/formats/:id
router.delete(
  '/:id', 
  requirePermission('po-format.delete'), 
  orderFormatController.destroy
);

// PATCH /api/masters/formats/:id/toggle-status
router.patch(
  '/:id/toggle-status', 
  requirePermission('po-format.edit'), 
  orderFormatController.toggleStatus
);

export default router;
