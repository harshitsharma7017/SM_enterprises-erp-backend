import Joi from 'joi';

export const exportDocumentValidator = {
  update: Joi.object({
    buyer_id: Joi.number().integer().positive().required(),
    currency_id: Joi.number().integer().positive().required(),
    incoterm_id: Joi.number().integer().positive().allow(null),
    port_of_loading_id: Joi.number().integer().positive().allow(null),
    port_of_discharge_id: Joi.number().integer().positive().allow(null),
    shipment_method_id: Joi.number().integer().positive().allow(null),
    shipment_date: Joi.date().iso().allow(null, ''),
    status: Joi.string().valid('draft', 'in_progress', 'closed').allow(null, ''),
    remarks: Joi.string().allow(null, ''),
    items: Joi.array().items(
      Joi.object({
        id: Joi.number().integer().positive().allow(null),
        order_confirmation_item_id: Joi.number().integer().positive().allow(null),
        design_no: Joi.string().allow(null, ''),
        description: Joi.string().allow(null, ''),
        product_id: Joi.number().integer().positive().allow(null),
        unit: Joi.string().allow(null, ''),
        price: Joi.number().precision(2).min(0).required(),
        qty: Joi.number().integer().min(1).required(),
        remarks: Joi.string().allow(null, ''),
        custom_values: Joi.object().allow(null),
        colours: Joi.array().items(
          Joi.object({
            id: Joi.number().integer().positive().allow(null),
            colour: Joi.string().required(),
            sizes: Joi.array().items(
              Joi.object({
                id: Joi.number().integer().positive().allow(null),
                size: Joi.string().required(),
                qty: Joi.number().integer().min(0).required()
              })
            ).allow(null)
          })
        ).allow(null)
      })
    ).allow(null)
  })
};
