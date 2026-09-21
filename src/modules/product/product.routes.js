import express from 'express';
import { productController } from './product.controller.js';
import { productValidator } from './product.validator.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requirePermission, requireAnyPermission } from '../../middleware/rbac.middleware.js';

const router = express.Router();

router.use(authenticate);

// GET /api/masters/products
router.get(
  '/',
  requirePermission('product.view'),
  productController.index
);

// GET /api/masters/products/check-code
// Declared before the resource so "check-code" is not swallowed by
// products/:id — same ordering rule as Order Format's "defaults".
router.get(
  '/check-code',
  requirePermission('product.view'),
  productController.checkCode
);

// GET /api/masters/products/create
router.get(
  '/create',
  requirePermission('product.create'),
  productController.create
);

// POST /api/masters/products
router.post(
  '/',
  requirePermission('product.create'),
  productValidator.validateStore,
  productController.store
);

// POST /api/masters/products/gst-rates
// Quick-add from the GST % field on the Product form itself — reachable
// from either the create or the edit form.
router.post(
  '/gst-rates',
  requireAnyPermission(['product.create', 'product.edit']),
  productController.storeGstRate
);

// GET /api/masters/products/:id
router.get(
  '/:id',
  requirePermission('product.view'),
  productController.show
);

// GET /api/masters/products/:id/edit
router.get(
  '/:id/edit',
  requirePermission('product.edit'),
  productController.edit
);

// PUT /api/masters/products/:id
router.put(
  '/:id',
  requirePermission('product.edit'),
  productValidator.validateUpdate,
  productController.update
);

// DELETE /api/masters/products/:id
router.delete(
  '/:id',
  requirePermission('product.delete'),
  productController.destroy
);

// PATCH /api/masters/products/:id/toggle-status
router.patch(
  '/:id/toggle-status',
  requirePermission('product.edit'),
  productController.toggleStatus
);

export default router;
