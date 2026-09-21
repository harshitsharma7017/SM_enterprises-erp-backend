import { productService } from './product.service.js';

export const productController = {
  index: async (req, res, next) => {
    try {
      const filters = {
        search: req.query.search,
        status: req.query.status,
        category_id: req.query.category_id,
        sort: req.query.sort,
        direction: req.query.direction,
        page: req.query.page || 1,
        limit: req.query.limit || 10
      };

      const result = await productService.findAll(filters);

      res.status(200).json({
        success: true,
        message: 'Products retrieved successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /products/create — dropdown/default data for a blank create form.
  create: async (req, res, next) => {
    try {
      const formData = await productService.getFormData(null);

      res.status(200).json({
        success: true,
        message: 'Product form data retrieved successfully',
        data: formData
      });
    } catch (error) {
      next(error);
    }
  },

  store: async (req, res, next) => {
    try {
      const product = await productService.create(req.body, req.user.id);
      res.status(201).json({
        success: true,
        message: `Product ${product.item_group_code} created successfully.`,
        data: { product }
      });
    } catch (error) {
      next(error);
    }
  },

  show: async (req, res, next) => {
    try {
      const product = await productService.findById(req.params.id);
      if (!product) {
        return res.status(404).json({ success: false, message: 'Product not found' });
      }
      res.status(200).json({
        success: true,
        message: 'Product retrieved successfully',
        data: { product }
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /products/:id/edit — dropdown/default data + the current product.
  edit: async (req, res, next) => {
    try {
      const product = await productService.findById(req.params.id);
      if (!product) {
        return res.status(404).json({ success: false, message: 'Product not found' });
      }

      const formData = await productService.getFormData(product);

      res.status(200).json({
        success: true,
        message: 'Product form data retrieved successfully',
        data: { product, ...formData }
      });
    } catch (error) {
      next(error);
    }
  },

  update: async (req, res, next) => {
    try {
      const product = await productService.update(req.params.id, req.body, req.user.id);
      res.status(200).json({
        success: true,
        message: `Product ${product.item_group_code} updated successfully.`,
        data: { product }
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
      const existing = await productService.findById(req.params.id);
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Product not found' });
      }
      const code = existing.item_group_code;

      await productService.delete(req.params.id);

      res.status(200).json({
        success: true,
        message: `Product ${code} deleted successfully.`
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
      const product = await productService.toggleStatus(req.params.id, req.user.id);
      res.status(200).json({
        success: true,
        message: `Product ${product.item_group_code} marked ${product.status}.`,
        data: { product }
      });
    } catch (error) {
      if (error.status === 404) {
        return res.status(404).json({ success: false, message: error.message });
      }
      next(error);
    }
  },

  checkCode: async (req, res, next) => {
    try {
      const field = req.query.field;
      const value = req.query.value;
      const ignore = req.query.ignore || null;

      const result = await productService.checkCode(field, value, ignore);
      res.status(200).json(result);
    } catch (error) {
      if (error.status) {
        return res.status(error.status).json({ message: error.message });
      }
      next(error);
    }
  },

  storeGstRate: async (req, res, next) => {
    try {
      const result = await productService.storeGstRate(req.body.name);
      res.status(200).json(result);
    } catch (error) {
      if (error.status) {
        return res.status(error.status).json({ message: error.message });
      }
      next(error);
    }
  }
};
