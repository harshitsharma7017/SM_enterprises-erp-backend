import { inwardEntryService } from './inward-entry.service.js';
import { inwardEntryRepository } from './inward-entry.repository.js';

export const inwardEntryController = {
  index: async (req, res, next) => {
    try {
      const filters = {
        status: req.query.status,
        purchase_order_id: req.query.purchase_order_id,
        page: req.query.page,
        limit: req.query.limit
      };
      
      const result = await inwardEntryRepository.findAll(filters);
      
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

  poDetails: async (req, res, next) => {
    try {
      const items = await inwardEntryRepository.getPODetails(req.params.id);
      res.json({
        success: true,
        data: items
      });
    } catch (error) {
      next(error);
    }
  },

  show: async (req, res, next) => {
    try {
      const entry = await inwardEntryRepository.findById(req.params.id);
      if (!entry) {
        return res.status(404).json({ success: false, message: 'Inward Entry not found' });
      }
      res.json({ success: true, data: entry });
    } catch (error) {
      next(error);
    }
  },

  create: async (req, res, next) => {
    try {
      const id = await inwardEntryService.create(req.body, req.user.id);
      res.status(201).json({
        success: true,
        message: 'Inward Entry created successfully',
        data: { id }
      });
    } catch (error) {
      next(error);
    }
  },

  update: async (req, res, next) => {
    try {
      await inwardEntryService.update(req.params.id, req.body, req.user.id);
      res.json({
        success: true,
        message: 'Inward Entry updated successfully'
      });
    } catch (error) {
      next(error);
    }
  },

  approve: async (req, res, next) => {
    try {
      await inwardEntryService.approve(req.params.id, req.body, req.user.id);
      res.json({
        success: true,
        message: 'Inward Entry QC processed successfully'
      });
    } catch (error) {
      next(error);
    }
  },

  destroy: async (req, res, next) => {
    try {
      await inwardEntryService.delete(req.params.id);
      res.json({
        success: true,
        message: 'Inward Entry deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }
};
