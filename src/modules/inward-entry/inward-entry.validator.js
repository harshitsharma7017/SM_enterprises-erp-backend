import Joi from 'joi';

// Dates stay "YYYY-MM-DD" strings (Joi.date() would turn them into Date objects).
const dateString = Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).message('must be a date (YYYY-MM-DD)');
// Quantity / width are validated against the PO line's UOM in the service; keep them unrounded here.
const decimalInput = Joi.alternatives().try(Joi.string().trim().max(30), Joi.number());

/** One received split: a PO line, its quantity and its width. One PO line may appear several times. */
const grnLine = Joi.object({
  purchase_order_item_id: Joi.number().integer().positive().required(),
  received_quantity: decimalInput.required(),
  width_inch: decimalInput.required(),
  supplier_lot_no: Joi.string().trim().max(60).allow(null, ''),
  remarks: Joi.string().max(1000).allow(null, ''),
});

const header = {
  inward_date: dateString.required(),
  challan_no: Joi.string().max(255).allow(null, ''),
  challan_date: dateString.allow(null, ''),
  remarks: Joi.string().max(1000).allow(null, ''),
  items: Joi.array().items(grnLine).min(1).max(200).required(),
};

export const inwardEntryValidator = {
  // Goods receipt (GRN) — always against a purchase order.
  create: Joi.object({
    purchase_order_id: Joi.number().integer().positive().required(),
    company_id: Joi.number().integer().positive().allow(null, ''),
    ...header,
  }),

  update: Joi.object(header),

  // Legacy QC of old inward entries only.
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
