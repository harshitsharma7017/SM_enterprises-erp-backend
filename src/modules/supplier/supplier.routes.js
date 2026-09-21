import express from 'express';
import { supplierController } from './supplier.controller.js';
import { supplierValidator } from './supplier.validator.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requirePermission, requireAnyPermission } from '../../middleware/rbac.middleware.js';

const router = express.Router();

router.use(authenticate);

// GET /api/masters/suppliers
router.get(
  '/',
  requirePermission('supplier.view'),
  supplierController.index
);

// GET /api/masters/suppliers/check-code
router.get(
  '/check-code',
  requirePermission('supplier.view'),
  supplierController.checkCode
);

// GET /api/masters/suppliers/agents
// Col X dropdown source filtered by party type — a cascade endpoint on the
// Supplier form, not the Agent master.
router.get(
  '/agents',
  requirePermission('supplier.view'),
  supplierController.agents
);

// GET /api/masters/suppliers/create
router.get(
  '/create',
  requirePermission('supplier.create'),
  supplierController.create
);

// POST /api/masters/suppliers
router.post(
  '/',
  requirePermission('supplier.create'),
  supplierValidator.validateStore,
  supplierController.store
);

// POST /api/masters/suppliers/supplier-types
// Quick-add for the Supplier/Jobber Type field — shared by both the
// Supplier and Jobber screens, so there is one route rather than two.
router.post(
  '/supplier-types',
  requireAnyPermission(['supplier.create', 'supplier.edit', 'jobber.create', 'jobber.edit']),
  supplierController.storeSupplierType
);

// GET /api/masters/suppliers/:id
router.get(
  '/:id',
  requirePermission('supplier.view'),
  supplierController.show
);

// GET /api/masters/suppliers/:id/edit
router.get(
  '/:id/edit',
  requirePermission('supplier.edit'),
  supplierController.edit
);

// PUT /api/masters/suppliers/:id
router.put(
  '/:id',
  requirePermission('supplier.edit'),
  supplierValidator.validateUpdate,
  supplierController.update
);

// DELETE /api/masters/suppliers/:id
router.delete(
  '/:id',
  requirePermission('supplier.delete'),
  supplierController.destroy
);

// PATCH /api/masters/suppliers/:id/toggle-status
router.patch(
  '/:id/toggle-status',
  requirePermission('supplier.edit'),
  supplierController.toggleStatus
);

export default router;
