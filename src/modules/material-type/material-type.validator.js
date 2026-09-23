import { materialTypeRepository } from './material-type.repository.js';
import { companyScope } from '../../services/company-scope.service.js';

const isBlank = (v) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '');

const validateCommon = async (req, isUpdate = false) => {
  const body = req.body || {};
  const errors = [];
  const ignoreId = isUpdate ? req.params.id : null;

  // company_id — required; a material type belongs to one company
  const companyError = await companyScope.checkField(body.company_id, { required: true, mustBeActive: !isUpdate });
  if (companyError) errors.push(companyError);
  const companyId = companyError ? null : Number(body.company_id);

  // code — required, 2–10 letters/digits, unique within the company
  if (isBlank(body.code)) {
    errors.push('Code is required');
  } else if (typeof body.code !== 'string' || !/^[A-Za-z0-9]{2,10}$/.test(body.code.trim())) {
    errors.push('Code must be 2–10 letters or digits');
  } else if (companyId && await materialTypeRepository.fieldExists(companyId, 'code', body.code.trim().toUpperCase(), ignoreId)) {
    errors.push('This company already has a material type with this code.');
  }

  // name — required, max 120, unique within the company
  if (isBlank(body.name)) {
    errors.push('Name is required');
  } else if (typeof body.name !== 'string' || body.name.trim().length > 120) {
    errors.push('Name cannot exceed 120 characters');
  } else if (companyId && await materialTypeRepository.fieldExists(companyId, 'name', body.name.trim(), ignoreId)) {
    errors.push('This company already has a material type with this name.');
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

export const materialTypeValidator = {
  validateStore: middleware(false),
  validateUpdate: middleware(true),
};
