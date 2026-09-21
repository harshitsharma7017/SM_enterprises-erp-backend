import { fobValueRepository } from './fob-value.repository.js';

const isBlank = (v) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '');

const validateCommon = async (req, isUpdate = false) => {
  const body = req.body || {};
  const errors = [];
  const ignoreId = isUpdate ? req.params.id : null;

  // name — required, max 120, unique (does not exclude soft-deleted rows,
  // matching Store/UpdateFobValueRequest exactly).
  if (isBlank(body.name) || typeof body.name !== 'string') {
    errors.push('Name is required');
  } else if (body.name.length > 120) {
    errors.push('Name cannot exceed 120 characters');
  } else {
    const exists = await fobValueRepository.nameExists(body.name, ignoreId);
    if (exists) errors.push('An FOB Value with this name already exists.');
  }

  // status
  if (!body.status || !['active', 'inactive'].includes(body.status)) {
    errors.push('Status must be either active or inactive');
  }

  // remarks
  if (!isBlank(body.remarks)) {
    if (typeof body.remarks !== 'string' || body.remarks.length > 1000) {
      errors.push('Remarks cannot exceed 1000 characters');
    }
  }

  return errors;
};

export const fobValueValidator = {
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
  }
};
