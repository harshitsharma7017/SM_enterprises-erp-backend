import express from 'express';
import { jobberController } from './jobber.controller.js';
import { supplierValidator } from '../supplier/supplier.validator.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireAnyPermission } from '../../middleware/rbac.middleware.js';

const router = express.Router();

router.use(authenticate);

// Defaults party_type to 'jobber' BEFORE the shared validator runs, so a
// client can omit it entirely on this screen — functionally equivalent to
// JobberController::store()'s post-validation fallback, but made to actually
// take effect (that fallback is unreachable in Laravel itself, since the
// shared FormRequest's `party_type` rule is `required` and runs first).
const defaultJobberPartyType = (req, res, next) => {
  if (!req.body.party_type) {
    req.body.party_type = 'jobber';
  }
  next();
};

// GET /api/masters/jobbers
router.get(
  '/',
  requireAnyPermission(['jobber.view', 'supplier.view']),
  jobberController.index
);

// GET /api/masters/jobbers/check-code
router.get(
  '/check-code',
  requireAnyPermission(['jobber.view', 'supplier.view']),
  jobberController.checkCode
);

// GET /api/masters/jobbers/agents
router.get(
  '/agents',
  requireAnyPermission(['jobber.view', 'supplier.view']),
  jobberController.agents
);

// GET /api/masters/jobbers/create
router.get(
  '/create',
  requireAnyPermission(['jobber.create', 'supplier.create']),
  jobberController.create
);

// POST /api/masters/jobbers
router.post(
  '/',
  requireAnyPermission(['jobber.create', 'supplier.create']),
  defaultJobberPartyType,
  supplierValidator.validateStore,
  jobberController.store
);

// GET /api/masters/jobbers/:id
router.get(
  '/:id',
  requireAnyPermission(['jobber.view', 'supplier.view']),
  jobberController.show
);

// GET /api/masters/jobbers/:id/edit
router.get(
  '/:id/edit',
  requireAnyPermission(['jobber.edit', 'supplier.edit']),
  jobberController.edit
);

// PUT /api/masters/jobbers/:id
// No party_type default here — JobberController::update() has none either
// (only store() does); an update must supply party_type explicitly, same
// as the Supplier screen.
router.put(
  '/:id',
  requireAnyPermission(['jobber.edit', 'supplier.edit']),
  supplierValidator.validateUpdate,
  jobberController.update
);

// DELETE /api/masters/jobbers/:id
router.delete(
  '/:id',
  requireAnyPermission(['jobber.delete', 'supplier.delete']),
  jobberController.destroy
);

// PATCH /api/masters/jobbers/:id/toggle-status
router.patch(
  '/:id/toggle-status',
  requireAnyPermission(['jobber.edit', 'supplier.edit']),
  jobberController.toggleStatus
);

export default router;
