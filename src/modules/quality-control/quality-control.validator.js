import Joi from 'joi';

// Dates stay "YYYY-MM-DD" strings (Joi.date() would turn them into Date objects).
const dateString = Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).message('must be a date (YYYY-MM-DD)');
// Quantities are validated against the lot's UOM in the service; keep them unrounded here.
const decimalInput = Joi.alternatives().try(Joi.string().trim().max(30), Joi.number());

const inspection = {
  inspection_date: dateString.required(),
  inspected_quantity: decimalInput.required(),
  accepted_quantity: decimalInput.allow(null, ''),
  rejected_quantity: decimalInput.allow(null, ''),
  return_quantity: decimalInput.allow(null, ''),
  shade: Joi.string().trim().max(100).allow(null, ''),
  edge_to_edge_shade: Joi.string().trim().max(100).allow(null, ''),
  weaving_defects: Joi.string().max(2000).allow(null, ''),
  remarks: Joi.string().max(2000).allow(null, ''),
};

export const qualityControlValidator = {
  // Always against one received lot; company, supplier, GRN and PO come from the lot.
  create: Joi.object({
    lot_id: Joi.number().integer().positive().required(),
    company_id: Joi.number().integer().positive().allow(null, ''),
    ...inspection,
  }),

  update: Joi.object(inspection),

  cancel: Joi.object({
    reason: Joi.string().trim().max(500).allow(null, ''),
  }),
};
