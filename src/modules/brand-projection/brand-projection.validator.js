import { brandProjectionRepository } from './brand-projection.repository.js';
import { companyScope } from '../../services/company-scope.service.js';
import { quantity } from '../../services/quantity.service.js';

const isBlank = (v) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '');
const isInteger = (v) => !isBlank(v) && Number.isInteger(Number(v));
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const isValidDate = (v) => typeof v === 'string' && DATE_RE.test(v) && !Number.isNaN(Date.parse(v));

const validateCommon = async (req, isUpdate = false) => {
  const body = req.body || {};
  const errors = [];

  // On update, masters that were already on this draft stay acceptable even if since deactivated.
  const existing = isUpdate ? await brandProjectionRepository.findById(req.params.id) : null;
  const existingProductIds = new Set((existing?.items || []).map((i) => i.product_id));

  // company — required; must be active when newly chosen
  const companyChanged = !existing || Number(body.company_id) !== existing.company_id;
  const companyError = await companyScope.checkField(body.company_id, { required: true, mustBeActive: companyChanged });
  if (companyError) errors.push(companyError);
  const companyId = companyError ? null : Number(body.company_id);

  // brand — required, same company, active unless unchanged
  if (isBlank(body.brand_id)) {
    errors.push('Brand is required');
  } else {
    const brand = isInteger(body.brand_id) ? await brandProjectionRepository.findBrand(Number(body.brand_id)) : null;
    if (!brand) {
      errors.push('Selected brand does not exist');
    } else {
      if (companyId && brand.company_id !== companyId) errors.push('Selected brand belongs to a different company');
      if (brand.status !== 'active' && !(existing && existing.brand_id === brand.id)) errors.push('Selected brand is inactive');
    }
  }

  // title
  if (isBlank(body.title)) {
    errors.push('Title is required');
  } else if (typeof body.title !== 'string' || body.title.trim().length > 200) {
    errors.push('Title cannot exceed 200 characters');
  }

  // period
  const startOk = isValidDate(body.period_start);
  const endOk = isValidDate(body.period_end);
  if (!startOk) errors.push('Period start must be a valid date (YYYY-MM-DD)');
  if (!endOk) errors.push('Period end must be a valid date (YYYY-MM-DD)');
  if (startOk && endOk && body.period_end < body.period_start) errors.push('Period end cannot be before period start');

  if (!isBlank(body.remarks) && (typeof body.remarks !== 'string' || body.remarks.length > 2000)) {
    errors.push('Remarks cannot exceed 2000 characters');
  }

  // items
  const items = Array.isArray(body.items) ? body.items : null;
  const validatedItems = [];
  if (!items || items.length === 0) {
    errors.push('Add at least one material line');
  } else if (items.length > 500) {
    errors.push('A projection cannot have more than 500 lines');
  } else {
    const productIds = [...new Set(items.map((i) => i && i.product_id).filter(isInteger).map(Number))];
    const products = await brandProjectionRepository.findProductsForValidation(productIds);
    const byId = Object.fromEntries(products.map((p) => [p.id, p]));
    const seen = new Set();

    items.forEach((raw, index) => {
      const row = raw || {};
      const label = `Line ${index + 1}`;
      if (isBlank(row.product_id)) {
        errors.push(`${label}: product is required`);
        return;
      }
      const product = isInteger(row.product_id) ? byId[Number(row.product_id)] : null;
      if (!product) {
        errors.push(`${label}: selected product does not exist`);
        return;
      }
      if (seen.has(product.id)) {
        errors.push(`${label}: ${product.name} is already on this projection`);
        return;
      }
      seen.add(product.id);

      if (companyId && product.company_id !== companyId) {
        errors.push(`${label}: ${product.name} belongs to a different company`);
      }
      if (product.material_type_id && product.material_type_company_id !== product.company_id) {
        errors.push(`${label}: ${product.name} has a material type from a different company`);
      }
      if (product.status !== 'active' && !existingProductIds.has(product.id)) {
        errors.push(`${label}: ${product.name} is inactive`);
      }
      if (!product.uom_id || !product.uom_exists) {
        errors.push(`${label}: ${product.name} has no UOM — set one on the product first`);
        return;
      }
      const qtyError = quantity.validate(row.quantity, product.uom_decimal_places, `${label}: quantity`);
      if (qtyError) errors.push(qtyError);

      if (!isBlank(row.remarks) && (typeof row.remarks !== 'string' || row.remarks.length > 500)) {
        errors.push(`${label}: remarks cannot exceed 500 characters`);
      }

      validatedItems.push({
        product_id: product.id,
        uom_id: product.uom_id, // always the product's UOM, never taken from the request
        quantity: String(row.quantity).trim(),
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

/** The create validation, for a plain object (used by Excel import): errors + the normalised lines. */
export const validateProjectionCreate = async (body) => {
  const req = { body, params: {} };
  const errors = await validateCommon(req, false);
  return { errors, items: req.validatedItems || [] };
};

export const brandProjectionValidator = {
  validateStore: middleware(false),
  validateUpdate: middleware(true),
};
