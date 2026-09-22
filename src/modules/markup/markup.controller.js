import { markupService } from './markup.service.js';

export const markupController = {
  // GET /api/masters/markups
  index: async (req, res, next) => {
    try {
      const filters = {
        search:    req.query.search,
        status:    req.query.status,
        sort:      req.query.sort,
        direction: req.query.direction,
        page:      req.query.page  || 1,
        limit:     req.query.limit || 10,
      };
      const result = await markupService.findAll(filters);
      res.status(200).json({ success: true, message: 'Markup rules retrieved successfully', data: result });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/masters/markups/create
  create: async (req, res, next) => {
    try {
      const formData = await markupService.getFormData(null, null);
      res.status(200).json({ success: true, message: 'Markup form data retrieved successfully', data: formData });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/masters/markups
  store: async (req, res, next) => {
    try {
      const markup = await markupService.create(req.body, req.user.id);
      res.status(201).json({
        success: true,
        message: `Markup rule for ${markup.supplier_name} → ${markup.buyer_name} created successfully.`,
        data: { markup },
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/masters/markups/:id
  show: async (req, res, next) => {
    try {
      const markup = await markupService.findById(req.params.id);
      if (!markup) return res.status(404).json({ success: false, message: 'Markup rule not found' });
      const enriched = markupService.enrich(markup);
      const preview  = markupService.preview(markup);
      res.status(200).json({ success: true, message: 'Markup rule retrieved successfully', data: { markup: enriched, preview } });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/masters/markups/:id/edit
  edit: async (req, res, next) => {
    try {
      const markup = await markupService.findById(req.params.id);
      if (!markup) return res.status(404).json({ success: false, message: 'Markup rule not found' });
      const formData = await markupService.getFormData(markup.supplier_id, markup.buyer_id);
      const enriched = markupService.enrich(markup);
      res.status(200).json({ success: true, message: 'Markup form data retrieved successfully', data: { markup: enriched, ...formData } });
    } catch (error) {
      next(error);
    }
  },

  // PUT /api/masters/markups/:id
  update: async (req, res, next) => {
    try {
      const markup = await markupService.update(req.params.id, req.body, req.user.id);
      res.status(200).json({ success: true, message: 'Markup rule updated successfully.', data: { markup } });
    } catch (error) {
      if (error.status === 404) return res.status(404).json({ success: false, message: error.message });
      next(error);
    }
  },

  // DELETE /api/masters/markups/:id
  destroy: async (req, res, next) => {
    try {
      await markupService.delete(req.params.id);
      res.status(200).json({ success: true, message: 'Markup rule deleted successfully.' });
    } catch (error) {
      if (error.status === 404) return res.status(404).json({ success: false, message: error.message });
      next(error);
    }
  },

  // PATCH /api/masters/markups/:id/toggle-status
  toggleStatus: async (req, res, next) => {
    try {
      const markup = await markupService.toggleStatus(req.params.id, req.user.id);
      res.status(200).json({ success: true, message: `Markup rule marked ${markup.status}.`, data: { markup } });
    } catch (error) {
      if (error.status === 404) return res.status(404).json({ success: false, message: error.message });
      next(error);
    }
  },

  // GET /api/masters/markups/supplier-discount
  supplierDiscount: async (req, res, next) => {
    try {
      const { pool } = await import('../../config/database.js');
      const [rows] = await pool.query(
        'SELECT id, discount_percent FROM suppliers WHERE id = ? AND deleted_at IS NULL',
        [req.query.supplier_id]
      );
      const supplier = rows[0];
      res.status(200).json({ discount_percent: supplier ? (parseFloat(supplier.discount_percent) || 0) : null });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/masters/markups/supplier-agent-commission
  supplierAgentCommission: async (req, res, next) => {
    try {
      const { pool } = await import('../../config/database.js');
      const [rows] = await pool.query(`
        SELECT s.agent_commission_type, s.agent_commission_value,
               a.name AS agent_name, a.display_code AS agent_display_code
        FROM suppliers s LEFT JOIN agents a ON a.id = s.agent_id
        WHERE s.id = ? AND s.deleted_at IS NULL`,
        [req.query.supplier_id]
      );
      const s = rows[0];
      const formatLabel = (type, value) => {
        if (!type || value === null || value === undefined) return null;
        const v = parseFloat(value);
        if (isNaN(v)) return null;
        const formatted = v.toFixed(4).replace(/\.?0+$/, '');
        return type === 'percent' ? `${formatted}%` : `${formatted} INR`;
      };
      res.status(200).json({
        agent: s && s.agent_name ? `${s.agent_name} (${s.agent_display_code})` : null,
        commission: s ? formatLabel(s.agent_commission_type, s.agent_commission_value) : null,
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/masters/markups/buyer-agent-commission
  buyerAgentCommission: async (req, res, next) => {
    try {
      const { pool } = await import('../../config/database.js');
      const [rows] = await pool.query(`
        SELECT b.agent_commission_type, b.agent_commission_value,
               a.name AS agent_name, a.display_code AS agent_display_code
        FROM buyers b LEFT JOIN agents a ON a.id = b.agent_id
        WHERE b.id = ? AND b.deleted_at IS NULL`,
        [req.query.buyer_id]
      );
      const b = rows[0];
      const formatLabel = (type, value) => {
        if (!type || value === null || value === undefined) return null;
        const v = parseFloat(value);
        if (isNaN(v)) return null;
        const formatted = v.toFixed(4).replace(/\.?0+$/, '');
        return type === 'percent' ? `${formatted}%` : `${formatted} INR`;
      };
      res.status(200).json({
        agent: b && b.agent_name ? `${b.agent_name} (${b.agent_display_code})` : null,
        commission: b ? formatLabel(b.agent_commission_type, b.agent_commission_value) : null,
      });
    } catch (error) {
      next(error);
    }
  },
};
