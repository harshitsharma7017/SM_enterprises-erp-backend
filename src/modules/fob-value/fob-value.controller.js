import { fobValueService } from './fob-value.service.js';

export const fobValueController = {
  index: async (req, res, next) => {
    try {
      const filters = {
        search: req.query.search,
        status: req.query.status,
        sort: req.query.sort,
        direction: req.query.direction,
        page: req.query.page || 1,
        limit: req.query.limit || 15
      };

      const result = await fobValueService.findAll(filters);

      res.status(200).json({
        success: true,
        message: 'FOB Values retrieved successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  },

  create: async (req, res, next) => {
    try {
      res.status(200).json({
        success: true,
        message: 'FOB Value form data retrieved successfully',
        data: {}
      });
    } catch (error) {
      next(error);
    }
  },

  store: async (req, res, next) => {
    try {
      const fobValue = await fobValueService.create(req.body, req.user.id);
      res.status(201).json({
        success: true,
        message: `FOB Value "${fobValue.name}" created successfully.`,
        data: { fobValue }
      });
    } catch (error) {
      next(error);
    }
  },

  show: async (req, res, next) => {
    try {
      const fobValue = await fobValueService.findById(req.params.id);
      if (!fobValue) {
        return res.status(404).json({ success: false, message: 'FOB Value not found' });
      }
      res.status(200).json({
        success: true,
        message: 'FOB Value retrieved successfully',
        data: { fobValue }
      });
    } catch (error) {
      next(error);
    }
  },

  edit: async (req, res, next) => {
    try {
      const fobValue = await fobValueService.findById(req.params.id);
      if (!fobValue) {
        return res.status(404).json({ success: false, message: 'FOB Value not found' });
      }
      res.status(200).json({
        success: true,
        message: 'FOB Value form data retrieved successfully',
        data: { fobValue }
      });
    } catch (error) {
      next(error);
    }
  },

  update: async (req, res, next) => {
    try {
      const fobValue = await fobValueService.update(req.params.id, req.body, req.user.id);
      res.status(200).json({
        success: true,
        message: `FOB Value "${fobValue.name}" updated successfully.`,
        data: { fobValue }
      });
    } catch (error) {
      if (error.status === 404) {
        return res.status(404).json({ success: false, message: error.message });
      }
      next(error);
    }
  },

  destroy: async (req, res, next) => {
    try {
      const existing = await fobValueService.findById(req.params.id);
      if (!existing) {
        return res.status(404).json({ success: false, message: 'FOB Value not found' });
      }
      const name = existing.name;

      await fobValueService.delete(req.params.id);

      res.status(200).json({
        success: true,
        message: `FOB Value "${name}" deleted successfully.`
      });
    } catch (error) {
      if (error.status === 404) {
        return res.status(404).json({ success: false, message: error.message });
      }
      next(error);
    }
  },

  toggleStatus: async (req, res, next) => {
    try {
      const fobValue = await fobValueService.toggleStatus(req.params.id, req.user.id);
      res.status(200).json({
        success: true,
        message: `FOB Value "${fobValue.name}" marked ${fobValue.status}.`,
        data: { fobValue }
      });
    } catch (error) {
      if (error.status === 404) {
        return res.status(404).json({ success: false, message: error.message });
      }
      next(error);
    }
  }
};
