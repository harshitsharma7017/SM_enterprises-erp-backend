import { materialPlanRepository } from './material-plan.repository.js';
import { companyScope } from '../../services/company-scope.service.js';

const isBlank = (v) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '');
const isInteger = (v) => !isBlank(v) && Number.isInteger(Number(v)) && Number(v) > 0;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const isValidDate = (v) => typeof v === 'string' && DATE_RE.test(v) && !Number.isNaN(Date.parse(v));

/**
 * Shape checks only. Requirement-level rules (same company, not closed,
 * UOM decimals, available quantity) run in the service, inside the
 * transaction that locks the requirement rows.
 */
const validateCommon = async (req, isUpdate = false) => {
  const body = req.body || {};
  const errors = [];

  const existing = isUpdate ? await materialPlanRepository.findById(req.params.id) : null;
  const companyChanged = !existing || Number(body.company_id) !== existing.company_id;
  const companyError = await companyScope.checkField(body.company_id, { required: true, mustBeActive: companyChanged });
  if (companyError) errors.push(companyError);

  if (isBlank(body.title)) {
    errors.push('Title is required');
  } else if (typeof body.title !== 'string' || body.title.trim().length > 200) {
    errors.push('Title cannot exceed 200 characters');
  }

  const startOk = isValidDate(body.period_start);
  const endOk = isValidDate(body.period_end);
  if (!startOk) errors.push('Period start must be a valid date (YYYY-MM-DD)');
  if (!endOk) errors.push('Period end must be a valid date (YYYY-MM-DD)');
  if (startOk && endOk && body.period_end < body.period_start) errors.push('Period end cannot be before period start');

  if (!isBlank(body.remarks) && (typeof body.remarks !== 'string' || body.remarks.length > 2000)) {
    errors.push('Remarks cannot exceed 2000 characters');
  }

  const items = Array.isArray(body.items) ? body.items : null;
  const validatedItems = [];
  if (!items || items.length === 0) {
    errors.push('Add at least one material requirement to the plan');
  } else if (items.length > 500) {
    errors.push('A plan cannot have more than 500 lines');
  } else {
    const seen = new Set();
    items.forEach((raw, index) => {
      const row = raw || {};
      const label = `Line ${index + 1}`;
      if (!isInteger(row.material_requirement_id)) {
        errors.push(`${label}: material requirement is required`);
        return;
      }
      const requirementId = Number(row.material_requirement_id);
      if (seen.has(requirementId)) {
        errors.push(`${label}: this requirement is already on the plan`);
        return;
      }
      seen.add(requirementId);
      if (!isBlank(row.remarks) && (typeof row.remarks !== 'string' || row.remarks.length > 500)) {
        errors.push(`${label}: remarks cannot exceed 500 characters`);
      }
      validatedItems.push({
        material_requirement_id: requirementId,
        planned_quantity: row.planned_quantity === undefined || row.planned_quantity === null ? '' : String(row.planned_quantity).trim(),
        remarks: isBlank(row.remarks) ? null : row.remarks.trim(),
      });
    });
  }

  req.validatedItems = validatedItems;
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

export const materialPlanValidator = {
  validateStore: middleware(false),
  validateUpdate: middleware(true),
};
