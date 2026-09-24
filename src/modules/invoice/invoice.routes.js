import express from 'express';
import { invoiceController } from './invoice.controller.js';
import { invoiceValidator } from './invoice.validator.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requirePermission, requireAnyPermission } from '../../middleware/rbac.middleware.js';
import { validate } from '../../middleware/validation.middleware.js';

// Final invoices billing posted dispatch lines (commercial document; no accounting / tax / Tally posting).
const router = express.Router();

router.use(authenticate);

router.get('/', requirePermission('invoice.view'), invoiceController.index);
router.get('/form-data', requireAnyPermission(['invoice.create', 'invoice.edit']), invoiceController.formData);
router.get('/:id', requirePermission('invoice.view'), invoiceController.show);
router.get('/:id/document', requirePermission('invoice.view'), invoiceController.document);
router.post('/', requirePermission('invoice.create'), validate(invoiceValidator.create), invoiceController.create);
router.put('/:id', requirePermission('invoice.edit'), validate(invoiceValidator.update), invoiceController.update);
router.post('/:id/issue', requirePermission('invoice.issue'), invoiceController.issue);
router.post('/:id/cancel', requirePermission('invoice.cancel'), validate(invoiceValidator.cancel), invoiceController.cancel);

export default router;
