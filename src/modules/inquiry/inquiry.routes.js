import express from 'express';
import { inquiryController } from './inquiry.controller.js';
import { inquiryValidator } from './inquiry.validator.js';
import { orderConfirmationController } from '../order-confirmation/order-confirmation.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requirePermission, requireAnyPermission } from '../../middleware/rbac.middleware.js';

const router = express.Router();

router.use(authenticate);

// Cascade lookups for an item row — auth only, no inquiry.* permission,
// matching InquiryController::products()/suppliers() exactly (same call as
// GeoController's cascades / SupplierController::agents()).
router.get('/products', inquiryController.products);
router.get('/suppliers', inquiryController.suppliers);

// Quick-add for the Source field — reachable from either the create or
// edit form.
router.post(
  '/sources',
  requireAnyPermission(['inquiry.create', 'inquiry.edit']),
  inquiryValidator.validateSource,
  inquiryController.storeSource
);

// GET /api/inquiries/:id/pdf
router.get('/:id/pdf', requirePermission('inquiry.view'), inquiryController.pdf);

// GET /api/inquiries/:id/xlsx
router.get('/:id/xlsx', requirePermission('inquiry.view'), inquiryController.xlsx);

// GET /api/inquiries
router.get('/', requirePermission('inquiry.view'), inquiryController.index);

// GET /api/inquiries/create
router.get('/create', requirePermission('inquiry.create'), inquiryController.create);

// POST /api/inquiries
router.post(
  '/',
  requirePermission('inquiry.create'),
  inquiryValidator.validateStore,
  inquiryController.store
);

// GET /api/inquiries/:id
router.get('/:id', requirePermission('inquiry.view'), inquiryController.show);

// GET /api/inquiries/:id/edit
router.get('/:id/edit', requirePermission('inquiry.edit'), inquiryController.edit);

// PUT /api/inquiries/:id
router.put(
  '/:id',
  requirePermission('inquiry.edit'),
  inquiryValidator.validateUpdate,
  inquiryController.update
);

// DELETE /api/inquiries/:id
router.delete('/:id', requirePermission('inquiry.delete'), inquiryController.destroy);

// POST /api/inquiries/:id/convert-to-oc
router.post(
  '/:id/convert-to-oc',
  requirePermission('order-confirmation.create'),
  orderConfirmationController.convertFromInquiry
);

export default router;
