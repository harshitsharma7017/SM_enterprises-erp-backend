import express from 'express';
import { barcodeController } from './barcode.controller.js';
import { barcodeValidator } from './barcode.validator.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/rbac.middleware.js';
import { validate } from '../../middleware/validation.middleware.js';

// Lot barcodes and scan history (identification only: no stock or status changes).
const router = express.Router();

router.use(authenticate);

router.get('/', requirePermission('barcode.view'), barcodeController.index);
router.get('/form-data', requirePermission('barcode.create'), barcodeController.formData);
router.get('/scans', requirePermission('barcode.view'), barcodeController.scans);
router.post('/scan', requirePermission('barcode.scan'), validate(barcodeValidator.scan), barcodeController.scan);
router.get('/:id', requirePermission('barcode.view'), barcodeController.show);
router.post('/', requirePermission('barcode.create'), validate(barcodeValidator.create), barcodeController.create);
router.post('/:id/retire', requirePermission('barcode.create'), validate(barcodeValidator.retire), barcodeController.retire);

export default router;
