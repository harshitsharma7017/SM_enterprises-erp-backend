import { pool } from '../../config/database.js';
import { brandRepository } from './brand.repository.js';
import { brandSpecRepository, SPEC_FIELDS } from './brand-spec.repository.js';

const LIMITS = { design: 150, quality: 150, width: 60, colour: 100, printing: 255, specification: 2000, remarks: 1000 };
const LABELS = { design: 'Design', quality: 'Quality', width: 'Width', colour: 'Colour', printing: 'Printing', specification: 'Specification', remarks: 'Remarks' };

const notFound = (what) => ({ status: 404, message: `${what} not found` });
const invalid = (errors) => ({ status: 422, message: 'Validation failed', errors });
const clean = (v) => (v === undefined || v === null || String(v).trim() === '' ? null : String(v).trim());

/** The brand must exist; the product must be one of the brand's company. At least one spec field is required. */
const validate = async (brand, body, ignoreId = null) => {
  const errors = [];
  const productId = Number(body.product_id);
  if (!Number.isInteger(productId) || productId <= 0) {
    errors.push('Product is required');
  } else {
    const [[product]] = await pool.query('SELECT id, company_id FROM products WHERE id = ? AND deleted_at IS NULL', [productId]);
    if (!product) errors.push('Selected product does not exist');
    else if (product.company_id !== brand.company_id) errors.push('The product belongs to a different company than the brand.');
    else if (await brandSpecRepository.existsFor(brand.id, productId, ignoreId)) errors.push('This brand already has a specification for this product; edit that one.');
  }
  const data = { product_id: productId };
  SPEC_FIELDS.forEach((f) => {
    data[f] = clean(body[f]);
    if (data[f] && data[f].length > LIMITS[f]) errors.push(`${LABELS[f]} cannot exceed ${LIMITS[f]} characters`);
  });
  if (!SPEC_FIELDS.filter((f) => f !== 'remarks').some((f) => data[f])) {
    errors.push('Enter at least one of design, quality, width, colour, printing or specification.');
  }
  data.status = body.status === undefined || body.status === null || body.status === '' ? 'active' : body.status;
  if (!['active', 'inactive'].includes(data.status)) errors.push('Status must be either active or inactive');
  if (errors.length) throw invalid(errors);
  return data;
};

const loadBrand = async (brandId) => {
  const brand = await brandRepository.findById(brandId);
  if (!brand) throw notFound('Brand');
  return brand;
};

export const brandSpecService = {
  list: async (brandId) => {
    await loadBrand(brandId);
    return brandSpecRepository.findByBrand(brandId);
  },

  create: async (brandId, body, userId) => {
    const brand = await loadBrand(brandId);
    const data = await validate(brand, body);
    const id = await brandSpecRepository.create({ ...data, brand_id: brand.id, created_by: userId, updated_by: userId });
    return brandSpecRepository.findById(brand.id, id);
  },

  update: async (brandId, specId, body, userId) => {
    const brand = await loadBrand(brandId);
    const existing = await brandSpecRepository.findById(brand.id, specId);
    if (!existing) throw notFound('Specification');
    const data = await validate(brand, body, existing.id);
    await brandSpecRepository.update(existing.id, { ...data, updated_by: userId });
    return brandSpecRepository.findById(brand.id, existing.id);
  },

  delete: async (brandId, specId) => {
    const brand = await loadBrand(brandId);
    const existing = await brandSpecRepository.findById(brand.id, specId);
    if (!existing) throw notFound('Specification');
    await brandSpecRepository.delete(existing.id);
  },
};
