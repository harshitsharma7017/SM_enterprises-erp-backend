import Joi from 'joi';

// Dates stay "YYYY-MM-DD" strings (Joi.date() would turn them into Date objects).
const dateString = Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).message('must be a date (YYYY-MM-DD)');
// Quantity/amount are validated in the service (UOM precision, PO price); kept unrounded here.
const decimalInput = Joi.alternatives().try(Joi.string().trim().max(30), Joi.number());

const note = {
  debit_note_date: dateString.required(),
  quantity: decimalInput.required(),
  // Used only when the PO line has no price; otherwise the amount is derived.
  amount: decimalInput.allow(null, ''),
  reason: Joi.string().trim().max(255).allow(null, ''),
  remarks: Joi.string().max(2000).allow(null, ''),
};

export const debitNoteValidator = {
  // Always from a completed inspection (and optionally one of its posted returns).
  create: Joi.object({
    quality_inspection_id: Joi.number().integer().positive().required(),
    supplier_return_id: Joi.number().integer().positive().allow(null, ''),
    company_id: Joi.number().integer().positive().allow(null, ''),
    ...note,
  }),

  update: Joi.object(note),
};
