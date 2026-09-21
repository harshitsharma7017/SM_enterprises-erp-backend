import { agentRepository } from './agent.repository.js';
import { isDomesticAgentType } from './agent.service.js';

const isBlank = (v) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '');
const isInteger = (v) => Number.isInteger(Number(v)) && String(v).trim() !== '';
const isNumeric = (v) => v !== '' && v !== null && !Number.isNaN(Number(v));
const AGENT_TYPES = ['supplier', 'buyer', 'jobber'];
const COMMISSION_TYPES = ['percent', 'fixed'];
const DISPLAY_CODE_REGEX = /^[A-Z0-9]+$/;

/**
 * Only the fields the locked schema actually supports are validated here.
 * Laravel's AgentRequest also validates phone/city/address, gst_number/
 * pan_number, bank_name/account_number/ifsc_code/swift_code,
 * commission_paid_by, payment_term/payment_term_custom — none of those
 * columns exist on `agents` in this schema, so none of those rules are
 * implemented. Do not add them; do not simulate them.
 */
const validateCommon = async (req, isUpdate = false) => {
  const body = req.body || {};
  const errors = [];
  const ignoreId = isUpdate ? req.params.id : null;

  // display_code — trim + uppercase before validation, matching
  // AgentRequest::prepareForValidation().
  let displayCode = typeof body.display_code === 'string' ? body.display_code.trim().toUpperCase() : body.display_code;

  // agent_type
  if (!body.agent_type || !AGENT_TYPES.includes(body.agent_type)) {
    errors.push('Agent type must be one of supplier, buyer, jobber');
  }

  // name — no uniqueness rule beyond what checkCode conveniences.
  if (isBlank(body.name) || typeof body.name !== 'string') {
    errors.push('Name is required');
  } else if (body.name.length > 200) {
    errors.push('Name cannot exceed 200 characters');
  }

  // display_code — required, max 5, [A-Z0-9], unique INCLUDING soft-deleted.
  if (isBlank(displayCode) || typeof displayCode !== 'string') {
    errors.push('Display code is required');
  } else if (displayCode.length > 5) {
    errors.push('Display code may not be longer than 5 characters.');
  } else if (!DISPLAY_CODE_REGEX.test(displayCode)) {
    errors.push('The display code must contain only letters and numbers.');
  } else {
    const exists = await agentRepository.displayCodeExists(displayCode, ignoreId);
    if (exists) errors.push('This display code is already taken.');
  }

  // categories — required, min 1 (unlike Buyer/Supplier, where it's optional).
  const categories = body.categories;
  if (isBlank(categories) || !Array.isArray(categories) || categories.length === 0) {
    errors.push('Choose at least one category — the Buyer and Supplier forms filter agents by it.');
  } else if (!categories.every((cid) => isInteger(cid))) {
    errors.push('Categories must contain valid integers');
  } else {
    for (const cid of categories) {
      const exists = await agentRepository.categoryExists(Number(cid));
      if (!exists) { errors.push('One or more selected categories do not exist'); break; }
    }
  }

  // calculation_basis_id — required (unlike Buyer/Supplier, where it's optional).
  if (isBlank(body.calculation_basis_id)) {
    errors.push('Commission basis is required');
  } else if (!isInteger(body.calculation_basis_id)) {
    errors.push('Commission basis must be an integer');
  } else {
    const exists = await agentRepository.calculationBasisExists(Number(body.calculation_basis_id));
    if (!exists) errors.push('Selected commission basis does not exist');
  }

  // commissions — required, min 1. Supplier/jobber-side entries are always
  // INR: force currency_id to null on every row BEFORE validating, matching
  // AgentRequest::prepareForValidation()'s domestic-currency nulling.
  const domestic = isDomesticAgentType(body.agent_type);
  let commissions = body.commissions;

  if (isBlank(commissions) || !Array.isArray(commissions) || commissions.length === 0) {
    errors.push('Add at least one commission entry.');
  } else {
    commissions = commissions.map((raw) => {
      const row = raw || {};
      return domestic ? { ...row, currency_id: null } : row;
    });

    for (let idx = 0; idx < commissions.length; idx++) {
      const row = commissions[idx] || {};

      if (!row.commission_type || !COMMISSION_TYPES.includes(row.commission_type)) {
        errors.push(`Commission row ${idx + 1}: commission type must be percent or fixed`);
      }

      if (isBlank(row.amount)) {
        errors.push(`Commission row ${idx + 1}: commission amount is required`);
      } else {
        const v = Number(row.amount);
        if (!isNumeric(row.amount) || v < 0 || v > 99999999.9999) {
          errors.push(`Commission row ${idx + 1}: commission amount must be between 0 and 99999999.9999`);
        }
      }

      if (!isBlank(row.currency_id)) {
        if (!isInteger(row.currency_id)) {
          errors.push(`Commission row ${idx + 1}: currency must be an integer`);
        } else {
          const exists = await agentRepository.currencyExists(Number(row.currency_id));
          if (!exists) errors.push(`Commission row ${idx + 1}: selected currency does not exist`);
        }
      }
    }
  }

  // status
  if (!body.status || !['active', 'inactive'].includes(body.status)) {
    errors.push('Status must be either active or inactive');
  }

  // remarks — persisted.
  if (!isBlank(body.remarks)) {
    if (typeof body.remarks !== 'string' || body.remarks.length > 1000) {
      errors.push('Remarks cannot exceed 1000 characters');
    }
  }

  // comments — accepted for API compatibility, shape-checked, NEVER
  // persisted (no agents.comments column on the locked schema).
  if (!isBlank(body.comments)) {
    if (typeof body.comments !== 'string' || body.comments.length > 1000) {
      errors.push('Comments cannot exceed 1000 characters');
    }
  }

  // Write the normalized values back for the controller/service to use.
  req.body.display_code = displayCode;
  req.body.commissions = Array.isArray(commissions) ? commissions : body.commissions;

  return errors;
};

export const agentValidator = {
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
