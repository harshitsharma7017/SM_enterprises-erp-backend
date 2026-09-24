import express from 'express';
import multer from 'multer';
import { importController } from './import.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/rbac.middleware.js';
import { handleUploadErrors } from '../../middleware/upload.middleware.js';

// Excel imports of brands, products and draft brand projections only. The file is kept in
// memory for the request (never written to the public storage folder).
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    if (/\.xlsx$/i.test(file.originalname)) return cb(null, true);
    const error = new Error('Only .xlsx files can be imported.');
    error.status = 422;
    return cb(error);
  },
});

const router = express.Router();

router.use(authenticate);
router.use(requirePermission('report.import'));

router.get('/', importController.index);
router.get('/:entity/template', importController.template);
router.post('/:entity/preview', handleUploadErrors(upload.single('file')), importController.preview);
router.post('/:entity/confirm', handleUploadErrors(upload.single('file')), importController.confirm);

export default router;
