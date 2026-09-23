import express from 'express';
import { supplierReturnController } from './supplier-return.controller.js';
import { supplierReturnValidator } from './supplier-return.validator.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/rbac.middleware.js';
import { validate } from '../../middleware/validation.middleware.js';

// Returns of QC-rejected material to the supplier (an ERP record only — no logistics).
const router = express.Router();

router.use(authenticate);

// GET /api/procurement/supplier-returns
router.get('/', requirePermission('supplier-return.view'), supplierReturnController.index);

// GET /api/procurement/supplier-returns/form-data?company_id= | ?quality_inspection_id=
router.get('/form-data', requirePermission('supplier-return.create'), supplierReturnController.formData);

// GET /api/procurement/supplier-returns/:id
router.get('/:id', requirePermission('supplier-return.view'), supplierReturnController.show);

// POST /api/procurement/supplier-returns — draft return from a completed inspection
router.post('/', requirePermission('supplier-return.create'), validate(supplierReturnValidator.create), supplierReturnController.create);

// POST /api/procurement/supplier-returns/:id/post — draft → posted (counts as returned)
router.post('/:id/post', requirePermission('supplier-return.post'), supplierReturnController.post);

// POST /api/procurement/supplier-returns/:id/cancel
router.post('/:id/cancel', requirePermission('supplier-return.cancel'), supplierReturnController.cancel);

export default router;
