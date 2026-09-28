import express from 'express';
import multer from 'multer';
import { companyProfileController } from './company-profile.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/rbac.middleware.js';
import { handleUploadErrors } from '../../middleware/upload.middleware.js';


// Original ERP: UpdateCompanyProfileRequest — 'logo' => ['nullable', 'image', 'max:2048'].
// Held in memory; the controller writes it through the storage service after validation.
const storage = multer.memoryStorage();

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
