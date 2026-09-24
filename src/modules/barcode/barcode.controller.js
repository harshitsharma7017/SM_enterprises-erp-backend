import { barcodeService } from './barcode.service.js';
import { barcodeRepository } from './barcode.repository.js';
import { pool } from '../../config/database.js';

const FILTERS = ['company_id', 'status', 'source_type', 'product_id', 'lot_id', 'lot', 'date_from', 'date_to', 'search', 'page', 'limit'];
const SCAN_FILTERS = ['company_id', 'barcode_id', 'lot_id', 'scanned_by', 'location_id', 'context', 'result', 'duplicate', 'date_from', 'date_to', 'search', 'page', 'limit'];
const pick = (query, keys) => Object.fromEntries(keys.map((k) => [k, query[k]]));

/** Barcode + its lot (with stock and trace) + its latest scans. */
const detail = async (id, userId) => {
  const barcode = await barcodeRepository.findById(pool, id);
  if (!barcode) return null;
  const scans = await barcodeRepository.findScans({ barcode_id: barcode.id, limit: 100 });
  return { ...barcode, ...(await barcodeService.lotContext(barcode.lot_id, userId)), scans: scans.rows, scans_total: scans.total };
};

export const barcodeController = {
  // GET /api/barcodes
  index: async (req, res, next) => {
    try {
      const result = await barcodeRepository.findAll(pick(req.query, FILTERS));
      res.json({ success: true, data: result.rows, meta: { total: result.total, page: result.page, limit: result.limit } });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/barcodes/form-data?company_id=&search= — received lots without an active barcode
  formData: async (req, res, next) => {
    try {
      res.json({ success: true, data: await barcodeService.formData(req.query) });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/barcodes/scans — scan history
  scans: async (req, res, next) => {
    try {
      const result = await barcodeRepository.findScans(pick(req.query, SCAN_FILTERS));
      res.json({ success: true, data: result.rows, meta: { total: result.total, page: result.page, limit: result.limit } });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/barcodes/:id
  show: async (req, res, next) => {
    try {
      const data = await detail(req.params.id, req.user.id);
      if (!data) return res.status(404).json({ success: false, message: 'Barcode not found' });
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/barcodes — generate for a lot
  create: async (req, res, next) => {
    try {
      const id = await barcodeService.create(req.body, req.user.id);
      const data = await detail(id, req.user.id);
      res.status(201).json({ success: true, message: `Barcode ${data.barcode_value} generated for lot ${data.lot_no}.`, data });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/barcodes/:id/retire
  retire: async (req, res, next) => {
    try {
      await barcodeService.retire(req.params.id, req.body.reason, req.user.id);
      const data = await detail(req.params.id, req.user.id);
      res.json({ success: true, message: `Barcode ${data.barcode_value} retired.`, data });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/barcodes/scan — { barcode, company_id, context?, location_id? }
  scan: async (req, res, next) => {
    try {
      const data = await barcodeService.scan(req.body, req.user.id);
      res.json({
        success: true,
        message: data.duplicate ? `Already scanned (${data.context_scans_count - 1} earlier scan(s) in this context).` : 'First scan.',
        data,
      });
    } catch (error) {
      // Refused scans are still recorded; say which history row they are.
      if (error && error.scan_id) return res.status(error.status).json({ success: false, message: error.message, scan_id: error.scan_id });
      next(error);
    }
  },
};
