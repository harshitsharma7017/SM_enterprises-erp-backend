import express from 'express';
import { materialRequirementController } from './material-requirement.controller.js';
import { materialRequirementValidator } from './material-requirement.validator.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/rbac.middleware.js';

const router = express.Router();

router.use(authenticate);

// GET /api/planning/material-requirements
router.get('/', requirePermission('material-requirement.view'), materialRequirementController.index);

// POST /api/planning/material-requirements/generate — from a finalized brand projection
router.post('/generate', requirePermission('material-requirement.create'), materialRequirementValidator.validateGenerate, materialRequirementController.generate);

// GET /api/planning/material-requirements/:id
router.get('/:id', requirePermission('material-requirement.view'), materialRequirementController.show);

// POST /api/planning/material-requirements/:id/close
router.post('/:id/close', requirePermission('material-requirement.edit'), materialRequirementValidator.validateClose, materialRequirementController.close);

// POST /api/planning/material-requirements/:id/reopen
router.post('/:id/reopen', requirePermission('material-requirement.edit'), materialRequirementController.reopen);

// DELETE /api/planning/material-requirements/:id
router.delete('/:id', requirePermission('material-requirement.delete'), materialRequirementController.destroy);

export default router;
