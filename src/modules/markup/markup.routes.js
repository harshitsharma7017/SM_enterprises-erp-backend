import express from 'express';
import { markupController } from './markup.controller.js';
import { markupValidator } from './markup.validator.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/rbac.middleware.js';

const router = express.Router();

router.use(authenticate);

// Cascade endpoints — before the resource so they are not swallowed by /:id.
// Guarded by markup.view matching MarkupController::middleware() exactly.
router.get('/supplier-discount',        requirePermission('markup.view'), markupController.supplierDiscount);
router.get('/supplier-agent-commission', requirePermission('markup.view'), markupController.supplierAgentCommission);
router.get('/buyer-agent-commission',   requirePermission('markup.view'), markupController.buyerAgentCommission);

// GET /api/masters/markups
router.get('/', requirePermission('markup.view'), markupController.index);

// GET /api/masters/markups/create
router.get('/create', requirePermission('markup.create'), markupController.create);

// POST /api/masters/markups
router.post('/', requirePermission('markup.create'), markupValidator.validateStore, markupController.store);

// GET /api/masters/markups/:id
router.get('/:id', requirePermission('markup.view'), markupController.show);

// GET /api/masters/markups/:id/edit
router.get('/:id/edit', requirePermission('markup.edit'), markupController.edit);

// PUT /api/masters/markups/:id
router.put('/:id', requirePermission('markup.edit'), markupValidator.validateUpdate, markupController.update);

// DELETE /api/masters/markups/:id
router.delete('/:id', requirePermission('markup.delete'), markupController.destroy);

// PATCH /api/masters/markups/:id/toggle-status
router.patch('/:id/toggle-status', requirePermission('markup.edit'), markupController.toggleStatus);

export default router;
