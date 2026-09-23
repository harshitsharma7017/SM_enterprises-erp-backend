import express from 'express';
import { debitNoteController } from './debit-note.controller.js';
import { debitNoteValidator } from './debit-note.validator.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/rbac.middleware.js';
import { validate } from '../../middleware/validation.middleware.js';

// Debit notes against the supplier for QC-rejected (and returned) material.
// Existing debit-note.* permissions; posting and cancelling (finalising) use
// debit-note.approve.
const router = express.Router();

router.use(authenticate);

// GET /api/finance/debit-notes
router.get('/', requirePermission('debit-note.view'), debitNoteController.index);

// GET /api/finance/debit-notes/form-data?company_id= | ?quality_inspection_id=
router.get('/form-data', requirePermission('debit-note.create'), debitNoteController.formData);

// GET /api/finance/debit-notes/:id
router.get('/:id', requirePermission('debit-note.view'), debitNoteController.show);

// POST /api/finance/debit-notes — draft from a completed inspection / posted return
router.post('/', requirePermission('debit-note.create'), validate(debitNoteValidator.create), debitNoteController.create);

// PUT /api/finance/debit-notes/:id — draft only
router.put('/:id', requirePermission('debit-note.edit'), validate(debitNoteValidator.update), debitNoteController.update);

// POST /api/finance/debit-notes/:id/post — draft → posted
router.post('/:id/post', requirePermission('debit-note.approve'), debitNoteController.post);

// POST /api/finance/debit-notes/:id/cancel
router.post('/:id/cancel', requirePermission('debit-note.approve'), debitNoteController.cancel);

export default router;
