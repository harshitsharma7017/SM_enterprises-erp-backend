import express from 'express';
import multer from 'multer';
import { exportDocumentController } from './export-document.controller.js';
import { exportDocumentValidator } from './export-document.validator.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/rbac.middleware.js';
import { validate } from '../../middleware/validation.middleware.js';
import { handleUploadErrors } from '../../middleware/upload.middleware.js';

const router = express.Router();

// Held in memory; the controller writes it through the storage service.
const storage = multer.memoryStorage();

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

router.use(authenticate);

// GET /api/export/documents
router.get('/', requirePermission('export-document.view'), exportDocumentController.index);

// GET /api/export/documents/:id
router.get('/:id', requirePermission('export-document.view'), exportDocumentController.show);



// PUT /api/export/documents/:id
router.put(
  '/:id',
  requirePermission('export-document.edit'),
  validate(exportDocumentValidator.update),
  exportDocumentController.update
);

// DELETE /api/export/documents/:id
router.delete('/:id', requirePermission('export-document.delete'), exportDocumentController.destroy);


// POST /api/export/documents/:id/checklist/:checklist_id
router.post(
  '/:id/checklist/:checklist_id',
  requirePermission('export-document.edit'),
  handleUploadErrors(upload.single('file')),
  exportDocumentController.uploadChecklist
);

// DELETE /api/export/documents/:id/checklist/:checklist_id
router.delete(
  '/:id/checklist/:checklist_id',
  requirePermission('export-document.edit'),
  exportDocumentController.resetChecklist
);

// PDF generation routes
router.get('/:document/delivery-challan', requirePermission('export-document.generate'), exportDocumentController.deliveryChallanPdf);
router.get('/:document/e-invoice', requirePermission('export-document.generate'), exportDocumentController.eInvoicePdf);
router.get('/:document/packing-list/:variant', requirePermission('export-document.generate'), exportDocumentController.packingListPdf);
router.get('/:document/bill-of-lading-draft', requirePermission('export-document.generate'), exportDocumentController.billOfLadingDraftPdf);
router.get('/:document/export-invoice/:variant', requirePermission('export-document.generate'), exportDocumentController.exportInvoicePdf);
router.get('/:document/item-summary/:variant', requirePermission('export-document.generate'), exportDocumentController.itemSummaryPdf);
router.get('/:document/purchase-bills/:variant', requirePermission('export-document.generate'), exportDocumentController.purchaseBillsPdf);
router.get('/:document/vgm/:variant', requirePermission('export-document.generate'), exportDocumentController.vgmPdf);
router.get('/:document/bank-docs/:variant', requirePermission('export-document.generate'), exportDocumentController.bankDocsPdf);
router.get('/:document/buyer-docs/:variant', requirePermission('export-document.generate'), exportDocumentController.buyerDocsPdf);

export default router;
