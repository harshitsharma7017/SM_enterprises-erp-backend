import { GARMENT_ORIGINS } from './garment-po.service.js';

const isBlank = (v) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '');
const isId = (v) => !isBlank(v) && Number.isInteger(Number(v)) && Number(v) > 0;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const isValidDate = (v) => typeof v === 'string' && DATE_RE.test(v) && !Number.isNaN(Date.parse(v));
const MAX_PRICE = 9999999999.99; // cost_price DECIMAL(12,2)

/**
 * Shape checks for a planning-origin (garment) purchase order. Company,
 * supplier, source, product, UOM and quantity rules run in the service,
 * inside the transaction that locks the requirement rows.
 *
 * On update the company/origin/plan are fixed and taken from the saved PO,
 * so only `origin` from the saved record is used to read the lines.
 */
export const validateGarmentPo = (body, { origin, isUpdate = false }) => {
  const errors = [];

  if (!isUpdate) {
    if (!GARMENT_ORIGINS.includes(origin)) errors.push('Origin must be material_requirement or material_plan');
    if (!isId(body.company_id)) errors.push('Company is required');
    if (origin === 'material_plan' && !isId(body.material_plan_id)) errors.push('Material plan is required');
  }
  if (!isId(body.supplier_id)) errors.push('Supplier is required');

  if (!isValidDate(body.po_date)) errors.push('PO date must be a valid date (YYYY-MM-DD)');
  if (!isBlank(body.dispatch_date) && !isValidDate(body.dispatch_date)) errors.push('Dispatch date must be a valid date (YYYY-MM-DD)');
  for (const [field, label, max] of [['delivery_details', 'Delivery details', 2000], ['packing_details', 'Packing details', 2000], ['remarks', 'Remarks', 1000]]) {
    if (!isBlank(body[field]) && (typeof body[field] !== 'string' || body[field].length > max)) errors.push(`${label} cannot exceed ${max} characters`);
  }

  const sourceField = origin === 'material_plan' ? 'material_plan_item_id' : 'material_requirement_id';
  const items = Array.isArray(body.items) ? body.items : null;
  const clean = [];
  if (!items || items.length === 0) {
    errors.push('Add at least one material line');
  } else if (items.length > 200) {
    errors.push('A purchase order cannot have more than 200 lines');
  } else {
    const seen = new Set();
    items.forEach((raw, index) => {
      const row = raw || {};
      const label = `Line ${index + 1}`;
      if (!isId(row[sourceField])) {
        errors.push(`${label}: ${origin === 'material_plan' ? 'plan line' : 'material requirement'} is required`);
        return;
      }
      const sourceId = Number(row[sourceField]);
      if (seen.has(sourceId)) {
        errors.push(`${label}: this ${origin === 'material_plan' ? 'plan line' : 'requirement'} is already on the purchase order`);
        return;
      }
      seen.add(sourceId);
      if (!isBlank(row.cost_price)) {
        const price = Number(row.cost_price);
        if (!Number.isFinite(price) || price < 0 || price > MAX_PRICE) errors.push(`${label}: unit price must be a number from 0 to ${MAX_PRICE}`);
      }
      if (!isBlank(row.remarks) && (typeof row.remarks !== 'string' || row.remarks.length > 1000)) {
        errors.push(`${label}: remarks cannot exceed 1000 characters`);
      }
      clean.push({
        [sourceField]: sourceId,
        ordered_quantity: row.ordered_quantity === undefined || row.ordered_quantity === null ? '' : String(row.ordered_quantity).trim(),
        cost_price: isBlank(row.cost_price) ? null : Number(row.cost_price),
        remarks: isBlank(row.remarks) ? null : row.remarks.trim(),
      });
    });
  }

  return { errors, items: clean };
};
