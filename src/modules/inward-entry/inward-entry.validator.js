import Joi from 'joi';

export const inwardEntryValidator = {
  create: Joi.object({
    inward_date: Joi.date().iso().required(),
    purchase_order_id: Joi.number().integer().positive().required(),
    challan_no: Joi.string().max(255).allow(null, ''),
    challan_date: Joi.date().iso().allow(null, ''),
    remarks: Joi.string().allow(null, ''),
    items: Joi.array().items(
      Joi.object({
        purchase_order_item_id: Joi.number().integer().positive().required(),
        product_id: Joi.number().integer().positive().allow(null),
        description: Joi.string().allow(null, ''),
        unit: Joi.string().max(50).allow(null, ''),
        ordered_qty: Joi.number().integer().min(0).required(),
        received_qty: Joi.number().integer().min(1).required(),
        remarks: Joi.string().allow(null, '')
      })
    ).min(1).required()
  }),

  update: Joi.object({
    inward_date: Joi.date().iso().required(),
    challan_no: Joi.string().max(255).allow(null, ''),
    challan_date: Joi.date().iso().allow(null, ''),
    remarks: Joi.string().allow(null, ''),
    items: Joi.array().items(
      Joi.object({
        id: Joi.number().integer().positive().required(),
        received_qty: Joi.number().integer().min(1).required(),
        remarks: Joi.string().allow(null, '')
      })
    ).min(1).required()
  }),

  approve: Joi.object({
    status: Joi.string().valid('approved', 'rejected').required(),
    items: Joi.array().items(
      Joi.object({
        id: Joi.number().integer().positive().required(),
        passed_qty: Joi.number().integer().min(0).required(),
        rejected_qty: Joi.number().integer().min(0).required(),
        qc_remarks: Joi.string().allow(null, '')
      })
    ).min(1).required()
  })
};
