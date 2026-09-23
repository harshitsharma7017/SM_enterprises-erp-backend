import { pool } from '../../config/database.js';
import { inventoryRepository } from './inventory.repository.js';
import { lotRepository, findLotTrace } from '../lot/lot.repository.js';
import { numberSeriesService, financialYearFor } from '../../services/number-series.service.js';
import { quantity } from '../../services/quantity.service.js';
import { companyScope } from '../../services/company-scope.service.js';

const STOCK_SERIES = { module: 'stock', prefix: 'STK/' };

const rejected = (message, errors) => ({ status: 422, message, errors });

const inTransaction = async (work) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await work(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const dateFor = (value) => {
  const [y, m, d] = String(value).slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
};

const blank = (v) => v === undefined || v === null || String(v).trim() === '';
const text = (v) => (blank(v) ? null : String(v).trim());
const sameId = (a, b) => (a === null || a === undefined ? null : Number(a)) === (b === null || b === undefined ? null : Number(b));

/** The lot must be a received lot of a posted GRN whose product belongs to the lot's company. */
export const checkLot = (lot) => {
  if (!lot) throw rejected('Lot not found.');
  if (lot.status !== 'received') throw rejected(`Lot ${lot.lot_no} is ${lot.status}.`);
  if (lot.entry_type !== 'grn' || lot.grn_deleted_at || lot.receipt_status !== 'posted') {
    throw rejected(`The goods receipt of lot ${lot.lot_no} is not posted.`);
  }
  if (lot.product_company_id !== lot.company_id) {
    throw rejected(`The product of lot ${lot.lot_no} does not belong to the lot's company.`);
  }
};

/** Location must exist and belong to the lot's company; receipts need an active location. */
const checkLocation = async (executor, locationId, lot, { mustBeActive = true } = {}) => {
  const location = await inventoryRepository.findLocation(executor, locationId);
  if (!location) throw rejected('Stock location not found.');
  if (location.company_id !== lot.company_id) {
    throw rejected(`Location ${location.code} belongs to a different company than lot ${lot.lot_no}.`);
  }
  if (mustBeActive && location.status !== 'active') throw rejected(`Location ${location.code} is inactive.`);
  return location;
};

export const nextMovementNo = async (connection, movementDate) => {
  const financialYear = financialYearFor(dateFor(movementDate));
  await numberSeriesService.ensure(connection, STOCK_SERIES.module, STOCK_SERIES.prefix, financialYear);
  return { financialYear, movementNo: await numberSeriesService.next(connection, STOCK_SERIES.module, financialYear) };
};

// A concurrent duplicate that slips past the check still hits the unique key.
const duplicatePosting = (error, qcNo) => {
  if (error && error.code === 'ER_DUP_ENTRY' && /type_quality_inspection/.test(error.message)) {
    return rejected(`${qcNo || 'This inspection'} is already posted to stock.`);
  }
  return error;
};

export const inventoryService = {
  /** Lot stock detail: the lot (with QC figures), its balance per location and its movements. */
  lotStock: async (lotId) => {
    const lot = await lotRepository.findById(lotId);
    if (!lot) return null;
    const [balances, movements] = await Promise.all([
      inventoryRepository.findLotBalances(lotId),
      inventoryRepository.findLotMovements(lotId),
    ]);
    return { lot, balances, movements };
  },

  movementDetail: async (id) => {
    const movement = await inventoryRepository.findMovement(id);
    if (!movement) return null;
    movement.trace = await findLotTrace(movement.lot_id);
    return movement;
  },

  postableInspections: async (companyId, qcId) => {
    if (!blank(qcId)) {
      const source = await inventoryRepository.findQcStockSource(pool, qcId);
      if (!source) throw { status: 404, message: 'Quality inspection not found' };
      return { inspection: source };
    }
    return { inspections: await inventoryRepository.findPostableInspections(companyId) };
  },

  /**
   * Posts the accepted quantity of one completed QC to usable stock — the
   * only way material enters stock. Lock order: lot → QC (the order QC
   * edits/cancels use after the GRN), then every read. Rejected quantity
   * never enters stock. A QC is posted at most once (checked here, and by
   * the unique key for any race).
   */
  receiveQc: async (data, userId) => {
    const ref = await inventoryRepository.findQcRef(data.quality_inspection_id);
    if (!ref) throw rejected('Quality inspection not found.');
    let qcNo = null;
    try {
      return await inTransaction(async (connection) => {
        const lot = await inventoryRepository.lockLot(connection, ref.lot_id);
        const qc = await inventoryRepository.lockInspection(connection, ref.id);
        qcNo = qc.qc_no;
        if (qc.status !== 'completed') throw rejected(`Only a completed inspection can be posted to stock (${qc.qc_no} is ${qc.status}).`);
        if (quantity.toMicro(qc.accepted_quantity) <= 0) throw rejected(`${qc.qc_no} has no accepted quantity to post to stock.`);
        const existing = await inventoryRepository.findQcReceipt(connection, qc.id);
        if (existing) throw rejected(`${qc.qc_no} is already posted to stock (${existing.movement_no}).`);

        checkLot(lot);
        if (!blank(data.company_id) && Number(data.company_id) !== lot.company_id) {
          throw rejected(`${qc.qc_no} belongs to a different company.`);
        }
        if (qc.company_id !== lot.company_id || qc.lot_id !== lot.id) throw rejected(`${qc.qc_no} does not match its lot's company.`);
        if (!sameId(qc.product_id, lot.product_id) || !sameId(qc.uom_id, lot.uom_id)) {
          throw rejected(`${qc.qc_no} does not match the product/UOM of lot ${lot.lot_no}.`);
        }
        const location = await checkLocation(connection, data.location_id, lot);
        await companyScope.assertActiveCompany(lot.company_id, connection);

        const accepted = String(Number(qc.accepted_quantity));
        const precisionError = quantity.validate(accepted, lot.uom_decimal_places, 'Accepted quantity');
        if (precisionError) throw rejected(precisionError);
        // Stock from QC can never exceed what the lot received.
        const totals = await inventoryRepository.lotTotals(connection, lot.id);
        if (quantity.toMicro(totals.received_quantity) + quantity.toMicro(accepted) > quantity.toMicro(lot.quantity)) {
          throw rejected(`Posting ${accepted} would put more of lot ${lot.lot_no} into stock than was received.`);
        }

        const { financialYear, movementNo } = await nextMovementNo(connection, data.movement_date);
        return inventoryRepository.insertMovement(connection, {
          company_id: lot.company_id,
          movement_no: movementNo,
          financial_year: financialYear,
          movement_date: data.movement_date,
          movement_type: 'QC_ACCEPTED_RECEIPT',
          direction: 'in',
          location_id: location.id,
          lot_id: lot.id,
          product_id: lot.product_id,
          uom_id: lot.uom_id,
          unit: lot.unit,
          quantity: accepted,
          source_type: 'quality_inspection',
          quality_inspection_id: qc.id,
          reason: null,
          remarks: text(data.remarks),
          created_by: userId,
        });
      });
    } catch (error) {
      throw duplicatePosting(error, qcNo);
    }
  },

  /**
   * Restricted correction of an EXISTING lot balance at a location (reason
   * required). OUT may not take the balance below zero; IN may only restore
   * stock earlier adjustments took out (never material issued to production)
   * — a lot's stock never exceeds the QC-accepted quantity posted for it.
   * This is not an opening-balance mechanism.
   */
  adjust: async (data, userId) => inTransaction(async (connection) => {
    const lot = await inventoryRepository.lockLot(connection, data.lot_id);
    checkLot(lot);
    if (!blank(data.company_id) && Number(data.company_id) !== lot.company_id) {
      throw rejected(`Lot ${lot.lot_no} belongs to a different company.`);
    }
    const location = await checkLocation(connection, data.location_id, lot, { mustBeActive: data.direction === 'in' });
    await companyScope.assertActiveCompany(lot.company_id, connection);

    const qtyError = quantity.validate(data.quantity, lot.uom_decimal_places, 'Adjustment quantity');
    if (qtyError) throw rejected(qtyError);
    const value = String(data.quantity).trim();
    const totals = await inventoryRepository.lotTotals(connection, lot.id, location.id);
    if (Number(totals.location_movements) === 0) {
      throw rejected(`Lot ${lot.lot_no} has no stock history at ${location.code}; adjustments only correct an existing balance.`);
    }
    const unit = lot.unit ? ` ${lot.unit}` : '';
    if (data.direction === 'out' && quantity.toMicro(value) > quantity.toMicro(totals.location_quantity)) {
      throw rejected(`Removing ${value} would make stock negative: lot ${lot.lot_no} has ${quantity.fromMicro(quantity.toMicro(totals.location_quantity))}${unit} at ${location.code}.`);
    }
    if (data.direction === 'in' && quantity.toMicro(totals.stock_quantity) + quantity.toMicro(value) > quantity.toMicro(totals.received_quantity)) {
      const room = quantity.fromMicro(Math.max(quantity.toMicro(totals.received_quantity) - quantity.toMicro(totals.stock_quantity), 0));
      throw rejected(`Adding ${value} exceeds the QC-accepted quantity of lot ${lot.lot_no}; at most ${room}${unit} can be restored.`);
    }
    // Only what adjustments removed can be restored — never issued material.
    if (data.direction === 'in' && quantity.toMicro(value) > quantity.toMicro(totals.adjusted_out_quantity)) {
      throw rejected(`Adding ${value} exceeds the ${quantity.fromMicro(Math.max(quantity.toMicro(totals.adjusted_out_quantity), 0))}${unit} of lot ${lot.lot_no} removed by earlier adjustments.`);
    }

    const { financialYear, movementNo } = await nextMovementNo(connection, data.movement_date);
    return inventoryRepository.insertMovement(connection, {
      company_id: lot.company_id,
      movement_no: movementNo,
      financial_year: financialYear,
      movement_date: data.movement_date,
      movement_type: 'STOCK_ADJUSTMENT',
      direction: data.direction,
      location_id: location.id,
      lot_id: lot.id,
      product_id: lot.product_id,
      uom_id: lot.uom_id,
      unit: lot.unit,
      quantity: value,
      source_type: 'stock_adjustment',
      quality_inspection_id: null,
      reason: String(data.reason).trim(),
      remarks: text(data.remarks),
      created_by: userId,
    });
  }),

  // ---------------- Locations ----------------
  createLocation: async (data, userId) => inTransaction(async (connection) => {
    const companyId = await companyScope.assertActiveCompany(data.company_id, connection);
    const code = String(data.code).trim().toUpperCase();
    if (await inventoryRepository.findLocationByCode(connection, companyId, code)) {
      throw rejected(`Location code ${code} already exists for this company.`);
    }
    return inventoryRepository.insertLocation(connection, {
      company_id: companyId, code, name: String(data.name).trim(), status: data.status || 'active', remarks: text(data.remarks), user_id: userId,
    });
  }),

  /** Code, name, status and remarks are editable; the company is fixed once created. */
  updateLocation: async (id, data, userId) => inTransaction(async (connection) => {
    const [[existing]] = await connection.query('SELECT * FROM stock_locations WHERE id = ? FOR UPDATE', [id]);
    if (!existing) throw { status: 404, message: 'Stock location not found' };
    if (!blank(data.company_id) && Number(data.company_id) !== existing.company_id) {
      throw rejected('The company of a stock location cannot be changed.');
    }
    const code = String(data.code).trim().toUpperCase();
    if (await inventoryRepository.findLocationByCode(connection, existing.company_id, code, existing.id)) {
      throw rejected(`Location code ${code} already exists for this company.`);
    }
    await inventoryRepository.updateLocation(connection, id, {
      code, name: String(data.name).trim(), status: data.status, remarks: text(data.remarks), user_id: userId,
    });
  }),
};
