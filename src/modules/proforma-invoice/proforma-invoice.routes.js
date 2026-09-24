import express from 'express';
import { proformaInvoiceController } from './proforma-invoice.controller.js';
import { proformaInvoiceValidator } from './proforma-invoice.validator.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requirePermission, requireAnyPermission } from '../../middleware/rbac.middleware.js';
import { validate } from '../../middleware/validation.middleware.js';

// Proforma invoices against confirmed orders (commercial document; no accounting / tax / payment logic).
const router = express.Router();

router.use(authenticate);

router.get('/', requirePermission('proforma-invoice.view'), proformaInvoiceController.index);
router.get('/form-data', requireAnyPermission(['proforma-invoice.create', 'proforma-invoice.edit']), proformaInvoiceController.formData);
router.get('/:id', requirePermission('proforma-invoice.view'), proformaInvoiceController.show);
router.get('/:id/document', requirePermission('proforma-invoice.view'), proformaInvoiceController.document);
router.post('/', requirePermission('proforma-invoice.create'), validate(proformaInvoiceValidator.create), proformaInvoiceController.create);
router.put('/:id', requirePermission('proforma-invoice.edit'), validate(proformaInvoiceValidator.update), proformaInvoiceController.update);
router.post('/:id/issue', requirePermission('proforma-invoice.issue'), proformaInvoiceController.issue);
router.post('/:id/cancel', requirePermission('proforma-invoice.cancel'), validate(proformaInvoiceValidator.cancel), proformaInvoiceController.cancel);
router.put('/:id/commercial-reference', requirePermission('proforma-invoice.edit'), validate(proformaInvoiceValidator.commercialReference), proformaInvoiceController.commercialReference);

export default router;
