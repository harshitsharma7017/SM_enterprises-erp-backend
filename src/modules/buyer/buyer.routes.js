import express from 'express';
import { buyerController } from './buyer.controller.js';
import { buyerValidator } from './buyer.validator.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requirePermission, requireAnyPermission } from '../../middleware/rbac.middleware.js';

const router = express.Router();

router.use(authenticate);

// GET /api/masters/buyers
router.get(
  '/',
  requirePermission('buyer.view'),
  buyerController.index
);

// GET /api/masters/buyers/create
router.get(
  '/create',
  requirePermission('buyer.create'),
  buyerController.create
);

// POST /api/masters/buyers
router.post(
  '/',
  requirePermission('buyer.create'),
  buyerValidator.validateStore,
  buyerController.store
);

// POST /api/masters/buyers/payment-terms
// Quick-add from the Payment Terms field on the Buyer form itself —
// reachable from either the create or the edit form.
router.post(
  '/payment-terms',
  requireAnyPermission(['buyer.create', 'buyer.edit']),
  buyerController.storePaymentTerm
);

// POST /api/masters/buyers/designations
// Same quick-add, for the contact's Designation field.
router.post(
  '/designations',
  requireAnyPermission(['buyer.create', 'buyer.edit']),
  buyerController.storeDesignation
);

// GET /api/masters/buyers/:id
router.get(
  '/:id',
  requirePermission('buyer.view'),
  buyerController.show
);

// GET /api/masters/buyers/:id/edit
router.get(
  '/:id/edit',
  requirePermission('buyer.edit'),
  buyerController.edit
);

// PUT /api/masters/buyers/:id
router.put(
  '/:id',
  requirePermission('buyer.edit'),
  buyerValidator.validateUpdate,
  buyerController.update
);

// DELETE /api/masters/buyers/:id
router.delete(
  '/:id',
  requirePermission('buyer.delete'),
  buyerController.destroy
);

// PATCH /api/masters/buyers/:id/toggle-status
router.patch(
  '/:id/toggle-status',
  requirePermission('buyer.edit'),
  buyerController.toggleStatus
);

export default router;
