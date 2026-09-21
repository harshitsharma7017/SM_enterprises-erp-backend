import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { exportDocumentController } from './export-document.controller.js';
import { exportDocumentValidator } from './export-document.validator.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/rbac.middleware.js';
import { validate } from '../../middleware/validation.middleware.js';
import { handleUploadErrors } from '../../middleware/upload.middleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../../public/storage/export-documents');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, 'checklist-' + uniqueSuffix + ext);
  }
});

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
router.get('/:document/packing-list/:variant?', requirePermission('export-document.generate'), exportDocumentController.packingListPdf);
router.get('/:document/bill-of-lading-draft', requirePermission('export-document.generate'), exportDocumentController.billOfLadingDraftPdf);
router.get('/:document/export-invoice/:variant?', requirePermission('export-document.generate'), exportDocumentController.exportInvoicePdf);
router.get('/:document/item-summary/:variant?', requirePermission('export-document.generate'), exportDocumentController.itemSummaryPdf);
router.get('/:document/purchase-bills/:variant?', requirePermission('export-document.generate'), exportDocumentController.purchaseBillsPdf);
router.get('/:document/vgm/:variant?', requirePermission('export-document.generate'), exportDocumentController.vgmPdf);
router.get('/:document/bank-docs/:variant?', requirePermission('export-document.generate'), exportDocumentController.bankDocsPdf);
router.get('/:document/buyer-docs/:variant?', requirePermission('export-document.generate'), exportDocumentController.buyerDocsPdf);

export default router;
