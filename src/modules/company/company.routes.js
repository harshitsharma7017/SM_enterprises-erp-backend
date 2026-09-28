import express from 'express';
import { companyController } from './company.controller.js';
import { companyValidator } from './company.validator.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/rbac.middleware.js';
import { companyLetterhead } from './company-letterhead.service.js';
import multer from 'multer';
import { handleUploadErrors } from '../../middleware/upload.middleware.js';

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

// Letterhead & document details (logo, PAN / IEC, bank, signatory, terms) — printed on the company's documents.
const letterheadUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 1024 * 1024 } });
const letterheadHandler = (fn) => async (req, res, next) => {
  try {
    await fn(req, res);
  } catch (error) {
    if ([404, 422].includes(error.status)) return res.status(error.status).json({ success: false, message: error.message, ...(error.errors ? { errors: error.errors } : {}) });
    next(error);
  }
};
router.get('/:id/letterhead', requirePermission('company.view'), letterheadHandler(async (req, res) => {
  res.json({ success: true, data: await companyLetterhead.get(Number(req.params.id)) });
}));
router.put('/:id/letterhead', requirePermission('company.edit'), handleUploadErrors(letterheadUpload.single('logo')), letterheadHandler(async (req, res) => {
  const data = await companyLetterhead.save(Number(req.params.id), req.body || {}, req.file, req.user.id);
  res.json({ success: true, message: 'Letterhead saved.', data });
}));

// DELETE /api/administration/companies/:id
router.delete('/:id', requirePermission('company.delete'), companyController.destroy);

export default router;
