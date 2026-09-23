import { companyService } from './company.service.js';

const sendKnownError = (res, error) => {
  if (error.status === 404 || error.status === 400) {
    res.status(error.status).json({ success: false, message: error.message });
    return true;
  }
  return false;
};

export const companyController = {
  // GET /api/administration/companies
  index: async (req, res, next) => {
    try {
      const result = await companyService.findAll({
        search: req.query.search,
        status: req.query.status,
        offset: req.query.offset || 0,
        limit: req.query.limit || 10,
      });
      res.status(200).json({ success: true, message: 'Companies retrieved successfully', data: result });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/administration/companies/options
  options: async (req, res, next) => {
    try {
      const companies = await companyService.options();
      res.status(200).json({ success: true, message: 'Companies retrieved successfully', data: { companies } });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/administration/companies/:id
  show: async (req, res, next) => {
    try {
      const company = await companyService.findById(req.params.id);
      if (!company) return res.status(404).json({ success: false, message: 'Company not found' });
      res.status(200).json({ success: true, message: 'Company retrieved successfully', data: { company } });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/administration/companies
  store: async (req, res, next) => {
    try {
      const company = await companyService.create(req.body, req.user.id);
      res.status(201).json({ success: true, message: `Company ${company.code} created successfully.`, data: { company } });
    } catch (error) {
      next(error);
    }
  },

  // PUT /api/administration/companies/:id
  update: async (req, res, next) => {
    try {
      const company = await companyService.update(req.params.id, req.body, req.user.id);
      res.status(200).json({ success: true, message: `Company ${company.code} updated successfully.`, data: { company } });
    } catch (error) {
      if (sendKnownError(res, error)) return;
      next(error);
    }
  },

  // PATCH /api/administration/companies/:id/toggle-status
  toggleStatus: async (req, res, next) => {
    try {
      const company = await companyService.toggleStatus(req.params.id, req.user.id);
      res.status(200).json({
        success: true,
        message: `Company ${company.code} marked ${company.is_active ? 'active' : 'inactive'}.`,
        data: { company },
      });
    } catch (error) {
      if (sendKnownError(res, error)) return;
      next(error);
    }
  },

  // DELETE /api/administration/companies/:id
  destroy: async (req, res, next) => {
    try {
      await companyService.delete(req.params.id);
      res.status(200).json({ success: true, message: 'Company deleted successfully.' });
    } catch (error) {
      if (sendKnownError(res, error)) return;
      next(error);
    }
  },
};
