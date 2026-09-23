import Joi from 'joi';
import { pool } from '../../config/database.js';
import { validateGarmentPo } from './garment-po.validator.js';
import { GARMENT_ORIGINS } from './garment-po.service.js';

const itemColourSizeSchema = Joi.object({
  size: Joi.string().max(20).allow('', null),
  qty: Joi.number().integer().min(0).default(0)
});

const itemColourSchema = Joi.object({
  colour: Joi.string().max(255).allow('', null),
  sizes: Joi.array().items(itemColourSizeSchema).optional()
});

const itemSchema = Joi.object({
  id: Joi.number().integer().positive().optional(),
  order_confirmation_item_id: Joi.number().integer().positive().allow(null),
  design_no: Joi.string().max(255).allow('', null),
  description: Joi.string().max(1000).allow('', null),
  product_id: Joi.number().integer().positive().allow(null),
  unit: Joi.string().max(255).allow('', null),
  cost_price: Joi.number().min(0).allow(null),
  qty: Joi.number().integer().min(0).default(0),
  remarks: Joi.string().max(1000).allow('', null),
  custom: Joi.object().unknown(true).optional(),
  colours: Joi.array().items(itemColourSchema).optional()
});

const timelineSchema = Joi.object({
  date: Joi.date().iso().allow('', null),
  note: Joi.string().max(255).allow('', null),
  qty: Joi.number().integer().min(0).allow('', null)
});

const storeSchema = Joi.object({
  order_confirmation_id: Joi.number().integer().positive().required(),
  supplier_id: Joi.number().integer().positive().required(),
  po_date: Joi.date().iso().required(),
  dispatch_date: Joi.date().iso().allow('', null),
  delivery_details: Joi.string().max(2000).allow('', null),
  packing_details: Joi.string().max(2000).allow('', null),
  remarks: Joi.string().max(1000).allow('', null),
  status: Joi.string().valid('draft', 'raised', 'partial', 'received').default('draft'),
  items: Joi.array().items(itemSchema).optional(),
  timeline: Joi.array().items(timelineSchema).optional()
});

const updateSchema = Joi.object({
  po_date: Joi.date().iso().required(),
  dispatch_date: Joi.date().iso().allow('', null),
  delivery_details: Joi.string().max(2000).allow('', null),
  packing_details: Joi.string().max(2000).allow('', null),
  remarks: Joi.string().max(1000).allow('', null),
  status: Joi.string().valid('draft', 'raised', 'partial', 'received').default('draft'),
  items: Joi.array().items(itemSchema).optional(),
  timeline: Joi.array().items(timelineSchema).optional()
});

const rejectGarment = (res, errors) => res.status(400).json({ success: false, message: 'Validation failed', errors });

export const purchaseOrderValidator = {
  validateStore: (req, res, next) => {
    // Planning-origin (garment) PO — no order confirmation involved.
    if (GARMENT_ORIGINS.includes(req.body?.origin)) {
      const { errors, items } = validateGarmentPo(req.body, { origin: req.body.origin });
      if (errors.length > 0) return rejectGarment(res, errors);
      req.body.items = items;
      req.garmentPo = true;
      return next();
    }

    const { error, value } = storeSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
      return res.status(422).json({
        success: false,
        message: 'Validation failed',
        errors: error.details.map(err => err.message)
      });
    }
    req.body = value;
    next();
  },
  validateUpdate: async (req, res, next) => {
    // The saved PO's origin decides the rules; it cannot be changed by the request.
    try {
      const [rows] = await pool.query('SELECT origin FROM purchase_orders WHERE id = ? AND deleted_at IS NULL', [req.params.id]);
      if (rows.length && GARMENT_ORIGINS.includes(rows[0].origin)) {
        const { errors, items } = validateGarmentPo(req.body, { origin: rows[0].origin, isUpdate: true });
        if (errors.length > 0) return rejectGarment(res, errors);
        req.body.items = items;
        req.garmentPo = true;
        return next();
      }
    } catch (error) {
      return next(error);
    }

    const { error, value } = updateSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
      return res.status(422).json({
        success: false,
        message: 'Validation failed',
        errors: error.details.map(err => err.message)
      });
    }
    req.body = value;
    next();
  }
};
