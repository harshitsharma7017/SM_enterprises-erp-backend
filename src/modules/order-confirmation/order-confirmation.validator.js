import Joi from 'joi';

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
  design_no: Joi.string().max(255).allow('', null),
  description: Joi.string().max(1000).allow('', null),
  product_id: Joi.number().integer().positive().allow(null),
  supplier_id: Joi.number().integer().positive().allow(null),
  unit: Joi.string().max(255).allow('', null),
  fob_value_id: Joi.number().integer().positive().allow(null),
  price: Joi.number().min(0).allow(null),
  cost_price: Joi.number().min(0).allow(null),
  qty: Joi.number().integer().min(0).default(0),
  remarks: Joi.string().max(1000).allow('', null),
  custom: Joi.object().unknown(true).optional(),
  colours: Joi.array().items(itemColourSchema).optional()
});

const storeSchema = Joi.object({
  // Required by the service on create unless inherited from the source inquiry.
  company_id: Joi.number().integer().positive().allow(null, ''),
  mode: Joi.string().valid('oc', 'direct').default('oc'),
  oc_date: Joi.date().iso().required(),
  buyer_ref: Joi.string().max(255).allow('', null),
  source_inquiry_id: Joi.number().integer().positive().allow(null),
  buyer_id: Joi.number().integer().positive().required(),
  category_id: Joi.number().integer().positive().required(),
  document_format_id: Joi.number().integer().positive().required(),
  agent_id: Joi.number().integer().positive().allow(null),
  agent_commission_type: Joi.string().valid('percent', 'flat').allow('', null),
  agent_commission_value: Joi.number().min(0).allow(null),
  currency_id: Joi.number().integer().positive().required(),
  incoterm: Joi.string().max(255).allow('', null),
  ship_method: Joi.string().max(255).allow('', null),
  shipment_date: Joi.string().max(255).allow('', null),
  pol: Joi.string().max(255).allow('', null),
  pod: Joi.string().max(255).allow('', null),
  payment_terms: Joi.string().max(255).allow('', null),
  delivery_details: Joi.string().max(2000).allow('', null),
  packing_details: Joi.string().max(2000).allow('', null),
  remarks: Joi.string().max(1000).allow('', null),
  status: Joi.string().valid('draft', 'sent', 'confirmed').default('draft'),
  items: Joi.array().items(itemSchema).optional()
});

const updateSchema = storeSchema;

const raisePoSchema = Joi.object({
  item_ids: Joi.array().items(Joi.number().integer().positive()).min(1).required()
});

export const orderConfirmationValidator = {
  validateStore: (req, res, next) => {
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
  validateUpdate: (req, res, next) => {
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
  },
  validateRaisePo: (req, res, next) => {
    const { error, value } = raisePoSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
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
