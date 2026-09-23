import express from 'express';
import { productionController } from './production.controller.js';
import { productionValidator } from './production.validator.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requirePermission, requireAnyPermission } from '../../middleware/rbac.middleware.js';
import { validate } from '../../middleware/validation.middleware.js';

// Store → Supervisor/Cutting → Foreman: material issues (stock OUT through the
// Phase 7 ledger) and the processing record of each issue.
const router = express.Router();

router.use(authenticate);

// ---------------- Material issues ----------------
router.get('/material-issues', requirePermission('material-issue.view'), productionController.issues);
router.get('/material-issues/form-data', requireAnyPermission(['material-issue.create', 'material-issue.edit']), productionController.issueFormData);
router.get('/material-issues/:id', requirePermission('material-issue.view'), productionController.issue);
router.post('/material-issues', requirePermission('material-issue.create'), validate(productionValidator.issueCreate), productionController.createIssue);
router.put('/material-issues/:id', requirePermission('material-issue.edit'), validate(productionValidator.issueUpdate), productionController.updateIssue);
router.post('/material-issues/:id/post', requirePermission('material-issue.post'), productionController.postIssue);
router.post('/material-issues/:id/cancel', requirePermission('material-issue.cancel'), productionController.cancelIssue);

// ---------------- Processing ----------------
router.get('/processing', requirePermission('processing.view'), productionController.records);
router.get('/processing/form-data', requireAnyPermission(['processing.create', 'processing.edit']), productionController.recordFormData);
router.get('/processing/:id', requirePermission('processing.view'), productionController.record);
router.post('/processing', requirePermission('processing.create'), validate(productionValidator.processingCreate), productionController.createRecord);
router.put('/processing/:id', requirePermission('processing.edit'), validate(productionValidator.processingUpdate), productionController.updateRecord);
router.post('/processing/:id/complete', requirePermission('processing.complete'), validate(productionValidator.processingComplete), productionController.completeRecord);

export default router;
