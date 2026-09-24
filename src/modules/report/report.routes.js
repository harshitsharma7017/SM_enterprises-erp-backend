import express from 'express';
import { reportController } from './report.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/rbac.middleware.js';

const router = express.Router();

router.use(authenticate);

router.get('/', requirePermission('report.view'), reportController.index);
router.get('/outstanding', requirePermission('outstanding.view'), reportController.outstanding);
router.get('/definitions', requirePermission('report.view'), reportController.definitions);
// Lot pages already need inward-entry.view; the barcode search also needs barcode.view (checked in the service).
router.get('/traceability', requirePermission('report.view'), requirePermission('inward-entry.view'), reportController.traceability);
// Each report also checks its module's view permission (see the controller).
router.get('/data/:key', requirePermission('report.view'), reportController.data);
router.get('/data/:key/options', requirePermission('report.view'), reportController.options);
router.get('/data/:key/export', requirePermission('report.export'), reportController.export);

export default router;
