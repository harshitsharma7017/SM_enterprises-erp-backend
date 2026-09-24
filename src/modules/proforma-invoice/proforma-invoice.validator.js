import Joi from 'joi';

// Dates stay "YYYY-MM-DD" strings (Joi.date() would turn them into Date objects).
const dateString = Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).message('must be a date (YYYY-MM-DD)');
// Quantities are validated against the order item's UOM in the service; kept unrounded here.
const decimalInput = Joi.alternatives().try(Joi.string().trim().max(30), Joi.number());
const optionalId = Joi.number().integer().positive().allow(null, '');

// Company, buyer, currency, product, UOM, description and price are always derived from the order.
const line = Joi.object({
  order_confirmation_item_id: Joi.number().integer().positive().required(),
  quantity: decimalInput.required(),
  remarks: Joi.string().max(1000).allow(null, ''),
});

const details = {
  company_id: optionalId,
  pi_date: dateString.required(),
  valid_until: dateString.allow(null, ''),
  reference: Joi.string().trim().max(100).allow(null, ''),
  payment_terms: Joi.string().trim().max(255).allow(null, ''),
  remarks: Joi.string().max(2000).allow(null, ''),
  items: Joi.array().items(line).min(1).max(200).required(),
};

export const proformaInvoiceValidator = {
  create: Joi.object({ order_confirmation_id: Joi.number().integer().positive().required(), ...details }),

  update: Joi.object(details),

  cancel: Joi.object({ reason: Joi.string().trim().max(500).allow(null, '') }),

  commercialReference: Joi.object({
    confirmation_reference: Joi.string().trim().max(100).allow(null, ''),
    confirmation_date: dateString.allow(null, ''),
    payment_reference: Joi.string().trim().max(100).allow(null, ''),
    payment_date: dateString.allow(null, ''),
    commercial_remarks: Joi.string().max(2000).allow(null, ''),
  }),
};
