import express from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/rbac.middleware.js';
import { documentArchive } from '../../services/document-archive.service.js';

/**
 * Archived documents (requirement 18): the register, and downloads of the
 * frozen copies. Under document.view; the files are never on /storage.
 */
const router = express.Router();
router.use(authenticate);

const FILTERS = ['company_id', 'entity_type', 'entity_id', 'date_from', 'date_to', 'search', 'page', 'limit'];

// GET /api/documents
router.get('/', requirePermission('document.view'), async (req, res, next) => {
  try {
    res.json({ success: true, data: await documentArchive.list(Object.fromEntries(FILTERS.map((k) => [k, req.query[k]]))) });
  } catch (error) {
    next(error);
  }
});

// GET /api/documents/:id/download
router.get('/:id/download', requirePermission('document.view'), async (req, res, next) => {
  try {
    const doc = await documentArchive.read(Number(req.params.id));
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${doc.row.file_name}"`);
    res.send(doc.buffer);
  } catch (error) {
    next(error);
  }
});

export default router;
