import { markupRepository } from './markup.repository.js';

const isBlank = (v) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '');
const isInteger = (v) => Number.isInteger(Number(v)) && !isBlank(v);
const isNumeric = (v) => !isBlank(v) && !isNaN(Number(v));

const validateCommon = async (req, isUpdate = false) => {
  const body = req.body || {};
  const errors = [];
  const ignoreId = isUpdate ? req.params.id : null;

  // supplier_id — required, integer, must be an active supplier
  if (isBlank(body.supplier_id)) {
    errors.push('Supplier is required');
  } else if (!isInteger(body.supplier_id)) {
    errors.push('Supplier must be a valid integer');
  } else {
    const exists = await markupRepository.supplierActiveExists(Number(body.supplier_id));
    if (!exists) errors.push('Select an active supplier.');
  }

  // buyer_id — required, integer, must be an active buyer,
  // and the supplier+buyer pair must be unique (not excluding soft-deleted rows).
  if (isBlank(body.buyer_id)) {
    errors.push('Buyer is required');
  } else if (!isInteger(body.buyer_id)) {
    errors.push('Buyer must be a valid integer');
  } else {
    const exists = await markupRepository.buyerActiveExists(Number(body.buyer_id));
    if (!exists) {
      errors.push('Select an active buyer.');
    } else {
      const pairTaken = await markupRepository.pairExists(Number(body.supplier_id), Number(body.buyer_id), ignoreId);
      if (pairTaken) errors.push('A markup rule already exists for this supplier and buyer.');
    }
  }

  // markup_percent — required, numeric, 0–999.99
  if (isBlank(body.markup_percent)) {
    errors.push('Markup percent is required');
  } else if (!isNumeric(body.markup_percent)) {
    errors.push('Markup percent must be a number');
  } else {
    const v = Number(body.markup_percent);
    if (v < 0) errors.push('Markup percent must be at least 0');
    if (v > 999.99) errors.push('Markup percent may not exceed 999.99');
  }

  // status
  if (!body.status || !['active', 'inactive'].includes(body.status)) {
    errors.push('Status must be either active or inactive');
  }

  // remarks — nullable, max 1000
  if (!isBlank(body.remarks)) {
    if (typeof body.remarks !== 'string' || body.remarks.length > 1000) {
      errors.push('Remarks cannot exceed 1000 characters');
    }
  }

  return errors;
};

export const markupValidator = {
  validateStore: async (req, res, next) => {
    try {
      const errors = await validateCommon(req, false);
      if (errors.length > 0) {
        return res.status(400).json({ success: false, message: 'Validation failed', errors });
      }
      next();
    } catch (error) {
      next(error);
    }
  },

  validateUpdate: async (req, res, next) => {
    try {
      const errors = await validateCommon(req, true);
      if (errors.length > 0) {
        return res.status(400).json({ success: false, message: 'Validation failed', errors });
      }
      next();
    } catch (error) {
      next(error);
    }
  },
};
