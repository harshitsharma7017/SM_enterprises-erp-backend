import { orderFormatService } from './order-format.service.js';

export const orderFormatController = {
  getDefaults: (req, res, next) => {
    try {
      const defaults = orderFormatService.getDefaults();
      res.status(200).json({
        success: true,
        message: 'Format defaults retrieved successfully',
        data: defaults
      });
    } catch (error) {
      next(error);
    }
  },

  index: async (req, res, next) => {
    try {
      const filters = {
        search: req.query.search,
        status: req.query.status,
        sort: req.query.sort,
        direction: req.query.direction,
        offset: req.query.offset || 0,
        limit: req.query.limit || 10
      };

      const result = await orderFormatService.findAll(filters);

      res.status(200).json({
        success: true,
        message: 'Formats retrieved successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  },

  store: async (req, res, next) => {
    try {
      const format = await orderFormatService.create(req.body, req.files, req.user.id);
      res.status(201).json({
        success: true,
        message: `Order format "${format.name}" created successfully.`,
        data: { format }
      });
    } catch (error) {
      next(error);
    }
  },

  show: async (req, res, next) => {
    try {
      const format = await orderFormatService.findById(req.params.id);
      if (!format) {
        return res.status(404).json({ success: false, message: 'Format not found' });
      }
      res.status(200).json({
        success: true,
        message: 'Format retrieved successfully',
        data: { format }
      });
    } catch (error) {
      next(error);
    }
  },

  update: async (req, res, next) => {
    try {
      const format = await orderFormatService.update(req.params.id, req.body, req.files, req.body.keep_images, req.user.id);
      res.status(200).json({
        success: true,
        message: `Order format "${format.name}" updated successfully.`,
        data: { format }
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
      const existing = await orderFormatService.findById(req.params.id);
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Format not found' });
      }
      const name = existing.name;
      
      await orderFormatService.delete(req.params.id);

      res.status(200).json({
        success: true,
        message: `Order format "${name}" deleted successfully.`
      });
    } catch (error) {
      if (error.status === 404) {
        return res.status(404).json({ success: false, message: error.message });
      } else if (error.status === 400) {
        return res.status(400).json({ success: false, message: error.message });
      }
      next(error);
    }
  },

  toggleStatus: async (req, res, next) => {
    try {
      const format = await orderFormatService.toggleStatus(req.params.id, req.user.id);
      res.status(200).json({
        success: true,
        message: `Order format "${format.name}" marked ${format.status}.`,
        data: { format }
      });
    } catch (error) {
      if (error.status === 404) {
        return res.status(404).json({ success: false, message: error.message });
      }
      next(error);
    }
  }
};
