/**
 * Opening stock: stock that existed before the ERP (the client's Excel
 * inventory), brought in by the Opening Stock import. Each row becomes one
 * lot (source 'opening', no PO / GRN behind it) and one immutable
 * OPENING_BALANCE ledger row that puts it into a location.
 *
 * Rules (decided for requirement 15; the client's Excel format is still to be
 * confirmed):
 *   - Once per product + location: a row is refused when the product already
 *     has any stock movement at that location. Opening stock is the starting
 *     point; later corrections are stock adjustments. New products / new
 *     locations can still be opened at any time, and one file may hold several
 *     lots of the same product + location.
 *   - Width is required when the product is a fabric (its master has a fabric
 *     width), the same "width is mandatory" rule a GRN applies to mill fabric;
 *     optional otherwise (badges, finished goods).
 *   - Supplier is optional (old stock is often of mixed or unknown source);
 *     when given it must be usable by the company.
 *   - The date cannot be in the future. No QC step: the stock is already on hand.
 */
import { pool } from '../../config/database.js';
import { quantity } from '../../services/quantity.service.js';
import { numberSeriesService, financialYearFor } from '../../services/number-series.service.js';
import { inventoryRepository } from './inventory.repository.js';
import { nextMovementNo } from './inventory.service.js';

const LOT_SERIES = { module: 'lot', prefix: 'LOT/' };
const blank = (v) => v === undefined || v === null || String(v).trim() === '';
const text = (v) => (blank(v) ? '' : String(v).trim());
const today = () => new Date().toISOString().slice(0, 10);
// Product + location pairs opened by the current import transaction: one file
// may open several lots (e.g. different widths) of the same product at a location.
const openedIn = new WeakMap();

export const openingStockService = {
  /** Resolves and checks one row; returns { data, errors: [{ field, message }] }. */
  check: async (row, companyId, executor = pool) => {
    const errors = [];
    const data = { company_id: companyId };

    if (blank(row.location_code)) errors.push({ field: 'Location Code', message: 'Location code is required' });
    else {
      const [[loc]] = await executor.query('SELECT id, code, status FROM stock_locations WHERE company_id = ? AND code = ?', [companyId, text(row.location_code)]);
      if (!loc) errors.push({ field: 'Location Code', message: `Location "${text(row.location_code)}" not found in this company` });
      else if (loc.status !== 'active') errors.push({ field: 'Location Code', message: `Location ${loc.code} is inactive` });
      else { data.location_id = loc.id; data.location_code = loc.code; }
    }

    let product = null;
    if (blank(row.item_group_code)) errors.push({ field: 'Item Group Code', message: 'Item group code is required' });
    else {
      [[product]] = await executor.query(
        `SELECT p.id, p.name, p.company_id, p.status, p.uom_id, p.fabric_width_inch, u.code AS uom_code, COALESCE(u.decimal_places, 0) AS decimals
         FROM products p LEFT JOIN uoms u ON u.id = p.uom_id
         WHERE p.deleted_at IS NULL AND p.item_group_code = ?`,
        [text(row.item_group_code).toUpperCase()]
      );
      if (!product) errors.push({ field: 'Item Group Code', message: `Product "${text(row.item_group_code)}" not found` });
      else if (product.company_id !== companyId) { errors.push({ field: 'Item Group Code', message: `${product.name} belongs to a different company` }); product = null; }
      else if (product.status !== 'active') { errors.push({ field: 'Item Group Code', message: `${product.name} is inactive` }); product = null; }
      else if (!product.uom_id) { errors.push({ field: 'Item Group Code', message: `${product.name} has no UOM` }); product = null; }
      else Object.assign(data, { product_id: product.id, uom_id: product.uom_id, unit: product.uom_code });
    }

    if (product) {
      const qtyError = quantity.validate(row.quantity, product.decimals, 'Quantity');
      if (qtyError) errors.push({ field: 'Quantity', message: qtyError });
      else data.quantity = text(row.quantity);
    } else if (blank(row.quantity)) errors.push({ field: 'Quantity', message: 'Quantity is required' });

    const width = text(row.width_inch);
    if (width) {
      if (!/^\d+(\.\d{1,3})?$/.test(width) || Number(width) <= 0 || Number(width) > 999.999) errors.push({ field: 'Width (inch)', message: 'Width must be a positive number (inches, up to 3 decimals)' });
      else data.width_inch = width;
    } else if (product && product.fabric_width_inch !== null && product.fabric_width_inch !== undefined) {
      errors.push({ field: 'Width (inch)', message: `Width is required for ${product.name} (a fabric)` });
    }

    if (!blank(row.supplier_code)) {
      const [[sup]] = await executor.query('SELECT id, company_id, company_name FROM suppliers WHERE deleted_at IS NULL AND display_code = ?', [text(row.supplier_code).toUpperCase()]);
      if (!sup) errors.push({ field: 'Supplier Code', message: `Supplier "${text(row.supplier_code)}" not found` });
      else if (sup.company_id !== null && sup.company_id !== companyId) errors.push({ field: 'Supplier Code', message: `${sup.company_name} belongs to a different company` });
      else data.supplier_id = sup.id;
    }

    const lotNo = text(row.supplier_lot_no);
    if (lotNo.length > 60) errors.push({ field: 'Mill Lot No', message: 'Mill lot no. cannot exceed 60 characters' });
    else data.supplier_lot_no = lotNo || null;

    const date = text(row.date);
    if (!date) errors.push({ field: 'As-of Date', message: 'As-of date is required' });
    else if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) errors.push({ field: 'As-of Date', message: 'As-of date must be YYYY-MM-DD' });
    else if (date > today()) errors.push({ field: 'As-of Date', message: 'As-of date cannot be in the future' });
    else data.date = date;

    const remarks = text(row.remarks);
    if (remarks.length > 1000) errors.push({ field: 'Remarks', message: 'Remarks cannot exceed 1000 characters' });
    else data.remarks = remarks || null;

    if (data.product_id && data.location_id) {
      const [[moved]] = await executor.query(
        'SELECT COUNT(*) AS n FROM stock_movements WHERE company_id = ? AND product_id = ? AND location_id = ?',
        [companyId, data.product_id, data.location_id]
      );
      if (moved.n > 0) {
        errors.push({ field: 'Item Group Code', message: `${product.name} already has stock movements at ${data.location_code}; opening stock is only for a product + location with none — use a stock adjustment instead` });
      }
    }
    return { data, errors };
  },

  /** Creates the opening lot and its OPENING_BALANCE movement inside the caller's transaction; returns the lot id. */
  create: async (connection, data, userId) => {
    // The location row is locked first, so two imports cannot both open the same product + location.
    await connection.query('SELECT id FROM stock_locations WHERE id = ? FOR UPDATE', [data.location_id]);
    const [[moved]] = await connection.query(
      'SELECT COUNT(*) AS n FROM stock_movements WHERE company_id = ? AND product_id = ? AND location_id = ?',
      [data.company_id, data.product_id, data.location_id]
    );
    const opened = openedIn.get(connection) || new Set();
    const pair = `${data.product_id}-${data.location_id}`;
    if (moved.n > 0 && !opened.has(pair)) throw { status: 422, message: `Stock already exists for this product at ${data.location_code}.` };
    opened.add(pair);
    openedIn.set(connection, opened);

    const financialYear = financialYearFor(new Date(`${data.date}T00:00:00Z`));
    await numberSeriesService.ensure(connection, LOT_SERIES.module, LOT_SERIES.prefix, financialYear);
    const lotNo = await numberSeriesService.next(connection, LOT_SERIES.module, financialYear);
    const [lot] = await connection.query(`
      INSERT INTO lots (company_id, lot_no, financial_year, source_type, supplier_id, product_id, uom_id, unit,
        quantity, width_inch, supplier_lot_no, received_date, status, created_by, updated_by, created_at, updated_at)
      VALUES (?, ?, ?, 'opening', ?, ?, ?, ?, ?, ?, ?, ?, 'received', ?, ?, NOW(), NOW())
    `, [data.company_id, lotNo, financialYear, data.supplier_id || null, data.product_id, data.uom_id, data.unit,
      data.quantity, data.width_inch || null, data.supplier_lot_no, data.date, userId, userId]);

    const { financialYear: movementYear, movementNo } = await nextMovementNo(connection, data.date);
    await inventoryRepository.insertMovement(connection, {
      company_id: data.company_id,
      movement_no: movementNo,
      financial_year: movementYear,
      movement_date: data.date,
      movement_type: 'OPENING_BALANCE',
      direction: 'in',
      location_id: data.location_id,
      lot_id: lot.insertId,
      product_id: data.product_id,
      uom_id: data.uom_id,
      unit: data.unit,
      quantity: data.quantity,
      source_type: 'opening_balance',
      reason: 'Opening stock',
      remarks: data.remarks,
      created_by: userId,
    });
    return lot.insertId;
  },
};
