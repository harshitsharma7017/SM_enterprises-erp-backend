import Joi from 'joi';

// Dates stay "YYYY-MM-DD" strings (Joi.date() would turn them into Date objects).
const dateString = Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).message('must be a date (YYYY-MM-DD)');
// Quantities are validated against the lot / output UOM in the services; kept unrounded here.
const decimalInput = Joi.alternatives().try(Joi.string().trim().max(30), Joi.number());
const optionalId = Joi.number().integer().positive().allow(null, '');

const issueLine = Joi.object({
  lot_id: Joi.number().integer().positive().required(),
  quantity: decimalInput.required(),
  remarks: Joi.string().max(1000).allow(null, ''),
});

const issue = {
  issue_date: dateString.required(),
  location_id: Joi.number().integer().positive().required(),
  job_reference: Joi.string().trim().max(100).allow(null, ''),
  receiver_user_id: optionalId,
  supervisor_user_id: optionalId,
  foreman_user_id: optionalId,
  remarks: Joi.string().max(2000).allow(null, ''),
  items: Joi.array().items(issueLine).min(1).max(100).required(),
};

export const productionValidator = {
  issueCreate: Joi.object({ company_id: Joi.number().integer().positive().required(), ...issue }),
  issueUpdate: Joi.object({ company_id: optionalId, ...issue }),

  processingCreate: Joi.object({
    material_issue_id: Joi.number().integer().positive().required(),
    start_date: dateString.required(),
    remarks: Joi.string().max(2000).allow(null, ''),
  }),

  processingUpdate: Joi.object({
    start_date: dateString.required(),
    produced_product_id: optionalId,
    produced_uom_id: optionalId,
    produced_quantity: decimalInput.allow(null, ''),
    remarks: Joi.string().max(2000).allow(null, ''),
    items: Joi.array().items(Joi.object({
      id: Joi.number().integer().positive().required(),
      consumed_quantity: decimalInput.allow(null, ''),
      wastage_quantity: decimalInput.allow(null, ''),
      balance_quantity: decimalInput.allow(null, ''),
      remarks: Joi.string().max(1000).allow(null, ''),
    })).max(100).default([]),
  }),

  processingComplete: Joi.object({ completion_date: dateString.required() }),

  // Product, UOM, quantity and company come from the record — never from the client.
  processingPostOutput: Joi.object({
    location_id: Joi.number().integer().positive().required(),
    movement_date: dateString.required(),
    company_id: optionalId,
    remarks: Joi.string().max(2000).allow(null, ''),
  }),
};
