import Joi from 'joi';

export const barcodeValidator = {
  // Company is the lot's; the value is generated server-side.
  create: Joi.object({
    lot_id: Joi.number().integer().positive().required(),
    company_id: Joi.number().integer().positive().allow(null, ''),
  }),

  retire: Joi.object({ reason: Joi.string().trim().max(500).required() }),

  // Any scanner (keyboard wedge, camera, future hardware) posts the raw value it read.
  scan: Joi.object({
    barcode: Joi.string().trim().max(100).required(),
    company_id: Joi.number().integer().positive().required(),
    context: Joi.string().valid('lookup', 'material_issue', 'dispatch').default('lookup'),
    location_id: Joi.number().integer().positive().allow(null, ''),
  }),
};
