import { companyRepository } from './company.repository.js';

const isBlank = (v) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '');
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GSTIN_RE = /^[0-9]{2}[A-Z0-9]{13}$/;

const validateCommon = async (req, isUpdate = false) => {
  const body = req.body || {};
  const errors = [];
  const ignoreId = isUpdate ? req.params.id : null;

  // code — required, 2–10 letters/digits, unique
  if (isBlank(body.code)) {
    errors.push('Code is required');
  } else if (typeof body.code !== 'string' || !/^[A-Za-z0-9]{2,10}$/.test(body.code.trim())) {
    errors.push('Code must be 2–10 letters or digits');
  } else if (await companyRepository.fieldExists('code', body.code.trim().toUpperCase(), ignoreId)) {
    errors.push('A company with this code already exists.');
  }

  // name — required, max 200, unique
  if (isBlank(body.name)) {
    errors.push('Name is required');
  } else if (typeof body.name !== 'string' || body.name.trim().length > 200) {
    errors.push('Name cannot exceed 200 characters');
  } else if (await companyRepository.fieldExists('name', body.name.trim(), ignoreId)) {
    errors.push('A company with this name already exists.');
  }

  if (!isBlank(body.short_name) && (typeof body.short_name !== 'string' || body.short_name.trim().length > 60)) {
    errors.push('Short name cannot exceed 60 characters');
  }

  if (!isBlank(body.address) && (typeof body.address !== 'string' || body.address.length > 1000)) {
    errors.push('Address cannot exceed 1000 characters');
  }

  if (!isBlank(body.phone) && (typeof body.phone !== 'string' || body.phone.length > 30)) {
    errors.push('Phone cannot exceed 30 characters');
  }

  if (!isBlank(body.email) && (typeof body.email !== 'string' || !EMAIL_RE.test(body.email) || body.email.length > 255)) {
    errors.push('Email must be a valid email address');
  }

  if (!isBlank(body.gstin) && (typeof body.gstin !== 'string' || !GSTIN_RE.test(body.gstin.trim().toUpperCase()))) {
    errors.push('GSTIN must be 15 characters (2 digits followed by 13 letters/digits)');
  }

  if (body.is_active !== undefined && ![true, false, 0, 1, '0', '1'].includes(body.is_active)) {
    errors.push('Active must be true or false');
  }

  return errors;
};

const middleware = (isUpdate) => async (req, res, next) => {
  try {
    const errors = await validateCommon(req, isUpdate);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors });
    }
    if (req.body.is_active !== undefined) {
      req.body.is_active = [true, 1, '1'].includes(req.body.is_active);
    }
    next();
  } catch (error) {
    next(error);
  }
};

export const companyValidator = {
  validateStore: middleware(false),
  validateUpdate: middleware(true),
};
