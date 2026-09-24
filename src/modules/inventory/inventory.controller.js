import { inventoryService } from './inventory.service.js';
import { inventoryRepository } from './inventory.repository.js';

const pick = (query, keys) => Object.fromEntries(keys.map((k) => [k, query[k]]));
const list = (res, result) => res.json({ success: true, data: result.rows, meta: { total: result.total, page: result.page, limit: result.limit } });

const STOCK_FILTERS = ['company_id', 'product_id', 'material_type_id', 'lot_id', 'lot', 'lot_source', 'supplier_id', 'location_id', 'stock_status', 'date_from', 'date_to', 'search', 'page', 'limit'];
const LEDGER_FILTERS = ['company_id', 'product_id', 'lot_id', 'lot', 'location_id', 'quality_inspection_id', 'processing_record_id', 'movement_type', 'source_type', 'source', 'date_from', 'date_to', 'search', 'page', 'limit'];

export const inventoryController = {
  // GET /api/inventory/stock — lot balances per location
  stock: async (req, res, next) => {
    try {
      list(res, await inventoryRepository.findBalances(pick(req.query, STOCK_FILTERS)));
    } catch (error) {
      next(error);
    }
  },

  // GET /api/inventory/stock/products — stock per product and UOM
  productStock: async (req, res, next) => {
    try {
      list(res, await inventoryRepository.findProductTotals(pick(req.query, STOCK_FILTERS)));
    } catch (error) {
      next(error);
    }
  },

  // GET /api/inventory/stock/lots/:lotId
  lotStock: async (req, res, next) => {
    try {
      const data = await inventoryService.lotStock(req.params.lotId);
      if (!data) return res.status(404).json({ success: false, message: 'Lot not found' });
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/inventory/stock/postable?company_id= | ?quality_inspection_id=
  postable: async (req, res, next) => {
    try {
      res.json({ success: true, data: await inventoryService.postableInspections(req.query.company_id, req.query.quality_inspection_id) });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/inventory/stock/receive-qc
  receiveQc: async (req, res, next) => {
    try {
      const id = await inventoryService.receiveQc(req.body, req.user.id);
      const movement = await inventoryService.movementDetail(id);
      res.status(201).json({ success: true, message: `Posted to stock as ${movement.movement_no}.`, data: movement });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/inventory/stock/adjustments
  adjust: async (req, res, next) => {
    try {
      const id = await inventoryService.adjust(req.body, req.user.id);
      const movement = await inventoryService.movementDetail(id);
      res.status(201).json({ success: true, message: `Stock adjustment ${movement.movement_no} posted.`, data: movement });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/inventory/ledger
  ledger: async (req, res, next) => {
    try {
      list(res, await inventoryRepository.findMovements(pick(req.query, LEDGER_FILTERS)));
    } catch (error) {
      next(error);
    }
  },

  // GET /api/inventory/ledger/:id
  movement: async (req, res, next) => {
    try {
      const movement = await inventoryService.movementDetail(req.params.id);
      if (!movement) return res.status(404).json({ success: false, message: 'Stock movement not found' });
      res.json({ success: true, data: movement });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/inventory/locations
  locations: async (req, res, next) => {
    try {
      list(res, await inventoryRepository.findLocations(pick(req.query, ['company_id', 'status', 'search', 'page', 'limit'])));
    } catch (error) {
      next(error);
    }
  },

  // GET /api/inventory/locations/:id
  location: async (req, res, next) => {
    try {
      const location = await inventoryRepository.findLocation(undefined, req.params.id);
      if (!location) return res.status(404).json({ success: false, message: 'Stock location not found' });
      res.json({ success: true, data: location });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/inventory/locations
  createLocation: async (req, res, next) => {
    try {
      const id = await inventoryService.createLocation(req.body, req.user.id);
      const location = await inventoryRepository.findLocation(undefined, id);
      res.status(201).json({ success: true, message: `Location ${location.code} created.`, data: location });
    } catch (error) {
      next(error);
    }
  },

  // PUT /api/inventory/locations/:id
  updateLocation: async (req, res, next) => {
    try {
      await inventoryService.updateLocation(req.params.id, req.body, req.user.id);
      const location = await inventoryRepository.findLocation(undefined, req.params.id);
      res.json({ success: true, message: `Location ${location.code} updated.`, data: location });
    } catch (error) {
      next(error);
    }
  },
};
