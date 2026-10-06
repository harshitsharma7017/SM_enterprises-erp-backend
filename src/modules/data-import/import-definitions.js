/**
 * The Excel imports (create-only): every master that fits one row per record
 * (categories, UOMs, material types, brands, products, agents, buyers,
 * suppliers / jobbers, FOB values, markups, stock locations), DRAFT brand
 * projections and opening stock. Order formats are not importable: each is a
 * column layout with units and images, not a spreadsheet row. Each row is turned into
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
import { validateSupplierCreate } from '../supplier/supplier.validator.js';
import { supplierService } from '../supplier/supplier.service.js';
import { openingStockService } from '../inventory/opening-stock.service.js';
import { validateCategoryCreate } from '../category/category.validator.js';
import { categoryService } from '../category/category.service.js';
import { validateUomCreate } from '../uom/uom.validator.js';
import { uomService } from '../uom/uom.service.js';
import { validateMaterialTypeCreate } from '../material-type/material-type.validator.js';
import { materialTypeService } from '../material-type/material-type.service.js';
import { validateAgentCreate } from '../agent/agent.validator.js';
import { agentService } from '../agent/agent.service.js';
import { validateBuyerCreate } from '../buyer/buyer.validator.js';
import { buyerService } from '../buyer/buyer.service.js';
import { validateFobValueCreate } from '../fob-value/fob-value.validator.js';
import { fobValueService } from '../fob-value/fob-value.service.js';
import { validateMarkupCreate } from '../markup/markup.validator.js';
import { markupService } from '../markup/markup.service.js';
import { inventoryValidator } from '../inventory/inventory.validator.js';
import { inventoryRepository } from '../inventory/inventory.repository.js';
import { inventoryService } from '../inventory/inventory.service.js';
import { serialToDate } from '../../utils/xlsx-reader.js';

const blank = (v) => v === undefined || v === null || String(v).trim() === '';
/** Spreadsheet cells as the create screen would send them: text stays text (numbers become their digits). */
const text = (v) => (blank(v) ? '' : String(v).trim());
const lower = (v) => text(v).toLowerCase();
/** A date column may arrive as text "YYYY-MM-DD" or, from an unformatted cell, as an Excel serial. */
const dateText = (v) => (typeof v === 'number' ? serialToDate(v) : text(v));

/** Attach a validator message to the column it is about (first keyword match), else to the row. */
const fieldFor = (message, rules) => rules.find(([re]) => re.test(message))?.[1] || null;

// ---------------- Drop-down options ----------------
// A column's `options` feed the template's drop-down list: either fixed choices,
// or `(companyId) => Promise<string[]>` reading what is available right now with
// the same filters as the create screen's own list (active, the company, the
// buyer side…). The finders below apply the same filters, so a value the
// drop-down does not offer is also rejected by the import.
// `multi`: a ";"-separated cell — the list is offered but any text is accepted.
const STATUS = ['active', 'inactive'];
const YES_NO = ['yes', 'no'];
const SEP = ' — ';
/** "SPM01 — Sri Pocketing Mills" (a drop-down label) → "SPM01"; a bare code or name passes through. */
const codeOf = (v) => text(v).split(SEP)[0].trim();
const optionsFrom = (sql, params) => async (companyId) => (await pool.query(sql, params ? params(companyId) : []))[0].map((r) => r.v);
const OPTIONS = {
  categories: optionsFrom("SELECT name AS v FROM categories WHERE deleted_at IS NULL AND status = 'active' ORDER BY name"),
  uoms: optionsFrom("SELECT code AS v FROM uoms WHERE deleted_at IS NULL AND status = 'active' ORDER BY code"),
  materialTypes: optionsFrom("SELECT name AS v FROM material_types WHERE deleted_at IS NULL AND status = 'active' AND company_id = ? ORDER BY name", (c) => [c]),
  formats: optionsFrom("SELECT name AS v FROM document_formats WHERE status = 'active' ORDER BY name"),
  supplierTypes: optionsFrom("SELECT code AS v FROM supplier_types WHERE status = 'active' ORDER BY id"),
  calculationBases: optionsFrom("SELECT name AS v FROM calculation_bases WHERE status = 'active' ORDER BY name"),
  currencies: optionsFrom("SELECT iso_code AS v FROM currencies WHERE status = 'active' ORDER BY iso_code"),
  countries: optionsFrom("SELECT name AS v FROM countries WHERE status = 'active' ORDER BY name"),
  ports: optionsFrom(`SELECT CONCAT(code, '${SEP}', name) AS v FROM ports WHERE status = 'active' ORDER BY name`),
  buyerAgents: optionsFrom(`SELECT CONCAT(display_code, '${SEP}', name) AS v FROM agents WHERE deleted_at IS NULL AND status = 'active' AND agent_type = 'buyer' ORDER BY name`),
  buyerPaymentTerms: optionsFrom("SELECT name AS v FROM payment_terms WHERE status = 'active' AND applies_to IN ('buyer', 'both') ORDER BY name"),
  incoterms: optionsFrom("SELECT code AS v FROM incoterms WHERE status = 'active' ORDER BY code"),
  shipmentMethods: optionsFrom("SELECT name AS v FROM shipment_methods WHERE status = 'active' ORDER BY name"),
  suppliers: optionsFrom(`SELECT CONCAT(display_code, '${SEP}', company_name) AS v FROM suppliers WHERE deleted_at IS NULL AND status = 'active' ORDER BY company_name`),
  companySuppliers: optionsFrom(`SELECT CONCAT(display_code, '${SEP}', company_name) AS v FROM suppliers WHERE deleted_at IS NULL AND status = 'active' AND (company_id IS NULL OR company_id = ?) ORDER BY company_name`, (c) => [c]),
  buyers: optionsFrom(`SELECT CONCAT(display_code, '${SEP}', company_name) AS v FROM buyers WHERE deleted_at IS NULL AND status = 'active' ORDER BY company_name`),
  locations: optionsFrom(`SELECT CONCAT(code, '${SEP}', name) AS v FROM stock_locations WHERE status = 'active' AND company_id = ? ORDER BY code`, (c) => [c]),
  products: optionsFrom(`SELECT CONCAT(item_group_code, '${SEP}', name) AS v FROM products WHERE deleted_at IS NULL AND status = 'active' AND company_id = ? ORDER BY item_group_code`, (c) => [c]),
  brands: optionsFrom(`SELECT CONCAT(code, '${SEP}', name) AS v FROM brands WHERE deleted_at IS NULL AND status = 'active' AND company_id = ? ORDER BY code`, (c) => [c]),
};

/**
 * Resolves one human-readable key to an id with `find(value)` → rows. A blank
 * cell is left to the validator (it knows whether the field is required); an
 * unknown or ambiguous key is a row error, never a default. A drop-down label
 * ("CODE — Name") is reduced to its code first.
 */
const resolveKey = async (row, column, find, label, ids, target, errors) => {
  if (blank(row[column])) return;
  const value = codeOf(row[column]);
  const found = await find(value);
  if (found.length === 1) ids[target] = found[0].id;
  else errors.push({ field: column, message: found.length ? `"${value}" matches more than one ${label}` : `${label[0].toUpperCase()}${label.slice(1)} "${value}" not found` });
};
/** A ";"-separated list of keys → ids; each unknown key is its own error. */
const resolveList = async (row, column, find, label, errors) => {
  const out = [];
  for (const value of text(row[column]).split(/[;,]/).map((x) => x.trim()).filter(Boolean)) {
    const found = await find(value);
    if (found.length === 1) out.push(found[0].id);
    else errors.push({ field: column, message: found.length ? `"${value}" matches more than one ${label}` : `${label[0].toUpperCase()}${label.slice(1)} "${value}" not found` });
  }
  return [...new Set(out)];
};
const query = (sql) => async (value) => (await pool.query(sql, [value, value]))[0];

// ---------------- Categories ----------------
const findFormat = query("SELECT id FROM document_formats WHERE status = 'active' AND (name = ? OR name = ?)");

const categories = {
  key: 'categories',
  title: 'Categories',
  permission: 'category.create',
  companyScoped: false, // shared by both companies
  columns: [
    { header: 'Name', required: true, note: 'unique; the category code is assigned automatically' },
    { header: 'Status', required: true, options: STATUS },
    { header: 'Order Formats', note: 'one or more, separated by ;', options: OPTIONS.formats, multi: true },
    { header: 'Remarks' },
  ],
  example: ["Women's Tops", 'active', 'Standard Format', ''],
  resolve: async (row) => {
    const errors = [];
    const formatIds = await resolveList(row, 'Order Formats', findFormat, 'order format', errors);
    return { ids: { format_ids: formatIds }, errors };
  },
  toBody: (row, companyId, ids = {}) => ({ name: text(row.Name), status: lower(row.Status), remarks: text(row.Remarks), format_ids: ids.format_ids || [] }),
  keys: [['Name', (b) => b.name.toLowerCase()]],
  validate: async (body) => ({ errors: await validateCategoryCreate(body) }),
  fieldRules: [[/format/i, 'Order Formats'], [/name/i, 'Name'], [/status/i, 'Status'], [/remarks/i, 'Remarks']],
  create: (body, userId, connection) => categoryService.create(body, userId, { connection }),
};

// ---------------- UOMs ----------------
const uoms = {
  key: 'uoms',
  title: 'UOMs',
  permission: 'uom.create',
  companyScoped: false,
  columns: [
    { header: 'Code', required: true, note: '1–20 letters / digits, unique, e.g. MTR' },
    { header: 'Name', required: true, note: 'unique, e.g. Metre' },
    { header: 'Decimal Places', required: true, options: [0, 1, 2, 3, 4, 5, 6] },
    { header: 'Status', required: true, options: STATUS },
  ],
  example: ['MTR', 'Metre', '2', 'active'],
  toBody: (row) => ({ code: text(row.Code), name: text(row.Name), decimal_places: text(row['Decimal Places']), status: lower(row.Status) }),
  keys: [['Code', (b) => b.code.toUpperCase()], ['Name', (b) => b.name.toLowerCase()]],
  validate: async (body) => ({ errors: await validateUomCreate(body) }),
  fieldRules: [[/code/i, 'Code'], [/name/i, 'Name'], [/decimal/i, 'Decimal Places'], [/status/i, 'Status']],
  create: (body, userId, connection) => uomService.create(body, userId, { connection }),
};

// ---------------- Material types ----------------
const materialTypes = {
  key: 'material-types',
  title: 'Material Types',
  permission: 'material-type.create',
  columns: [
    { header: 'Code', required: true, note: '2–10 letters / digits, unique in the company' },
    { header: 'Name', required: true, note: 'unique in the company' },
    { header: 'Status', required: true, options: STATUS },
  ],
  example: ['FAB', 'Fabric', 'active'],
  toBody: (row, companyId) => ({ company_id: companyId, code: text(row.Code), name: text(row.Name), status: lower(row.Status) }),
  keys: [['Code', (b) => b.code.toUpperCase()], ['Name', (b) => b.name.toLowerCase()]],
  validate: async (body) => ({ errors: await validateMaterialTypeCreate(body) }),
  fieldRules: [[/code/i, 'Code'], [/name/i, 'Name'], [/status/i, 'Status'], [/company/i, 'Company']],
  create: (body, userId, connection) => materialTypeService.create(body, userId, { connection }),
};

// ---------------- Brands ----------------
const brands = {
  key: 'brands',
  title: 'Brands',
  permission: 'brand.create',
  columns: [
    { header: 'Code', required: true, note: '2–10 letters / digits, unique in the company' },
    { header: 'Name', required: true, note: 'unique in the company' },
    { header: 'Status', required: true, options: STATUS },
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
  const [rows] = await pool.query("SELECT id FROM categories WHERE deleted_at IS NULL AND status = 'active' AND (code = ? OR name = ?)", [value, value]);
  return rows;
};
const findUom = async (value) => {
  const [rows] = await pool.query("SELECT id FROM uoms WHERE deleted_at IS NULL AND status = 'active' AND code = ?", [value]);
  return rows;
};
const findMaterialType = async (companyId, value) => {
  const [rows] = await pool.query("SELECT id FROM material_types WHERE deleted_at IS NULL AND status = 'active' AND company_id = ? AND (code = ? OR name = ?)", [companyId, value, value]);
  return rows;
};

const products = {
  key: 'products',
  title: 'Products',
  permission: 'product.create',
  columns: [
    { header: 'Name', required: true, note: 'unique across both companies' },
    { header: 'Item Group Code', required: true, note: 'up to 5 letters / digits, unique across both companies' },
    { header: 'Category', required: true, options: OPTIONS.categories },
    { header: 'UOM', required: true, options: OPTIONS.uoms },
    { header: 'Status', required: true, options: STATUS },
    { header: 'Material Type', note: "this company's material types", options: OPTIONS.materialTypes },
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

// ---------------- Suppliers / jobbers ----------------
const yes = (v) => ['yes', 'y', 'true', '1'].includes(lower(v));
/** "Men shirt; TC" → category names / codes (";" or "," separated). */
const listOf = (v) => text(v).split(/[;,]/).map((x) => x.trim()).filter(Boolean);
const findSupplierType = async (value) => {
  const [rows] = await pool.query("SELECT id FROM supplier_types WHERE status = 'active' AND (code = ? OR name = ?)", [value, value]);
  return rows;
};
const DELIVERY_LABELS = { 'to office': 'to_office', 'direct to port': 'direct_to_port', 'to warehouse': 'to_warehouse' };

const suppliers = {
  key: 'suppliers',
  title: 'Suppliers / Jobbers',
  permission: 'supplier.create',
  columns: [
    { header: 'Display Code', required: true, note: 'up to 5 letters / digits / hyphens, unique' },
    { header: 'Company Name', required: true },
    { header: 'Party Type', required: true, options: ['supplier', 'jobber', 'both'] },
    { header: 'Delivery Mode', required: true, options: ['to_office', 'direct_to_port', 'to_warehouse'] },
    { header: 'Status', required: true, options: STATUS },
    { header: 'Shared', note: 'yes = shared by both companies; blank or no = the company chosen for this import', options: YES_NO },
    { header: 'Name on Bill' },
    { header: 'Supplier Type', options: OPTIONS.supplierTypes },
    { header: 'GST Number', note: 'required when the supplier type is registered' },
    { header: 'PAN Number' },
    { header: 'MSME', options: YES_NO },
    { header: 'MSME Registration No', note: 'required when MSME is yes' },
    { header: 'Categories', note: 'one or more, separated by ;', options: OPTIONS.categories, multi: true },
    { header: 'Contact Name' },
    { header: 'Contact Mobile' },
    { header: 'Contact Email' },
    { header: 'Address' },
    { header: 'PIN Code' },
    { header: 'Discount %', note: '0 – 99.99' },
    { header: 'Credit Days', note: '0 – 999; 0 = on dispatch' },
    { header: 'Bank Name' },
    { header: 'Account Number', note: 'format the column as Text to keep leading zeros' },
    { header: 'IFSC Code' },
    { header: 'Remarks' },
  ],
  example: ['SPM02', 'Sri Pocketing Mills', 'supplier', 'to_office', 'active', '', '', 'registered_regular', '33ABCDE1234F1Z5', 'ABCDE1234F', 'no', '', 'Men shirt', 'Suresh K', '9840012345', '', '45 Mill Road, Tiruppur', '641601', '', '45', 'HDFC Bank', '50100123456789', 'HDFC0001234', ''],
  resolve: async (row) => {
    const errors = [];
    const ids = { category_ids: [] };
    if (!blank(row['Supplier Type'])) {
      const found = await findSupplierType(text(row['Supplier Type']));
      if (found.length === 1) ids.supplier_type_id = found[0].id;
      else errors.push({ field: 'Supplier Type', message: found.length ? 'matches more than one supplier type' : `Supplier type "${text(row['Supplier Type'])}" not found` });
    }
    for (const value of listOf(row.Categories)) {
      const found = await findCategory(value);
      if (found.length === 1) ids.category_ids.push(found[0].id);
      else errors.push({ field: 'Categories', message: found.length ? `"${value}" matches more than one category` : `Category "${value}" not found` });
    }
    return { ids, errors };
  },
  toBody: (row, companyId, ids = {}) => ({
    company_id: yes(row.Shared) ? '' : companyId,
    display_code: text(row['Display Code']),
    company_name: text(row['Company Name']),
    party_type: lower(row['Party Type']),
    default_delivery_mode: DELIVERY_LABELS[lower(row['Delivery Mode'])] || lower(row['Delivery Mode']),
    status: lower(row.Status),
    name_on_bill: text(row['Name on Bill']),
    supplier_type_id: ids.supplier_type_id ?? '',
    gst_number: text(row['GST Number']),
    pan_number: text(row['PAN Number']),
    is_msme: yes(row.MSME),
    msme_registration_no: text(row['MSME Registration No']),
    category_ids: [...new Set(ids.category_ids || [])],
    contact_name: text(row['Contact Name']),
    contact_mobile: text(row['Contact Mobile']),
    contact_email: text(row['Contact Email']),
    address: text(row.Address),
    pincode: text(row['PIN Code']),
    discount_percent: text(row['Discount %']),
    credit_days: text(row['Credit Days']),
    bank_name: text(row['Bank Name']),
    account_number: text(row['Account Number']),
    ifsc_code: text(row['IFSC Code']),
    remarks: text(row.Remarks),
  }),
  keys: [['Display Code', (b) => b.display_code.toUpperCase()]],
  validate: async (body) => ({ errors: await validateSupplierCreate(body) }),
  fieldRules: [
    [/display code/i, 'Display Code'], [/company name/i, 'Company Name'], [/party type/i, 'Party Type'], [/delivery mode/i, 'Delivery Mode'],
    [/name on bill/i, 'Name on Bill'], [/supplier type/i, 'Supplier Type'], [/gst/i, 'GST Number'], [/pan/i, 'PAN Number'],
    [/msme/i, 'MSME Registration No'], [/categor/i, 'Categories'], [/contact name/i, 'Contact Name'], [/contact mobile|mobile/i, 'Contact Mobile'],
    [/email/i, 'Contact Email'], [/address/i, 'Address'], [/pin/i, 'PIN Code'], [/discount/i, 'Discount %'], [/credit/i, 'Credit Days'],
    [/bank/i, 'Bank Name'], [/account/i, 'Account Number'], [/ifsc/i, 'IFSC Code'], [/remarks/i, 'Remarks'], [/status/i, 'Status'],
    [/company/i, 'Shared'],
  ],
  create: (body, userId, connection) => supplierService.create(body, userId, { connection }),
};

// ---------------- Agents ----------------
const findCalculationBasis = query("SELECT id FROM calculation_bases WHERE status = 'active' AND (name = ? OR name = ?)");
const findCurrency = query("SELECT id FROM currencies WHERE status = 'active' AND (iso_code = ? OR name = ?)");

const agents = {
  key: 'agents',
  title: 'Agents',
  permission: 'agent.create',
  companyScoped: false,
  columns: [
    { header: 'Display Code', required: true, note: 'up to 5 letters / digits, unique' },
    { header: 'Name', required: true },
    { header: 'Agent Type', required: true, options: ['supplier', 'buyer', 'jobber'] },
    { header: 'Categories', required: true, note: 'one or more, separated by ;', options: OPTIONS.categories, multi: true },
    { header: 'Commission Basis', required: true, options: OPTIONS.calculationBases },
    { header: 'Commission Type', required: true, options: ['percent', 'fixed'] },
    { header: 'Commission Amount', required: true, note: '0 – 99999999.9999' },
    { header: 'Commission Currency', note: 'buyer agents only; supplier / jobber agents are always INR', options: OPTIONS.currencies },
    { header: 'Status', required: true, options: STATUS },
    { header: 'Remarks' },
    { header: 'Comments' },
  ],
  example: ['AGR01', 'Ravi Agencies', 'supplier', "Men's Trousers", 'Net Value', 'percent', '2', '', 'active', '', ''],
  resolve: async (row) => {
    const errors = [];
    const ids = {};
    ids.categories = await resolveList(row, 'Categories', findCategory, 'category', errors);
    await resolveKey(row, 'Commission Basis', findCalculationBasis, 'commission basis', ids, 'calculation_basis_id', errors);
    await resolveKey(row, 'Commission Currency', findCurrency, 'currency', ids, 'currency_id', errors);
    return { ids, errors };
  },
  toBody: (row, companyId, ids = {}) => ({
    display_code: text(row['Display Code']),
    name: text(row.Name),
    agent_type: lower(row['Agent Type']),
    // [-1]: every listed category was unknown — already reported by resolve().
    categories: ids.categories?.length || blank(row.Categories) ? (ids.categories || []) : [-1],
    calculation_basis_id: ids.calculation_basis_id ?? (blank(row['Commission Basis']) ? '' : -1),
    commissions: [{ commission_type: lower(row['Commission Type']), amount: text(row['Commission Amount']), currency_id: ids.currency_id ?? '' }],
    status: lower(row.Status),
    remarks: text(row.Remarks),
    comments: text(row.Comments),
  }),
  keys: [['Display Code', (b) => b.display_code]],
  validate: async (body) => {
    // Unresolved categories / commission basis (-1) were already reported by resolve().
    const errors = await validateAgentCreate(body);
    return { errors: errors.filter((e) => !((body.calculation_basis_id === -1 && /commission basis/i.test(e)) || (body.categories[0] === -1 && /categor/i.test(e)))) };
  },
  fieldRules: [
    [/display code/i, 'Display Code'], [/agent type/i, 'Agent Type'], [/categor/i, 'Categories'], [/commission basis/i, 'Commission Basis'],
    [/commission type/i, 'Commission Type'], [/currency/i, 'Commission Currency'], [/commission amount|commission entry/i, 'Commission Amount'],
    [/name/i, 'Name'], [/status/i, 'Status'], [/remarks/i, 'Remarks'], [/comments/i, 'Comments'],
  ],
  create: (body, userId, connection) => agentService.create(body, userId, { connection }),
};

// ---------------- Buyers ----------------
// Contacts, carton markings, state / city and the contact designation stay on the buyer form.
const findCountry = query("SELECT id FROM countries WHERE status = 'active' AND (iso_code = ? OR name = ?)");
const findPort = query("SELECT id FROM ports WHERE status = 'active' AND (code = ? OR name = ?)");
const findBuyerAgent = query("SELECT id FROM agents WHERE deleted_at IS NULL AND status = 'active' AND agent_type = 'buyer' AND (display_code = ? OR name = ?)");
const findPaymentTerm = query("SELECT id FROM payment_terms WHERE status = 'active' AND applies_to IN ('buyer', 'both') AND (name = ? OR name = ?)");
const findIncoterm = query("SELECT id FROM incoterms WHERE status = 'active' AND (code = ? OR name = ?)");
const findShipmentMethod = query("SELECT id FROM shipment_methods WHERE status = 'active' AND (name = ? OR name = ?)");

const buyers = {
  key: 'buyers',
  title: 'Buyers',
  permission: 'buyer.create',
  columns: [
    { header: 'Company Name', required: true, note: "the buyer's name; the buyer code is assigned automatically" },
    { header: 'Status', required: true, options: STATUS },
    { header: 'Shared', note: 'yes = shared by both companies; blank or no = the company chosen for this import', options: YES_NO },
    { header: 'Name on Export Invoice' },
    { header: 'Categories', note: 'one or more, separated by ;', options: OPTIONS.categories, multi: true },
    { header: 'Contact Person' },
    { header: 'Email' },
    { header: 'Mobile' },
    { header: 'GST / VAT No', note: 'a GSTIN is 15 characters, e.g. 33ABCDE1234F1Z5' },
    { header: 'Address' },
    { header: 'Country', options: OPTIONS.countries },
    { header: 'PIN Code' },
    { header: 'Port', options: OPTIONS.ports },
    { header: 'Agent', note: 'buyer-side agents', options: OPTIONS.buyerAgents },
    { header: 'Commission Type', note: 'needed when a commission value is given', options: ['percent', 'amount'] },
    { header: 'Commission Value' },
    { header: 'Payment Term', options: OPTIONS.buyerPaymentTerms },
    { header: 'Advance %', note: 'only for a split payment term; advance + at sight = 100' },
    { header: 'At Sight %' },
    { header: 'Incoterm', options: OPTIONS.incoterms },
    { header: 'Currency', options: OPTIONS.currencies },
    { header: 'Shipment Method', options: OPTIONS.shipmentMethods },
    { header: 'Bank Name' },
    { header: 'Account Number', note: 'format the column as Text to keep leading zeros' },
    { header: 'SWIFT Code' },
    { header: 'Remarks' },
    { header: 'Comments' },
  ],
  example: ['Bangalore Trouser Works Pvt Ltd', 'active', '', '', "Men's Trousers", 'Anil R', 'anil@example.com', '9845012345', '', 'Peenya, Bengaluru', 'IN', '560058', '', '', '', '', '30 Days', '', '', 'FOB', 'INR', 'Land', '', '', '', '', ''],
  resolve: async (row) => {
    const errors = [];
    const ids = {};
    ids.category_ids = await resolveList(row, 'Categories', findCategory, 'category', errors);
    for (const [column, find, label, target] of [
      ['Country', findCountry, 'country', 'country_id'], ['Port', findPort, 'port', 'port_id'], ['Agent', findBuyerAgent, 'buyer-side agent', 'agent_id'],
      ['Payment Term', findPaymentTerm, 'payment term', 'payment_term_id'], ['Incoterm', findIncoterm, 'incoterm', 'incoterm_id'],
      ['Currency', findCurrency, 'currency', 'currency_id'], ['Shipment Method', findShipmentMethod, 'shipment method', 'shipment_method_id'],
    ]) await resolveKey(row, column, find, label, ids, target, errors);
    return { ids, errors };
  },
  toBody: (row, companyId, ids = {}) => ({
    company_id: yes(row.Shared) ? '' : companyId,
    company_name: text(row['Company Name']),
    status: lower(row.Status),
    name_on_export_invoice: text(row['Name on Export Invoice']),
    category_ids: ids.category_ids || [],
    contact_person: text(row['Contact Person']),
    email: text(row.Email),
    mobile: text(row.Mobile),
    gst_vat_no: text(row['GST / VAT No']),
    address: text(row.Address),
    country_id: ids.country_id ?? '',
    pincode: text(row['PIN Code']),
    port_id: ids.port_id ?? '',
    agent_id: ids.agent_id ?? '',
    agent_commission_type: lower(row['Commission Type']),
    agent_commission_value: text(row['Commission Value']),
    payment_term_id: ids.payment_term_id ?? '',
    advance_percent: text(row['Advance %']),
    sight_percent: text(row['At Sight %']),
    incoterm_id: ids.incoterm_id ?? '',
    currency_id: ids.currency_id ?? '',
    shipment_method_id: ids.shipment_method_id ?? '',
    bank_name: text(row['Bank Name']),
    account_number: text(row['Account Number']),
    swift_code: text(row['SWIFT Code']),
    remarks: text(row.Remarks),
    comments: text(row.Comments),
  }),
  keys: [], // buyer names need not be unique; the code is server-assigned
  validate: async (body) => ({ errors: await validateBuyerCreate(body) }),
  fieldRules: [
    [/export invoice/i, 'Name on Export Invoice'], [/company name/i, 'Company Name'], [/categor/i, 'Categories'], [/contact person/i, 'Contact Person'],
    [/email/i, 'Email'], [/mobile/i, 'Mobile'], [/gstin|gst/i, 'GST / VAT No'], [/address/i, 'Address'], [/country/i, 'Country'],
    [/pincode/i, 'PIN Code'], [/port/i, 'Port'], [/commission is a percentage|commission type/i, 'Commission Type'],
    [/agent commission/i, 'Commission Value'], [/agent/i, 'Agent'], [/advance/i, 'Advance %'], [/at sight/i, 'At Sight %'],
    [/payment term/i, 'Payment Term'], [/incoterm|inco terms/i, 'Incoterm'], [/currency/i, 'Currency'], [/shipment method/i, 'Shipment Method'],
    [/bank/i, 'Bank Name'], [/account/i, 'Account Number'], [/swift/i, 'SWIFT Code'], [/remarks/i, 'Remarks'], [/comments/i, 'Comments'],
    [/status/i, 'Status'], [/company/i, 'Shared'],
  ],
  create: (body, userId, connection) => buyerService.create(body, userId, { connection }),
};

// ---------------- FOB values ----------------
const fobValues = {
  key: 'fob-values',
  title: 'FOB Values',
  permission: 'fob-value.create',
  companyScoped: false,
  columns: [
    { header: 'Name', required: true, note: 'unique' },
    { header: 'Status', required: true, options: STATUS },
    { header: 'Remarks' },
  ],
  example: ['FOB Chennai', 'active', ''],
  toBody: (row) => ({ name: text(row.Name), status: lower(row.Status), remarks: text(row.Remarks) }),
  keys: [['Name', (b) => b.name.toLowerCase()]],
  validate: async (body) => ({ errors: await validateFobValueCreate(body) }),
  fieldRules: [[/name/i, 'Name'], [/status/i, 'Status'], [/remarks/i, 'Remarks']],
  create: (body, userId, connection) => fobValueService.create(body, userId, { connection }),
};

// ---------------- Markups ----------------
const findSupplierByCode = query('SELECT id FROM suppliers WHERE deleted_at IS NULL AND (display_code = ? OR display_code = ?)');
const findBuyerByCode = query('SELECT id FROM buyers WHERE deleted_at IS NULL AND (display_code = ? OR display_code = ?)');

const markups = {
  key: 'markups',
  title: 'Markups',
  permission: 'markup.create',
  companyScoped: false,
  columns: [
    { header: 'Supplier Code', required: true, options: OPTIONS.suppliers },
    { header: 'Buyer Code', required: true, note: 'one rule per supplier + buyer', options: OPTIONS.buyers },
    { header: 'Markup %', required: true, note: '0 – 999.99' },
    { header: 'Status', required: true, options: STATUS },
    { header: 'Remarks' },
  ],
  example: ['SPM01', 'BUY03', '12.5', 'active', ''],
  resolve: async (row) => {
    const errors = [];
    const ids = {};
    await resolveKey(row, 'Supplier Code', findSupplierByCode, 'supplier', ids, 'supplier_id', errors);
    await resolveKey(row, 'Buyer Code', findBuyerByCode, 'buyer', ids, 'buyer_id', errors);
    return { ids, errors };
  },
  toBody: (row, companyId, ids = {}) => ({
    supplier_id: ids.supplier_id ?? (blank(row['Supplier Code']) ? '' : -1),
    buyer_id: ids.buyer_id ?? (blank(row['Buyer Code']) ? '' : -1),
    markup_percent: text(row['Markup %']),
    status: lower(row.Status),
    remarks: text(row.Remarks),
  }),
  keys: [['Buyer Code', (b) => (b.supplier_id > 0 && b.buyer_id > 0 ? `${b.supplier_id}:${b.buyer_id}` : '')]],
  validate: async (body) => {
    // Unresolved codes (-1) were already reported by resolve().
    const errors = await validateMarkupCreate(body);
    return { errors: errors.filter((e) => !((body.supplier_id === -1 && /supplier/i.test(e)) || (body.buyer_id === -1 && /buyer/i.test(e)))) };
  },
  fieldRules: [[/supplier and buyer/i, 'Buyer Code'], [/supplier/i, 'Supplier Code'], [/buyer/i, 'Buyer Code'], [/markup/i, 'Markup %'], [/status/i, 'Status'], [/remarks/i, 'Remarks']],
  create: (body, userId, connection) => markupService.create(body, userId, { connection }),
};

// ---------------- Stock locations ----------------
const locations = {
  key: 'stock-locations',
  title: 'Stock Locations',
  permission: 'stock-location.create',
  columns: [
    { header: 'Code', required: true, note: 'up to 20 letters / digits / - / _, unique in the company' },
    { header: 'Name', required: true },
    { header: 'Status', required: true, options: STATUS },
    { header: 'Remarks' },
  ],
  example: ['RAW01', 'Raw material store', 'active', ''],
  toBody: (row, companyId) => ({ company_id: companyId, code: text(row.Code), name: text(row.Name), status: lower(row.Status), remarks: text(row.Remarks) }),
  keys: [['Code', (b) => b.code.toUpperCase()]],
  // The location screen's Joi schema, plus the per-company code check the service makes.
  validate: async (body) => {
    const { error } = inventoryValidator.locationCreate.validate(body, { abortEarly: false });
    const errors = (error?.details || []).map((d) => d.message.replace(/"/g, ''));
    if (!error && await inventoryRepository.findLocationByCode(pool, body.company_id, body.code.toUpperCase())) {
      errors.push(`Location code ${body.code.toUpperCase()} already exists for this company.`);
    }
    return { errors };
  },
  fieldRules: [[/code/i, 'Code'], [/name/i, 'Name'], [/status/i, 'Status'], [/remarks/i, 'Remarks']],
  create: (body, userId, connection) => inventoryService.createLocation(body, userId, { connection }),
};

// ---------------- Opening stock ----------------
// One row = one opening lot at a location (rules in opening-stock.service.js).
const openingStock = {
  key: 'opening-stock',
  title: 'Opening Stock',
  permission: 'stock.adjust',
  columns: [
    { header: 'Location Code', required: true, note: "this company's stock locations", options: OPTIONS.locations },
    { header: 'Item Group Code', required: true, note: 'the product must have no stock movement at this location yet', options: OPTIONS.products },
    { header: 'Quantity', required: true, note: "in the product's UOM (its decimal places)" },
    { header: 'As-of Date', required: true, note: 'YYYY-MM-DD, the date of the stock count; not in the future' },
    { header: 'Width (inch)', note: 'required for fabrics (products with a fabric width in the master)' },
    { header: 'Mill Lot No', note: "the mill's / supplier's lot number, if known" },
    { header: 'Supplier Code', note: 'if known', options: OPTIONS.companySuppliers },
    { header: 'Remarks' },
  ],
  example: ['RAW01', 'PKW44', '1250.5', '2026-09-30', '44', 'ML-7788', 'SPM01', 'Opening count, rack A'],
  resolve: async (row, companyId) => {
    const { data, errors } = await openingStockService.check({
      location_code: codeOf(row['Location Code']), item_group_code: codeOf(row['Item Group Code']), quantity: text(row.Quantity),
      date: dateText(row['As-of Date']), width_inch: text(row['Width (inch)']), supplier_lot_no: row['Mill Lot No'],
      supplier_code: blank(row['Supplier Code']) ? null : codeOf(row['Supplier Code']), remarks: row.Remarks,
    }, companyId);
    return { ids: data, errors };
  },
  toBody: (row, companyId, ids = {}) => ids,
  keys: [],
  validate: async () => ({ errors: [] }), // every rule is checked in resolve()
  fieldRules: [],
  create: (body, userId, connection) => openingStockService.create(connection, body, userId),
};

// ---------------- Draft brand projections ----------------
const projections = {
  key: 'brand-projections',
  title: 'Draft Brand Projections',
  permission: 'brand-projection.create',
  grouped: true, // several rows (lines) make one projection, grouped by Projection Ref
  columns: [
    { header: 'Projection Ref', required: true, note: 'any label; rows with the same ref form one projection' },
    { header: 'Brand Code', required: true, note: 'same on every row', options: OPTIONS.brands },
    { header: 'Title', required: true, note: 'same on every row of the projection' },
    { header: 'Period Start', required: true, note: 'YYYY-MM-DD; same on every row' },
    { header: 'Period End', required: true, note: 'YYYY-MM-DD; same on every row' },
    { header: 'Item Group Code', required: true, options: OPTIONS.products },
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
      const [found] = await pool.query('SELECT id FROM brands WHERE deleted_at IS NULL AND company_id = ? AND code = ?', [companyId, codeOf(first['Brand Code']).toUpperCase()]);
      if (found.length) brandId = found[0].id;
      else errors.push({ rowNumber: rows[0].rowNumber, field: 'Brand Code', message: `Brand "${codeOf(first['Brand Code'])}" not found in this company` });
    }
    const productIds = [];
    for (const { row, rowNumber } of rows) {
      if (blank(row['Item Group Code'])) {
        productIds.push(null);
        continue;
      }
      const [found] = await pool.query('SELECT id FROM products WHERE deleted_at IS NULL AND item_group_code = ?', [codeOf(row['Item Group Code']).toUpperCase()]);
      if (found.length) productIds.push(found[0].id);
      else {
        productIds.push(-1);
        errors.push({ rowNumber, field: 'Item Group Code', message: `Product "${codeOf(row['Item Group Code'])}" not found` });
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

// In dependency order: a row may refer to records the imports above it create.
export const IMPORTS = [
  categories, uoms, materialTypes, brands, products, agents, buyers, suppliers,
  fobValues, markups, locations, openingStock, projections,
];
export const findImport = (key) => IMPORTS.find((i) => i.key === key) || null;
export { fieldFor, blank, text };
