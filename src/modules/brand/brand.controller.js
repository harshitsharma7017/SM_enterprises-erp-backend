import { brandService } from './brand.service.js';

const sendKnownError = (res, error) => {
  if (error.status === 404 || error.status === 400) {
    res.status(error.status).json({ success: false, message: error.message });
    return true;
  }
  return false;
};

export const brandController = {
  // GET /api/masters/brands
  index: async (req, res, next) => {
    try {
      const result = await brandService.findAll({
        search: req.query.search,
        status: req.query.status,
        company_id: req.query.company_id,
        page: req.query.page || 1,
        limit: req.query.limit || 15,
      });
      res.status(200).json({ success: true, message: 'Brands retrieved successfully', data: result });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/masters/brands/:id
  show: async (req, res, next) => {
    try {
      const brand = await brandService.findById(req.params.id);
      if (!brand) return res.status(404).json({ success: false, message: 'Brand not found' });
      res.status(200).json({ success: true, message: 'Brand retrieved successfully', data: { brand } });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/masters/brands
  store: async (req, res, next) => {
    try {
      const brand = await brandService.create(req.body, req.user.id);
      res.status(201).json({ success: true, message: `Brand ${brand.code} created successfully.`, data: { brand } });
    } catch (error) {
      next(error);
    }
  },

  // PUT /api/masters/brands/:id
  update: async (req, res, next) => {
    try {
      const brand = await brandService.update(req.params.id, req.body, req.user.id);
      res.status(200).json({ success: true, message: `Brand ${brand.code} updated successfully.`, data: { brand } });
    } catch (error) {
      if (sendKnownError(res, error)) return;
      next(error);
    }
  },

  // PATCH /api/masters/brands/:id/toggle-status
  toggleStatus: async (req, res, next) => {
    try {
      const brand = await brandService.toggleStatus(req.params.id, req.user.id);
      res.status(200).json({ success: true, message: `Brand ${brand.code} marked ${brand.status}.`, data: { brand } });
    } catch (error) {
      if (sendKnownError(res, error)) return;
      next(error);
    }
  },

  // DELETE /api/masters/brands/:id
  destroy: async (req, res, next) => {
    try {
      await brandService.delete(req.params.id);
      res.status(200).json({ success: true, message: 'Brand deleted successfully.' });
    } catch (error) {
      if (sendKnownError(res, error)) return;
      next(error);
    }
  },
};
