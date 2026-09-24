import Joi from 'joi';

// Dates stay "YYYY-MM-DD" strings (Joi.date() would turn them into Date objects).
const dateString = Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).message('must be a date (YYYY-MM-DD)');
// Quantities are validated against the lot / PO line UOM in the service; kept unrounded here.
const decimalInput = Joi.alternatives().try(Joi.string().trim().max(30), Joi.number());
const optionalId = Joi.number().integer().positive().allow(null, '');

// Product, UOM, company and buyer are always derived server-side; only the source links and quantity are sent.
const line = Joi.object({
  order_confirmation_item_id: optionalId,
  lot_id: optionalId,
  purchase_order_item_id: optionalId,
  quantity: decimalInput.required(),
  remarks: Joi.string().max(1000).allow(null, ''),
});

const details = {
  dispatch_date: dateString.required(),
  location_id: optionalId,
  buyer_id: optionalId,
  destination_name: Joi.string().trim().max(200).allow(null, ''),
  destination_address: Joi.string().max(1000).allow(null, ''),
  transporter: Joi.string().trim().max(150).allow(null, ''),
  vehicle_no: Joi.string().trim().max(50).allow(null, ''),
  document_reference: Joi.string().trim().max(100).allow(null, ''),
  invoice_reference: Joi.string().trim().max(100).allow(null, ''),
  remarks: Joi.string().max(2000).allow(null, ''),
  items: Joi.array().items(line).min(1).max(200).required(),
};

export const dispatchValidator = {
  create: Joi.object({
    dispatch_type: Joi.string().valid('STOCK_DISPATCH', 'DIRECT_SUPPLIER_DISPATCH').required(),
    company_id: optionalId,
    order_confirmation_id: Joi.when('dispatch_type', { is: 'STOCK_DISPATCH', then: Joi.number().integer().positive().required(), otherwise: Joi.any().strip() }),
    purchase_order_id: Joi.when('dispatch_type', { is: 'DIRECT_SUPPLIER_DISPATCH', then: Joi.number().integer().positive().required(), otherwise: Joi.any().strip() }),
    ...details,
    location_id: Joi.when('dispatch_type', { is: 'STOCK_DISPATCH', then: Joi.number().integer().positive().required(), otherwise: Joi.any().strip() }),
  }),

  update: Joi.object({ company_id: optionalId, ...details }),

  cancel: Joi.object({ reason: Joi.string().trim().max(500).allow(null, '') }),
};
