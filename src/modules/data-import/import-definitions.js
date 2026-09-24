/**
 * The only three Excel imports (master / planning inputs, create-only):
 * brands, products and DRAFT brand projections. Each row is turned into
 * exactly the body the normal create screen would send, validated by the
 * module's own validator and created by the module's own service — the
 * import adds only the spreadsheet mapping (human-readable keys → ids) and
 * in-file duplicate checks. Transaction / audit records are never imported.
 */
import { pool } from '../../config/database.js';
import { validateBrandCreate } from '../brand/brand.validator.js';
import { brandService } from '../brand/brand.service.js';
import { validateProductCreate } from '../product/product.validator.js';
import { productService } from '../product/product.service.js';
import { validateProjectionCreate } from '../brand-projection/brand-projection.validator.js';
import { brandProjectionService } from '../brand-projection/brand-projection.service.js';
import { serialToDate } from '../../utils/xlsx-reader.js';

const blank = (v) => v === undefined || v === null || String(v).trim() === '';
/** Spreadsheet cells as the create screen would send them: text stays text (numbers become their digits). */
const text = (v) => (blank(v) ? '' : String(v).trim());
const lower = (v) => text(v).toLowerCase();
/** A date column may arrive as text "YYYY-MM-DD" or, from an unformatted cell, as an Excel serial. */
const dateText = (v) => (typeof v === 'number' ? serialToDate(v) : text(v));

/** Attach a validator message to the column it is about (first keyword match), else to the row. */
const fieldFor = (message, rules) => rules.find(([re]) => re.test(message))?.[1] || null;

// ---------------- Brands ----------------
const brands = {
  key: 'brands',
  title: 'Brands',
  permission: 'brand.create',
  columns: [
    { header: 'Code', required: true, note: '2–10 letters / digits, unique in the company' },
    { header: 'Name', required: true, note: 'unique in the company' },
    { header: 'Status', required: true, note: 'active or inactive' },
  ],
  example: ['BRX', 'Brand X', 'active'],
  toBody: (row, companyId) => ({ company_id: companyId, code: text(row.Code), name: text(row.Name), status: lower(row.Status) }),
  // In-file duplicates of the brands' unique keys (company is fixed for the file).
  keys: [['Code', (b) => b.code.toUpperCase()], ['Name', (b) => b.name.toLowerCase()]],
  validate: async (body) => ({ errors: await validateBrandCreate(body) }),
  // Most specific first: "This company already has a brand with this code" is about the Code column.
  fieldRules: [[/code/i, 'Code'], [/name/i, 'Name'], [/status/i, 'Status'], [/company/i, 'Company']],
  create: (body, userId, connection) => brandService.create(body, userId, { connection }),
};

// ---------------- Products ----------------
const findCategory = async (value) => {
  const [rows] = await pool.query('SELECT id FROM categories WHERE deleted_at IS NULL AND (code = ? OR name = ?)', [value, value]);
  return rows;
};
const findUom = async (value) => {
  const [rows] = await pool.query('SELECT id FROM uoms WHERE deleted_at IS NULL AND code = ?', [value]);
  return rows;
};
const findMaterialType = async (companyId, value) => {
  const [rows] = await pool.query('SELECT id FROM material_types WHERE deleted_at IS NULL AND company_id = ? AND (code = ? OR name = ?)', [companyId, value, value]);
  return rows;
};

const products = {
  key: 'products',
  title: 'Products',
  permission: 'product.create',
  columns: [
    { header: 'Name', required: true, note: 'unique across both companies' },
    { header: 'Item Group Code', required: true, note: 'up to 5 letters / digits, unique across both companies' },
    { header: 'Category', required: true, note: 'category code or name' },
    { header: 'UOM', required: true, note: 'UOM code, e.g. MTR, PCS' },
    { header: 'Status', required: true, note: 'active or inactive' },
    { header: 'Material Type', note: "code or name of one of this company's material types" },
    { header: 'Name on Export Document' },
    { header: 'Unit (PO / OC)' },
    { header: 'Unit (Export)' },
    { header: 'HSN Code', note: '4–12 digits; format the column as Text to keep leading zeros' },
    { header: 'Fabric Length (m)' },
    { header: 'Fabric Width (inch)' },
    { header: 'Description' },
    { header: 'Remarks' },
  ],
  example: ['Pocketing 44in White', 'PKW44', 'Pocketing', 'MTR', 'active', '', '', '', '', '52083100', '', '44', '', ''],
  // Human-readable keys → ids; an unknown / ambiguous key is a row error, never a default.
  resolve: async (row, companyId) => {
    const errors = [];
    const ids = {};
    for (const [column, find, target] of [['Category', findCategory, 'category_id'], ['UOM', findUom, 'uom_id']]) {
      if (blank(row[column])) continue; // the validator reports the missing required field
      const found = await find(text(row[column]));
      if (found.length === 1) ids[target] = found[0].id;
      else errors.push({ field: column, message: found.length ? `"${text(row[column])}" matches more than one ${column.toLowerCase()}` : `${column} "${text(row[column])}" not found` });
    }
    if (!blank(row['Material Type'])) {
      const found = await findMaterialType(companyId, text(row['Material Type']));
      if (found.length === 1) ids.material_type_id = found[0].id;
      else errors.push({ field: 'Material Type', message: found.length ? 'matches more than one material type' : `Material type "${text(row['Material Type'])}" not found in this company` });
    }
    return { ids, errors };
  },
  toBody: (row, companyId, ids = {}) => ({
    company_id: companyId,
    name: text(row.Name),
    item_group_code: text(row['Item Group Code']),
    category_id: ids.category_id ?? (blank(row.Category) ? '' : -1),
    uom_id: ids.uom_id ?? (blank(row.UOM) ? '' : -1),
    material_type_id: ids.material_type_id ?? '',
    status: lower(row.Status),
    name_on_export_document: text(row['Name on Export Document']),
    unit_po: text(row['Unit (PO / OC)']),
    unit_export: text(row['Unit (Export)']),
    hsn_code: text(row['HSN Code']),
    fabric_length_mtr: text(row['Fabric Length (m)']),
    fabric_width_inch: text(row['Fabric Width (inch)']),
    description: text(row.Description),
    remarks: text(row.Remarks),
  }),
  keys: [['Name', (b) => b.name.toLowerCase()], ['Item Group Code', (b) => b.item_group_code.toUpperCase()]],
  validate: async (body) => {
    // Unresolved references (-1) were already reported by resolve(); don't repeat them.
    const errors = await validateProductCreate(body);
    return { errors: errors.filter((e) => !((body.category_id === -1 && /category/i.test(e)) || (body.uom_id === -1 && /uom/i.test(e)))) };
  },
  fieldRules: [
    [/item group/i, 'Item Group Code'], [/export document name/i, 'Name on Export Document'],
    [/product name|with this name/i, 'Name'], [/category/i, 'Category'], [/uom/i, 'UOM'], [/material type/i, 'Material Type'],
    [/hsn/i, 'HSN Code'], [/length/i, 'Fabric Length (m)'], [/width/i, 'Fabric Width (inch)'], [/unit \(po/i, 'Unit (PO / OC)'],
    [/unit \(export/i, 'Unit (Export)'], [/description/i, 'Description'], [/remarks/i, 'Remarks'], [/status/i, 'Status'],
    [/company/i, 'Company'],
  ],
  create: (body, userId, connection) => productService.create(body, userId, { connection }),
};

// ---------------- Draft brand projections ----------------
const projections = {
  key: 'brand-projections',
  title: 'Draft Brand Projections',
  permission: 'brand-projection.create',
  grouped: true, // several rows (lines) make one projection, grouped by Projection Ref
  columns: [
    { header: 'Projection Ref', required: true, note: 'any label; rows with the same ref form one projection' },
    { header: 'Brand Code', required: true, note: "one of this company's brands" },
    { header: 'Title', required: true, note: 'same on every row of the projection' },
    { header: 'Period Start', required: true, note: 'YYYY-MM-DD; same on every row' },
    { header: 'Period End', required: true, note: 'YYYY-MM-DD; same on every row' },
    { header: 'Item Group Code', required: true, note: "the product's item group code" },
    { header: 'Quantity', required: true, note: "in the product's UOM (its decimal places)" },
    { header: 'Line Remarks' },
    { header: 'Remarks', note: 'projection remarks; same on every row' },
  ],
  example: ['P1', 'BRX', 'Summer 2027 plan', '2027-01-01', '2027-06-30', 'PKW44', '1500.5', '', ''],
  headerFields: ['Brand Code', 'Title', 'Period Start', 'Period End', 'Remarks'],
  groupKey: (row) => text(row['Projection Ref']),
  resolveGroup: async (rows, companyId) => {
    const first = rows[0].row;
    const errors = [];
    let brandId = null;
    if (!blank(first['Brand Code'])) {
      const [found] = await pool.query('SELECT id FROM brands WHERE deleted_at IS NULL AND company_id = ? AND code = ?', [companyId, text(first['Brand Code']).toUpperCase()]);
      if (found.length) brandId = found[0].id;
      else errors.push({ rowNumber: rows[0].rowNumber, field: 'Brand Code', message: `Brand "${text(first['Brand Code'])}" not found in this company` });
    }
    const productIds = [];
    for (const { row, rowNumber } of rows) {
      if (blank(row['Item Group Code'])) {
        productIds.push(null);
        continue;
      }
      const [found] = await pool.query('SELECT id FROM products WHERE deleted_at IS NULL AND item_group_code = ?', [text(row['Item Group Code']).toUpperCase()]);
      if (found.length) productIds.push(found[0].id);
      else {
        productIds.push(-1);
        errors.push({ rowNumber, field: 'Item Group Code', message: `Product "${text(row['Item Group Code'])}" not found` });
      }
    }
    return { brandId, productIds, errors };
  },
  toGroupBody: (rows, companyId, { brandId, productIds }) => {
    const first = rows[0].row;
    return {
      company_id: companyId,
      brand_id: brandId ?? '',
      title: text(first.Title),
      period_start: dateText(first['Period Start']),
      period_end: dateText(first['Period End']),
      remarks: text(first.Remarks),
      items: rows.map(({ row }, i) => ({ product_id: productIds[i] ?? '', quantity: text(row.Quantity), remarks: text(row['Line Remarks']) })),
    };
  },
  validateGroup: async (body) => {
    const { errors, items } = await validateProjectionCreate(body);
    // An unresolved brand / product was reported by resolveGroup().
    return { errors: errors.filter((e) => !(body.brand_id === '' && /^Brand is required/.test(e)) && !/selected product does not exist/.test(e)), items };
  },
  // Line messages ("Line 2: …") are about that row's product unless they name the quantity / remarks.
  fieldRules: [
    [/quantity/i, 'Quantity'], [/^Line \d+: .*remarks/i, 'Line Remarks'], [/^Line \d+:|product|material line/i, 'Item Group Code'],
    [/brand/i, 'Brand Code'], [/title/i, 'Title'], [/period end/i, 'Period End'], [/period start/i, 'Period Start'],
    [/remarks/i, 'Remarks'], [/company/i, 'Projection Ref'],
  ],
  createGroup: (body, items, userId, connection) => brandProjectionService.create(body, items, userId, { connection }),
};

export const IMPORTS = [brands, products, projections];
export const findImport = (key) => IMPORTS.find((i) => i.key === key) || null;
export { fieldFor, blank, text };
