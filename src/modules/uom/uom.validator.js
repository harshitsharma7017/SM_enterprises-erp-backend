import { uomRepository } from './uom.repository.js';

const isBlank = (v) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '');

const validateCommon = async (req, isUpdate = false) => {
  const body = req.body || {};
  const errors = [];
  const ignoreId = isUpdate ? req.params.id : null;

  // code — required, 1–20 letters/digits (matches the 20-char unit columns), unique
  if (isBlank(body.code)) {
    errors.push('Code is required');
  } else if (typeof body.code !== 'string' || !/^[A-Za-z0-9]{1,20}$/.test(body.code.trim())) {
    errors.push('Code must be 1–20 letters or digits');
  } else if (await uomRepository.fieldExists('code', body.code.trim().toUpperCase(), ignoreId)) {
    errors.push('A UOM with this code already exists.');
  }

  // name — required, max 60, unique
  if (isBlank(body.name)) {
    errors.push('Name is required');
  } else if (typeof body.name !== 'string' || body.name.trim().length > 60) {
    errors.push('Name cannot exceed 60 characters');
  } else if (await uomRepository.fieldExists('name', body.name.trim(), ignoreId)) {
    errors.push('A UOM with this name already exists.');
  }

  // decimal_places — required, whole number 0–6
  const decimals = Number(body.decimal_places);
  if (isBlank(body.decimal_places) || !Number.isInteger(decimals) || decimals < 0 || decimals > 6) {
    errors.push('Decimal places must be a whole number from 0 to 6');
  }

  if (!body.status || !['active', 'inactive'].includes(body.status)) {
    errors.push('Status must be either active or inactive');
  }

  return errors;
};

const middleware = (isUpdate) => async (req, res, next) => {
  try {
    const errors = await validateCommon(req, isUpdate);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors });
    }
    next();
  } catch (error) {
    next(error);
  }
};

export const uomValidator = {
  validateStore: middleware(false),
  validateUpdate: middleware(true),
};
