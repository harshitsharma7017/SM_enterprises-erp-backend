import express from 'express';
import { orderConfirmationController } from './order-confirmation.controller.js';
import { orderConfirmationValidator } from './order-confirmation.validator.js';
import { exportDocumentController } from '../export-document/export-document.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/rbac.middleware.js';

const router = express.Router();

router.use(authenticate);

// GET /api/sales/order-confirmations
router.get('/', requirePermission('order-confirmation.view'), orderConfirmationController.index);

// GET /api/sales/order-confirmations/create
router.get('/create', requirePermission('order-confirmation.create'), orderConfirmationController.create);

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

export default router;
