import { debitNoteService } from './debit-note.service.js';
import { debitNoteRepository } from './debit-note.repository.js';

const FILTERS = ['status', 'company_id', 'supplier_id', 'purchase_order_id', 'inward_entry_id', 'lot_id', 'quality_inspection_id', 'supplier_return_id', 'po', 'grn', 'lot', 'date_from', 'date_to', 'search', 'page', 'limit'];

export const debitNoteController = {
  // GET /api/finance/debit-notes
  index: async (req, res, next) => {
    try {
      const filters = Object.fromEntries(FILTERS.map((k) => [k, req.query[k]]));
      const result = await debitNoteRepository.findAll(filters);
      res.json({ success: true, data: result.rows, meta: { total: result.total, page: result.page, limit: result.limit } });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/finance/debit-notes/form-data?company_id= | ?quality_inspection_id=
  formData: async (req, res, next) => {
    try {
      const data = await debitNoteService.formData(req.query);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/finance/debit-notes/:id
  show: async (req, res, next) => {
    try {
      const note = await debitNoteRepository.findById(req.params.id);
      if (!note) return res.status(404).json({ success: false, message: 'Debit note not found' });
      res.json({ success: true, data: note });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/finance/debit-notes — draft
  create: async (req, res, next) => {
    try {
      const id = await debitNoteService.create(req.body, req.user.id);
      const note = await debitNoteRepository.findById(id);
      res.status(201).json({ success: true, message: `Debit note ${note.debit_note_no} saved as draft.`, data: note });
    } catch (error) {
      next(error);
    }
  },

  // PUT /api/finance/debit-notes/:id — draft only
  update: async (req, res, next) => {
    try {
      await debitNoteService.update(req.params.id, req.body, req.user.id);
      const note = await debitNoteRepository.findById(req.params.id);
      res.json({ success: true, message: 'Debit note updated.', data: note });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/finance/debit-notes/:id/post
  post: async (req, res, next) => {
    try {
      await debitNoteService.post(req.params.id, req.user.id);
      const note = await debitNoteRepository.findById(req.params.id);
      res.json({ success: true, message: `Debit note ${note.debit_note_no} posted.`, data: note });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/finance/debit-notes/:id/cancel
  cancel: async (req, res, next) => {
    try {
      await debitNoteService.cancel(req.params.id, req.user.id);
      const note = await debitNoteRepository.findById(req.params.id);
      res.json({ success: true, message: `Debit note ${note.debit_note_no} cancelled.`, data: note });
    } catch (error) {
      next(error);
    }
  },
};
