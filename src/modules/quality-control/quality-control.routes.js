import express from 'express';
import { qualityControlController } from './quality-control.controller.js';
import { qualityControlValidator } from './quality-control.validator.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/rbac.middleware.js';
import { validate } from '../../middleware/validation.middleware.js';

// QC of received lots. Reuses the goods-receipt permissions: viewing needs
// inward-entry.view; recording, completing and cancelling an inspection need
// inward-entry.approve (the existing QC permission of the inward flow).
const router = express.Router();

router.use(authenticate);

// GET /api/quality-control
router.get('/', requirePermission('inward-entry.view'), qualityControlController.index);

// GET /api/quality-control/form-data?company_id= | ?lot_id= — eligible lots / one lot's figures
router.get('/form-data', requirePermission('inward-entry.approve'), qualityControlController.formData);

// GET /api/quality-control/:id
router.get('/:id', requirePermission('inward-entry.view'), qualityControlController.show);

// POST /api/quality-control — draft inspection
router.post('/', requirePermission('inward-entry.approve'), validate(qualityControlValidator.create), qualityControlController.create);

// PUT /api/quality-control/:id — draft inspection
router.put('/:id', requirePermission('inward-entry.approve'), validate(qualityControlValidator.update), qualityControlController.update);

// POST /api/quality-control/:id/complete — draft → completed (accepted / partially accepted / rejected)
router.post('/:id/complete', requirePermission('inward-entry.approve'), qualityControlController.complete);

// POST /api/quality-control/:id/cancel — keeps history, frees the lot quantity for re-inspection
router.post('/:id/cancel', requirePermission('inward-entry.approve'), validate(qualityControlValidator.cancel), qualityControlController.cancel);

export default router;
