import express from 'express';
import { inventoryController } from './inventory.controller.js';
import { inventoryValidator } from './inventory.validator.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requirePermission, requireAnyPermission } from '../../middleware/rbac.middleware.js';
import { validate } from '../../middleware/validation.middleware.js';

// Stock is only ever changed through validated movements (QC receipt,
// restricted adjustment). No endpoint sets a quantity directly.
const router = express.Router();

router.use(authenticate);

// ---------------- Stock ----------------
router.get('/stock', requirePermission('stock.view'), inventoryController.stock);
router.get('/stock/products', requirePermission('stock.view'), inventoryController.productStock);
router.get('/stock/postable', requirePermission('stock.post'), inventoryController.postable);
router.get('/stock/lots/:lotId', requirePermission('stock.view'), inventoryController.lotStock);
router.post('/stock/receive-qc', requirePermission('stock.post'), validate(inventoryValidator.receiveQc), inventoryController.receiveQc);
router.post('/stock/adjustments', requirePermission('stock.adjust'), validate(inventoryValidator.adjustment), inventoryController.adjust);

// ---------------- Ledger ----------------
router.get('/ledger', requirePermission('stock.ledger'), inventoryController.ledger);
router.get('/ledger/:id', requirePermission('stock.ledger'), inventoryController.movement);

// ---------------- Locations ----------------
// Listing is also needed to pick a location when posting/adjusting or filtering stock / production lists.
router.get('/locations', requireAnyPermission(['stock-location.view', 'stock.view', 'stock.post', 'stock.adjust', 'material-issue.view', 'processing.view']), inventoryController.locations);
router.get('/locations/:id', requirePermission('stock-location.view'), inventoryController.location);
router.post('/locations', requirePermission('stock-location.create'), validate(inventoryValidator.locationCreate), inventoryController.createLocation);
router.put('/locations/:id', requirePermission('stock-location.edit'), validate(inventoryValidator.locationUpdate), inventoryController.updateLocation);

export default router;
