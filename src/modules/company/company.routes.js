import express from 'express';
import { companyController } from './company.controller.js';
import { companyValidator } from './company.validator.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/rbac.middleware.js';

const router = express.Router();

router.use(authenticate);

// GET /api/administration/companies/options
// Any signed-in user — feeds the company filter/selector on business screens,
// whose own routes are already permission-gated.
router.get('/options', companyController.options);

// GET /api/administration/companies
router.get('/', requirePermission('company.view'), companyController.index);

// POST /api/administration/companies
router.post('/', requirePermission('company.create'), companyValidator.validateStore, companyController.store);

// GET /api/administration/companies/:id
router.get('/:id', requirePermission('company.view'), companyController.show);

// PUT /api/administration/companies/:id
router.put('/:id', requirePermission('company.edit'), companyValidator.validateUpdate, companyController.update);

// PATCH /api/administration/companies/:id/toggle-status
router.patch('/:id/toggle-status', requirePermission('company.edit'), companyController.toggleStatus);

// DELETE /api/administration/companies/:id
router.delete('/:id', requirePermission('company.delete'), companyController.destroy);

export default router;
