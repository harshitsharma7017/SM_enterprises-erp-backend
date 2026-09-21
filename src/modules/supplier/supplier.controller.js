import { supplierService } from './supplier.service.js';

export const supplierController = {
  index: async (req, res, next) => {
    try {
      const filters = {
        search: req.query.search,
        status: req.query.status,
        party_type: req.query.party_type || 'supplier',
        category_id: req.query.category_id,
        sort: req.query.sort,
        direction: req.query.direction,
        page: req.query.page || 1,
        limit: req.query.limit || 15
      };

      const result = await supplierService.findAll(filters);

      res.status(200).json({
        success: true,
        message: 'Suppliers retrieved successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /suppliers/create — dropdown/default data for a blank create form.
  create: async (req, res, next) => {
    try {
      const partyType = req.query.party_type || 'supplier';
      const countryId = req.query.country_id ? Number(req.query.country_id) : undefined;
      const stateId = req.query.state_id ? Number(req.query.state_id) : undefined;

      const formData = await supplierService.getFormData(partyType, countryId, stateId, {
        agentFallback: ['supplier']
      });

      res.status(200).json({
        success: true,
        message: 'Supplier form data retrieved successfully',
        data: formData
      });
    } catch (error) {
      next(error);
    }
  },

  store: async (req, res, next) => {
    try {
      const supplier = await supplierService.create(req.body, req.user.id);
      res.status(201).json({
        success: true,
        message: `Supplier ${supplier.display_code} created successfully.`,
        data: { supplier }
      });
    } catch (error) {
      next(error);
    }
  },

  show: async (req, res, next) => {
    try {
      const supplier = await supplierService.findById(req.params.id);
      if (!supplier) {
        return res.status(404).json({ success: false, message: 'Supplier not found' });
      }
      res.status(200).json({
        success: true,
        message: 'Supplier retrieved successfully',
        data: { supplier }
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /suppliers/:id/edit — dropdown/default data + the current supplier.
  edit: async (req, res, next) => {
    try {
      const supplier = await supplierService.findById(req.params.id);
      if (!supplier) {
        return res.status(404).json({ success: false, message: 'Supplier not found' });
      }

      const partyType = req.query.party_type || supplier.party_type;
      const formData = await supplierService.getFormData(partyType, supplier.country_id, supplier.state_id, {
        agentFallback: ['supplier']
      });

      res.status(200).json({
        success: true,
        message: 'Supplier form data retrieved successfully',
        data: { supplier, ...formData }
      });
    } catch (error) {
      next(error);
    }
  },

  update: async (req, res, next) => {
    try {
      const supplier = await supplierService.update(req.params.id, req.body, req.user.id);
      res.status(200).json({
        success: true,
        message: `Supplier ${supplier.display_code} updated successfully.`,
        data: { supplier }
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
        return res.status(404).json({ success: false, message: 'Supplier not found' });
      }
      const code = existing.display_code;

      await supplierService.delete(req.params.id);

      res.status(200).json({
        success: true,
        message: `Supplier ${code} deleted successfully.`
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
      const supplier = await supplierService.toggleStatus(req.params.id, req.user.id);
      res.status(200).json({
        success: true,
        message: `Supplier ${supplier.display_code} marked ${supplier.status}.`,
        data: { supplier }
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
      const partyType = req.query.party_type;
      const agents = await supplierService.agentsForPartyType(partyType, ['supplier']);
      res.status(200).json(agents.map((a) => ({ id: a.id, name: `${a.name} (${a.display_code})` })));
    } catch (error) {
      next(error);
    }
  },

  storeSupplierType: async (req, res, next) => {
    try {
      const result = await supplierService.storeSupplierType(req.body.name);
      res.status(200).json(result);
    } catch (error) {
      if (error.status) {
        return res.status(error.status).json({ message: error.message });
      }
      next(error);
    }
  }
};
