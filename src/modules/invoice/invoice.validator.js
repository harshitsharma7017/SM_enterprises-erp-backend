import Joi from 'joi';

// Dates stay "YYYY-MM-DD" strings (Joi.date() would turn them into Date objects).
const dateString = Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).message('must be a date (YYYY-MM-DD)');
// Quantities are validated against the dispatch line's UOM in the service; kept unrounded here.
const decimalInput = Joi.alternatives().try(Joi.string().trim().max(30), Joi.number());
const optionalId = Joi.number().integer().positive().allow(null, '');

// Company, customer, order, currency, product, UOM, lot and price are always derived from the dispatch lines.
const line = Joi.object({
  dispatch_item_id: Joi.number().integer().positive().required(),
  quantity: decimalInput.required(),
  remarks: Joi.string().max(1000).allow(null, ''),
});

const details = {
  company_id: optionalId,
  proforma_invoice_id: optionalId,
  invoice_date: dateString.required(),
  reference: Joi.string().trim().max(100).allow(null, ''),
  remarks: Joi.string().max(2000).allow(null, ''),
  items: Joi.array().items(line).min(1).max(200).required(),
};

export const invoiceValidator = {
  create: Joi.object(details),

  update: Joi.object(details),

  cancel: Joi.object({ reason: Joi.string().trim().max(500).allow(null, '') }),
};
