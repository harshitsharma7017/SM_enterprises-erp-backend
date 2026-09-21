import { agentService } from './agent.service.js';

export const agentController = {
  index: async (req, res, next) => {
    try {
      const filters = {
        search: req.query.search,
        status: req.query.status,
        agent_type: req.query.agent_type,
        sort: req.query.sort,
        direction: req.query.direction,
        page: req.query.page || 1,
        limit: req.query.limit || 10
      };

      const result = await agentService.findAll(filters);

      res.status(200).json({
        success: true,
        message: 'Agents retrieved successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /agents/create — dropdown/default data for a blank create form.
  create: async (req, res, next) => {
    try {
      const formData = await agentService.getFormData(null);

      res.status(200).json({
        success: true,
        message: 'Agent form data retrieved successfully',
        data: formData
      });
    } catch (error) {
      next(error);
    }
  },

  store: async (req, res, next) => {
    try {
      const agent = await agentService.create(req.body, req.user.id);
      res.status(201).json({
        success: true,
        message: `Agent ${agent.display_code} created successfully.`,
        data: { agent }
      });
    } catch (error) {
      next(error);
    }
  },

  show: async (req, res, next) => {
    try {
      const agent = await agentService.findById(req.params.id);
      if (!agent) {
        return res.status(404).json({ success: false, message: 'Agent not found' });
      }
      res.status(200).json({
        success: true,
        message: 'Agent retrieved successfully',
        data: { agent }
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /agents/:id/edit — dropdown/default data + the current agent.
  edit: async (req, res, next) => {
    try {
      const agent = await agentService.findById(req.params.id);
      if (!agent) {
        return res.status(404).json({ success: false, message: 'Agent not found' });
      }

      const formData = await agentService.getFormData(agent);

      res.status(200).json({
        success: true,
        message: 'Agent form data retrieved successfully',
        data: { agent, ...formData }
      });
    } catch (error) {
      next(error);
    }
  },

  update: async (req, res, next) => {
    try {
      const agent = await agentService.update(req.params.id, req.body, req.user.id);
      res.status(200).json({
        success: true,
        message: `Agent ${agent.display_code} updated successfully.`,
        data: { agent }
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
      const existing = await agentService.findById(req.params.id);
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Agent not found' });
      }
      const code = existing.display_code;

      await agentService.delete(req.params.id);

      res.status(200).json({
        success: true,
        message: `Agent ${code} deleted successfully.`
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
      const agent = await agentService.toggleStatus(req.params.id, req.user.id);
      res.status(200).json({
        success: true,
        message: `Agent ${agent.display_code} marked ${agent.status}.`,
        data: { agent }
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

      const result = await agentService.checkCode(field, value, ignore);
      res.status(200).json(result);
    } catch (error) {
      if (error.status) {
        return res.status(error.status).json({ message: error.message });
      }
      next(error);
    }
  }
};
