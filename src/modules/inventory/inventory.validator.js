import Joi from 'joi';

// Dates stay "YYYY-MM-DD" strings (Joi.date() would turn them into Date objects).
const dateString = Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).message('must be a date (YYYY-MM-DD)');

export const inventoryValidator = {
  // The quantity is the inspection's accepted quantity — never sent by the client.
  receiveQc: Joi.object({
    quality_inspection_id: Joi.number().integer().positive().required(),
    location_id: Joi.number().integer().positive().required(),
    company_id: Joi.number().integer().positive().allow(null, ''),
    movement_date: dateString.required(),
    remarks: Joi.string().max(2000).allow(null, ''),
  }),

  adjustment: Joi.object({
    lot_id: Joi.number().integer().positive().required(),
    location_id: Joi.number().integer().positive().required(),
    company_id: Joi.number().integer().positive().allow(null, ''),
    direction: Joi.string().valid('in', 'out').required(),
    // Validated against the lot's UOM precision in the service; kept unrounded here.
    quantity: Joi.alternatives().try(Joi.string().trim().max(30), Joi.number()).required(),
    reason: Joi.string().trim().min(3).max(255).required(),
    movement_date: dateString.required(),
    remarks: Joi.string().max(2000).allow(null, ''),
  }),

  locationCreate: Joi.object({
    company_id: Joi.number().integer().positive().required(),
    code: Joi.string().trim().pattern(/^[A-Za-z0-9_-]+$/).max(20).required()
      .messages({ 'string.pattern.base': 'Code may contain letters, digits, - and _ only' }),
    name: Joi.string().trim().max(100).required(),
    status: Joi.string().valid('active', 'inactive').default('active'),
    remarks: Joi.string().max(2000).allow(null, ''),
  }),

  locationUpdate: Joi.object({
    company_id: Joi.number().integer().positive().allow(null, ''),
    code: Joi.string().trim().pattern(/^[A-Za-z0-9_-]+$/).max(20).required()
      .messages({ 'string.pattern.base': 'Code may contain letters, digits, - and _ only' }),
    name: Joi.string().trim().max(100).required(),
    status: Joi.string().valid('active', 'inactive').required(),
    remarks: Joi.string().max(2000).allow(null, ''),
  }),
};
