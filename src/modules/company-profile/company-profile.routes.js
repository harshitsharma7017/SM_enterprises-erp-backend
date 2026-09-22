import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { companyProfileController } from './company-profile.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/rbac.middleware.js';
import { handleUploadErrors } from '../../middleware/upload.middleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Original ERP: UpdateCompanyProfileRequest — 'logo' => ['nullable', 'image', 'max:2048'].
// Mirrors the export-document checklist upload's diskStorage pattern (Phase 5A).
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../../public/storage/company-profile');
    if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, 'logo-' + uniqueSuffix + ext);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    const err = new Error('Logo must be an image file.');
    err.status = 400;
    cb(err, false);
  }
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 2 * 1024 * 1024 } });

const router = express.Router();

router.use(authenticate);

router.get('/', requirePermission('company-profile.view'), companyProfileController.get);
router.put('/', requirePermission('company-profile.edit'), handleUploadErrors(upload.single('logo')), companyProfileController.update);

export default router;
