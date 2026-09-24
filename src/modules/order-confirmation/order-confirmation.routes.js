import express from 'express';
import { orderConfirmationController } from './order-confirmation.controller.js';
import { orderConfirmationValidator } from './order-confirmation.validator.js';
import { exportDocumentController } from '../export-document/export-document.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requirePermission, requireAnyPermission } from '../../middleware/rbac.middleware.js';

const router = express.Router();

router.use(authenticate);

// GET /api/sales/order-confirmations
router.get('/', requirePermission('order-confirmation.view'), orderConfirmationController.index);

// GET /api/sales/order-confirmations/create
router.get('/create', requirePermission('order-confirmation.create'), orderConfirmationController.create);

// GET /api/sales/order-confirmations/form-brands?company_id= — the order form's brand options (no brand.view needed)
router.get('/form-brands', requireAnyPermission(['order-confirmation.create', 'order-confirmation.edit']), orderConfirmationController.formBrands);

// POST /api/sales/order-confirmations
router.post(
  '/',
  requirePermission('order-confirmation.create'),
  orderConfirmationValidator.validateStore,
  orderConfirmationController.store
);

// GET /api/sales/order-confirmations/:id
router.get('/:id', requirePermission('order-confirmation.view'), orderConfirmationController.show);

// GET /api/sales/order-confirmations/:id/edit
router.get('/:id/edit', requirePermission('order-confirmation.edit'), orderConfirmationController.edit);

// PUT /api/sales/order-confirmations/:id
router.put(
  '/:id',
  requirePermission('order-confirmation.edit'),
  orderConfirmationValidator.validateUpdate,
  orderConfirmationController.update
);

// DELETE /api/sales/order-confirmations/:id
router.delete('/:id', requirePermission('order-confirmation.delete'), orderConfirmationController.destroy);

// POST /api/sales/order-confirmations/:id/raise-po
router.post(
  '/:id/raise-po',
  requirePermission('order-confirmation.approve'), // Using approve as a proxy for 'raise-po' if specific permission doesn't exist. "approve" is typically used for major business logic actions.
  orderConfirmationValidator.validateRaisePo,
  orderConfirmationController.raisePurchaseOrders
);

// POST /api/sales/order-confirmations/:id/raise-export-document
router.post(
  '/:id/raise-export-document',
  requirePermission('export-document.create'),
  exportDocumentController.raiseFromOrderConfirmation
);

// POST /api/sales/order-confirmations/:id/cancel — explicit lifecycle action (the form cannot set 'cancelled')
router.post('/:id/cancel', requirePermission('order-confirmation.edit'), orderConfirmationValidator.validateCancel, orderConfirmationController.cancel);

// Order fulfilment: ordered / produced / dispatched / pending, and production allocation.
router.get('/:id/fulfilment', requirePermission('order-confirmation.view'), orderConfirmationController.fulfilment);
router.get('/:id/allocation-form-data', requirePermission('order-confirmation.allocate'), orderConfirmationController.allocationFormData);
router.post('/:id/allocations', requirePermission('order-confirmation.allocate'), orderConfirmationValidator.validateAllocate, orderConfirmationController.allocate);
router.post('/:id/allocations/:allocationId/cancel', requirePermission('order-confirmation.allocate'), orderConfirmationValidator.validateCancel, orderConfirmationController.cancelAllocation);

export default router;
