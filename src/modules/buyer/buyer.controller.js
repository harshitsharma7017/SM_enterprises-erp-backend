import { buyerService } from './buyer.service.js';

export const buyerController = {
  index: async (req, res, next) => {
    try {
      const filters = {
        search: req.query.search,
        status: req.query.status,
        category_id: req.query.category_id,
        sort: req.query.sort,
        direction: req.query.direction,
        page: req.query.page || 1,
        limit: req.query.limit || 15
      };

      const result = await buyerService.findAll(filters);

      res.status(200).json({
        success: true,
        message: 'Buyers retrieved successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /buyers/create — dropdown/default data for a blank create form.
  create: async (req, res, next) => {
    try {
      const formData = await buyerService.getFormData();

      res.status(200).json({
        success: true,
        message: 'Buyer form data retrieved successfully',
        data: formData
      });
    } catch (error) {
      next(error);
    }
  },

  store: async (req, res, next) => {
    try {
      const buyer = await buyerService.create(req.body, req.user.id);
      res.status(201).json({
        success: true,
        message: `Buyer ${buyer.display_code} created successfully.`,
        data: { buyer }
      });
    } catch (error) {
      next(error);
    }
  },

  show: async (req, res, next) => {
    try {
      const buyer = await buyerService.findById(req.params.id);
      if (!buyer) {
        return res.status(404).json({ success: false, message: 'Buyer not found' });
      }
      res.status(200).json({
        success: true,
        message: 'Buyer retrieved successfully',
        data: { buyer }
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /buyers/:id/edit — dropdown/default data + the current buyer.
  edit: async (req, res, next) => {
    try {
      const buyer = await buyerService.findById(req.params.id);
      if (!buyer) {
        return res.status(404).json({ success: false, message: 'Buyer not found' });
      }

      const formData = await buyerService.getFormData();

      res.status(200).json({
        success: true,
        message: 'Buyer form data retrieved successfully',
        data: { buyer, ...formData }
      });
    } catch (error) {
      next(error);
    }
  },

  update: async (req, res, next) => {
    try {
      const buyer = await buyerService.update(req.params.id, req.body, req.user.id);
      res.status(200).json({
        success: true,
        message: `Buyer ${buyer.display_code} updated successfully.`,
        data: { buyer }
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
      const existing = await buyerService.findById(req.params.id);
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Buyer not found' });
      }
      const code = existing.display_code;

      await buyerService.delete(req.params.id);

      res.status(200).json({
        success: true,
        message: `Buyer ${code} deleted successfully.`
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
      const buyer = await buyerService.toggleStatus(req.params.id, req.user.id);
      res.status(200).json({
        success: true,
        message: `Buyer ${buyer.display_code} marked ${buyer.status}.`,
        data: { buyer }
      });
    } catch (error) {
      if (error.status === 404) {
        return res.status(404).json({ success: false, message: error.message });
      }
      next(error);
    }
  },

  storePaymentTerm: async (req, res, next) => {
    try {
      const result = await buyerService.storePaymentTerm(req.body.name);
      res.status(200).json(result);
    } catch (error) {
      if (error.status) {
        return res.status(error.status).json({ message: error.message });
      }
      next(error);
    }
  },

  storeDesignation: async (req, res, next) => {
    try {
      const result = await buyerService.storeDesignation(req.body.name);
      res.status(200).json(result);
    } catch (error) {
      if (error.status) {
        return res.status(error.status).json({ message: error.message });
      }
      next(error);
    }
  }
};
