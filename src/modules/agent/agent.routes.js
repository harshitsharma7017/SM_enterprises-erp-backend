import express from 'express';
import { agentController } from './agent.controller.js';
import { agentValidator } from './agent.validator.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/rbac.middleware.js';

const router = express.Router();

router.use(authenticate);

// GET /api/masters/agents
router.get(
  '/',
  requirePermission('agent.view'),
  agentController.index
);

// GET /api/masters/agents/check-code
// Declared before the resource so "check-code" is not swallowed by
// agents/:id.
router.get(
  '/check-code',
  requirePermission('agent.view'),
  agentController.checkCode
);

// GET /api/masters/agents/create
router.get(
  '/create',
  requirePermission('agent.create'),
  agentController.create
);

// POST /api/masters/agents
router.post(
  '/',
  requirePermission('agent.create'),
  agentValidator.validateStore,
  agentController.store
);

// GET /api/masters/agents/:id
router.get(
  '/:id',
  requirePermission('agent.view'),
  agentController.show
);

// GET /api/masters/agents/:id/edit
router.get(
  '/:id/edit',
  requirePermission('agent.edit'),
  agentController.edit
);

// PUT /api/masters/agents/:id
router.put(
  '/:id',
  requirePermission('agent.edit'),
  agentValidator.validateUpdate,
  agentController.update
);

// DELETE /api/masters/agents/:id
router.delete(
  '/:id',
  requirePermission('agent.delete'),
  agentController.destroy
);

// PATCH /api/masters/agents/:id/toggle-status
router.patch(
  '/:id/toggle-status',
  requirePermission('agent.edit'),
  agentController.toggleStatus
);

export default router;
