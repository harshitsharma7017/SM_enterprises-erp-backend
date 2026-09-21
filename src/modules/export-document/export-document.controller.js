import { exportDocumentService } from './export-document.service.js';
import { exportDocumentRepository } from './export-document.repository.js';

export const exportDocumentController = {
  index: async (req, res, next) => {
    try {
      const filters = {
        status: req.query.status,
        buyer_id: req.query.buyer_id,
        page: req.query.page,
        limit: req.query.limit
      };
      
      const result = await exportDocumentRepository.findAll(filters);
      
      res.json({
        success: true,
        data: result.rows,
        meta: {
          total: result.total,
          page: parseInt(filters.page, 10) || 1,
          limit: parseInt(filters.limit, 10) || 15
        }
      });
    } catch (error) {
      next(error);
    }
  },

  show: async (req, res, next) => {
    try {
      const entry = await exportDocumentRepository.findById(req.params.id);
      if (!entry) {
        return res.status(404).json({ success: false, message: 'Export Document not found' });
      }
      res.json({ success: true, data: entry });
    } catch (error) {
      next(error);
    }
  },

  raiseFromOrderConfirmation: async (req, res, next) => {
    try {
      const id = await exportDocumentService.raiseFromOrderConfirmation(req.params.id, req.user.id);
      res.status(201).json({
        success: true,
        message: 'Export Document raised successfully',
        data: { id }
      });
    } catch (error) {
      next(error);
    }
  },

  update: async (req, res, next) => {
    try {
      await exportDocumentService.update(req.params.id, req.body, req.user.id);
      res.json({
        success: true,
        message: 'Export Document updated successfully'
      });
    } catch (error) {
      next(error);
    }
  },

  destroy: async (req, res, next) => {
    try {
      await exportDocumentService.delete(req.params.id);
      res.json({
        success: true,
        message: 'Export Document deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  },

  // Checklist Methods
  uploadChecklist: async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded' });
      }
      await exportDocumentService.updateChecklist(req.params.id, req.params.checklist_id, req.file);
      res.json({
        success: true,
        message: 'Checklist file uploaded successfully',
        data: {
          file_path: req.file.path,
          original_name: req.file.originalname
        }
      });
    } catch (error) {
      next(error);
    }
  },

  resetChecklist: async (req, res, next) => {
    try {
      await exportDocumentService.resetChecklist(req.params.id, req.params.checklist_id);
      res.json({
        success: true,
        message: 'Checklist file reset successfully'
      });
    } catch (error) {
      next(error);
    }
  },

  // PDF Generation Stubs
  deliveryChallanPdf: async (req, res, next) => {
    try {
      const doc = await exportDocumentRepository.findById(req.params.document);
      res.json({ success: true, message: 'Delivery Challan PDF Generation', data: doc });
    } catch (error) { next(error); }
  },

  eInvoicePdf: async (req, res, next) => {
    try {
      const doc = await exportDocumentRepository.findById(req.params.document);
      res.json({ success: true, message: 'E-Invoice PDF Generation', data: doc });
    } catch (error) { next(error); }
  },

  packingListPdf: async (req, res, next) => {
    try {
      const doc = await exportDocumentRepository.findById(req.params.document);
      res.json({ success: true, message: 'Packing List PDF Generation', variant: req.params.variant, data: doc });
    } catch (error) { next(error); }
  },

  billOfLadingDraftPdf: async (req, res, next) => {
    try {
      const doc = await exportDocumentRepository.findById(req.params.document);
      res.json({ success: true, message: 'Bill of Lading Draft PDF Generation', data: doc });
    } catch (error) { next(error); }
  },

  exportInvoicePdf: async (req, res, next) => {
    try {
      const doc = await exportDocumentRepository.findById(req.params.document);
      res.json({ success: true, message: 'Export Invoice PDF Generation', variant: req.params.variant, data: doc });
    } catch (error) { next(error); }
  },

  itemSummaryPdf: async (req, res, next) => {
    try {
      const doc = await exportDocumentRepository.findById(req.params.document);
      res.json({ success: true, message: 'Item Summary PDF Generation', variant: req.params.variant, data: doc });
    } catch (error) { next(error); }
  },

  purchaseBillsPdf: async (req, res, next) => {
    try {
      const doc = await exportDocumentRepository.findById(req.params.document);
      res.json({ success: true, message: 'Purchase Bills PDF Generation', variant: req.params.variant, data: doc });
    } catch (error) { next(error); }
  },

  vgmPdf: async (req, res, next) => {
    try {
      const doc = await exportDocumentRepository.findById(req.params.document);
      res.json({ success: true, message: 'VGM PDF Generation', variant: req.params.variant, data: doc });
    } catch (error) { next(error); }
  },

  bankDocsPdf: async (req, res, next) => {
    try {
      const doc = await exportDocumentRepository.findById(req.params.document);
      res.json({ success: true, message: 'Bank Docs PDF Generation', variant: req.params.variant, data: doc });
    } catch (error) { next(error); }
  },

  buyerDocsPdf: async (req, res, next) => {
    try {
      const doc = await exportDocumentRepository.findById(req.params.document);
      res.json({ success: true, message: 'Buyer Docs PDF Generation', variant: req.params.variant, data: doc });
    } catch (error) { next(error); }
  }
};
