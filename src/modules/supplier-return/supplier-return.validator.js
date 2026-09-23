import Joi from 'joi';

// Dates stay "YYYY-MM-DD" strings (Joi.date() would turn them into Date objects).
const dateString = Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).message('must be a date (YYYY-MM-DD)');

export const supplierReturnValidator = {
  // Always from one completed inspection; supplier, lot, GRN and PO are inherited from it.
  create: Joi.object({
    quality_inspection_id: Joi.number().integer().positive().required(),
    company_id: Joi.number().integer().positive().allow(null, ''),
    return_date: dateString.required(),
    // Validated against the lot's UOM in the service; kept unrounded here.
    quantity: Joi.alternatives().try(Joi.string().trim().max(30), Joi.number()).required(),
    reason: Joi.string().trim().max(255).allow(null, ''),
    remarks: Joi.string().max(2000).allow(null, ''),
  }),
};
