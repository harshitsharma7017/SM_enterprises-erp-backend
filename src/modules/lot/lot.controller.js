import { lotService } from './lot.service.js';

export const lotController = {
  // GET /api/procurement/lots
  index: async (req, res, next) => {
    try {
      const result = await lotService.findAll({
        search: req.query.search,
        status: req.query.status,
        source_type: req.query.source_type,
        company_id: req.query.company_id,
        product_id: req.query.product_id,
        purchase_order_id: req.query.purchase_order_id,
        inward_entry_id: req.query.inward_entry_id,
        page: req.query.page || 1,
        limit: req.query.limit || 15,
      });
      res.json({ success: true, message: 'Lots retrieved successfully', data: result });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/procurement/lots/:id
  show: async (req, res, next) => {
    try {
      const lot = await lotService.findById(req.params.id);
      if (!lot) return res.status(404).json({ success: false, message: 'Lot not found' });
      res.json({ success: true, message: 'Lot retrieved successfully', data: { lot } });
    } catch (error) {
      next(error);
    }
  },
};
