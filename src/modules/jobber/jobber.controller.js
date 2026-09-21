import { supplierService } from '../supplier/supplier.service.js';

// Jobber is a thin screen over the same suppliers table/service as Supplier
// (party_type = 'jobber'), matching JobberController reusing SupplierService
// directly in the Laravel source. No duplicate business logic lives here.

export const jobberController = {
  index: async (req, res, next) => {
    try {
      const filters = {
        search: req.query.search,
        status: req.query.status,
        // Always 'jobber' — JobberController::index() hardcodes ofParty('jobber')
        // with no query override, unlike the Supplier screen.
        party_type: 'jobber',
        category_id: req.query.category_id,
        sort: req.query.sort,
        direction: req.query.direction,
        page: req.query.page || 1,
        limit: req.query.limit || 15
      };

      const result = await supplierService.findAll(filters);

      res.status(200).json({
        success: true,
        message: 'Jobbers retrieved successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  },

  create: async (req, res, next) => {
    try {
      const countryId = req.query.country_id ? Number(req.query.country_id) : undefined;
      const stateId = req.query.state_id ? Number(req.query.state_id) : undefined;

      const formData = await supplierService.getFormData('jobber', countryId, stateId, {
        includeJobwork: true,
        agentFallback: ['jobber']
      });

      res.status(200).json({
        success: true,
        message: 'Jobber form data retrieved successfully',
        data: formData
      });
    } catch (error) {
      next(error);
    }
  },

  store: async (req, res, next) => {
    try {
      // Defensive fallback mirroring JobberController::store()'s
      // `if (empty($data['party_type'])) $data['party_type'] = 'jobber'` —
      // in practice unreachable here too, since jobber.routes.js already
      // defaults req.body.party_type before validation runs.
      const jobber = await supplierService.create(req.body, req.user.id, { defaultPartyType: 'jobber' });
      res.status(201).json({
        success: true,
        message: `Jobber ${jobber.display_code} created successfully.`,
        data: { jobber }
      });
    } catch (error) {
      next(error);
    }
  },

  show: async (req, res, next) => {
    try {
      const jobber = await supplierService.findById(req.params.id, { includeJobwork: true });
      if (!jobber) {
        return res.status(404).json({ success: false, message: 'Jobber not found' });
      }
      res.status(200).json({
        success: true,
        message: 'Jobber retrieved successfully',
        data: { jobber }
      });
    } catch (error) {
      next(error);
    }
  },

  edit: async (req, res, next) => {
    try {
      const jobber = await supplierService.findById(req.params.id, { includeJobwork: true });
      if (!jobber) {
        return res.status(404).json({ success: false, message: 'Jobber not found' });
      }

      const partyType = req.query.party_type || jobber.party_type;
      const formData = await supplierService.getFormData(partyType, jobber.country_id, jobber.state_id, {
        includeJobwork: true,
        agentFallback: ['jobber']
      });

      res.status(200).json({
        success: true,
        message: 'Jobber form data retrieved successfully',
        data: { jobber, ...formData }
      });
    } catch (error) {
      next(error);
    }
  },

  update: async (req, res, next) => {
    try {
      const jobber = await supplierService.update(req.params.id, req.body, req.user.id);
      res.status(200).json({
        success: true,
        message: `Jobber ${jobber.display_code} updated successfully.`,
        data: { jobber }
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
      const existing = await supplierService.findById(req.params.id);
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Jobber not found' });
      }
      const code = existing.display_code;

      await supplierService.delete(req.params.id);

      res.status(200).json({
        success: true,
        message: `Jobber ${code} deleted successfully.`
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
      const jobber = await supplierService.toggleStatus(req.params.id, req.user.id);
      res.status(200).json({
        success: true,
        message: `Jobber ${jobber.display_code} marked ${jobber.status}.`,
        data: { jobber }
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
      const result = await supplierService.checkCode(req.query.value, req.query.ignore || null);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  },

  agents: async (req, res, next) => {
    try {
      const partyType = req.query.party_type || 'jobber';
      const agents = await supplierService.agentsForPartyType(partyType, ['jobber']);
      res.status(200).json(agents.map((a) => ({ id: a.id, name: `${a.name} (${a.display_code})` })));
    } catch (error) {
      next(error);
    }
  }
};
