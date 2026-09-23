import express from 'express';
import { inwardEntryController } from './inward-entry.controller.js';
import { inwardEntryValidator } from './inward-entry.validator.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requirePermission, requireAnyPermission } from '../../middleware/rbac.middleware.js';
import { validate } from '../../middleware/validation.middleware.js';

// Goods receipts (GRN). One receiving system for every PO origin; the path
// keeps its original name so existing links and permissions stay valid.
const router = express.Router();

router.use(authenticate);

// GET /api/procurement/inward-entries
router.get('/', requirePermission('inward-entry.view'), inwardEntryController.index);

// GET /api/procurement/inward-entries/eligible-pos?company_id= — form data
router.get(
  '/eligible-pos',
  requireAnyPermission(['inward-entry.create', 'inward-entry.edit']),
  inwardEntryController.eligiblePos
);

// GET /api/procurement/inward-entries/po-details/:id — PO lines with Ordered / Received / Pending
router.get('/po-details/:id', requirePermission('inward-entry.view'), inwardEntryController.poDetails);

// GET /api/procurement/inward-entries/:id
router.get('/:id', requirePermission('inward-entry.view'), inwardEntryController.show);

// POST /api/procurement/inward-entries — draft GRN
router.post('/', requirePermission('inward-entry.create'), validate(inwardEntryValidator.create), inwardEntryController.create);

// PUT /api/procurement/inward-entries/:id — draft GRN
router.put('/:id', requirePermission('inward-entry.edit'), validate(inwardEntryValidator.update), inwardEntryController.update);

// POST /api/procurement/inward-entries/:id/post — draft → posted, creates lots
router.post('/:id/post', requirePermission('inward-entry.post'), inwardEntryController.post);

// POST /api/procurement/inward-entries/:id/cancel
router.post('/:id/cancel', requirePermission('inward-entry.post'), inwardEntryController.cancel);

// DELETE /api/procurement/inward-entries/:id — draft GRN only
router.delete('/:id', requirePermission('inward-entry.delete'), inwardEntryController.destroy);

// POST /api/procurement/inward-entries/:id/approve — legacy inward QC only
router.post(
  '/:id/approve',
  requirePermission('inward-entry.approve'),
  validate(inwardEntryValidator.approve),
  inwardEntryController.approve
);

export default router;
