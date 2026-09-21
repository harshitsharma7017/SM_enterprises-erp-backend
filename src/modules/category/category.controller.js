import { categoryService } from './category.service.js';

export const categoryController = {
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

      const result = await categoryService.findAll(filters);

      res.status(200).json({
        success: true,
        message: 'Categories retrieved successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  },

  store: async (req, res, next) => {
    try {
      // Intentionally omitting description
      const payload = {
        name: req.body.name,
        status: req.body.status,
        remarks: req.body.remarks,
        format_ids: req.body.format_ids
      };

      const category = await categoryService.create(payload, req.user.id);

      res.status(201).json({
        success: true,
        message: `Category ${category.code} created successfully.`,
        data: { category }
      });
    } catch (error) {
      next(error);
    }
  },

  show: async (req, res, next) => {
    try {
      const category = await categoryService.findById(req.params.id);
      
      if (!category) {
        return res.status(404).json({ success: false, message: 'Category not found' });
      }

      res.status(200).json({
        success: true,
        message: 'Category retrieved successfully',
        data: { category }
      });
    } catch (error) {
      next(error);
    }
  },

  update: async (req, res, next) => {
    try {
      // Intentionally omitting description and code
      const payload = {
        name: req.body.name,
        status: req.body.status,
        remarks: req.body.remarks,
        format_ids: req.body.format_ids
      };

      const category = await categoryService.update(req.params.id, payload, req.user.id);

      res.status(200).json({
        success: true,
        message: `Category ${category.code} updated successfully.`,
        data: { category }
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
      await categoryService.delete(req.params.id);

      res.status(200).json({
        success: true,
        message: `Category deleted successfully.`
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
      const category = await categoryService.toggleStatus(req.params.id, req.user.id);

      res.status(200).json({
        success: true,
        message: `Category ${category.code} marked ${category.status}.`,
        data: { category }
      });
    } catch (error) {
      if (error.status === 404) {
        return res.status(404).json({ success: false, message: error.message });
      }
      next(error);
    }
  }
};
