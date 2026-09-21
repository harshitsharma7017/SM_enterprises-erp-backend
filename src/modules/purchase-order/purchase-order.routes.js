import express from 'express';
import { purchaseOrderController } from './purchase-order.controller.js';
import { purchaseOrderValidator } from './purchase-order.validator.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/rbac.middleware.js';

const router = express.Router();

router.use(authenticate);

// GET /api/procurement/purchase-orders
router.get('/', requirePermission('purchase-order.view'), purchaseOrderController.index);

// GET /api/procurement/purchase-orders/create
router.get('/create', requirePermission('purchase-order.create'), purchaseOrderController.create);

// POST /api/procurement/purchase-orders
router.post(
  '/',
  requirePermission('purchase-order.create'),
  purchaseOrderValidator.validateStore,
  purchaseOrderController.store
);

// GET /api/procurement/purchase-orders/:id
router.get('/:id', requirePermission('purchase-order.view'), purchaseOrderController.show);

// GET /api/procurement/purchase-orders/:id/edit
router.get('/:id/edit', requirePermission('purchase-order.edit'), purchaseOrderController.edit);

// PUT /api/procurement/purchase-orders/:id
router.put(
  '/:id',
  requirePermission('purchase-order.edit'),
  purchaseOrderValidator.validateUpdate,
  purchaseOrderController.update
);

// DELETE /api/procurement/purchase-orders/:id
router.delete('/:id', requirePermission('purchase-order.delete'), purchaseOrderController.destroy);

export default router;
