import { pool } from '../../config/database.js';
import { processingRepository } from './processing.repository.js';
import { materialIssueRepository } from './material-issue.repository.js';
import { numberSeriesService, financialYearFor } from '../../services/number-series.service.js';
import { quantity } from '../../services/quantity.service.js';
import { companyScope } from '../../services/company-scope.service.js';
import { inventoryRepository } from '../inventory/inventory.repository.js';
import { nextMovementNo } from '../inventory/inventory.service.js';

const PROCESSING_SERIES = { module: 'processing', prefix: 'PRC/' };
// Finished-material lots share the lot series with received lots.
const LOT_SERIES = { module: 'lot', prefix: 'LOT/' };
const LINE_FIELDS = [['consumed_quantity', 'consumed'], ['wastage_quantity', 'wastage'], ['balance_quantity', 'balance']];

const notFound = () => ({ status: 404, message: 'Processing record not found' });
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
const stored = (v) => (v === null || v === undefined ? null : String(Number(v)));

/**
 * Consumed / wastage / balance per issued lot are RECORDED, not derived: the
 * client has defined no formula relating them (or to produced output). Only
 * objective integrity is enforced: not negative, the lot's UOM precision, and
 * none of them above the quantity issued for that lot.
 */
const checkLineQuantities = (items, input) => {
  const errors = [];
  const byId = Object.fromEntries(items.map((i) => [i.id, i]));
  const values = {};
  for (const row of input || []) {
    const item = byId[row.id];
    if (!item) {
      errors.push(`Line ${row.id} does not belong to this processing record`);
      continue;
    }
    values[item.id] = { remarks: text(row.remarks) };
    for (const [field, label] of LINE_FIELDS) {
      if (blank(row[field])) {
        values[item.id][field] = null;
        continue;
      }
      const error = quantity.validate(row[field], item.uom_decimal_places, `${label} quantity`, { allowZero: true });
      if (error) {
        errors.push(error);
        continue;
      }
      if (quantity.toMicro(row[field]) > quantity.toMicro(item.issued_quantity)) {
        errors.push(`${label} quantity ${String(row[field]).trim()} exceeds the ${quantity.fromMicro(quantity.toMicro(item.issued_quantity))}${item.unit ? ` ${item.unit}` : ''} issued`);
        continue;
      }
      values[item.id][field] = String(row[field]).trim();
    }
  }
  if (errors.length > 0) throw rejected(`Processing quantities are invalid: ${errors.join('; ')}`, errors);
  return values;
};

/** What was produced: an optional existing product of the company, a UOM, and a quantity in its precision. */
const checkOutput = async (executor, companyId, data) => {
  let productId = blank(data.produced_product_id) ? null : Number(data.produced_product_id);
  let uomId = blank(data.produced_uom_id) ? null : Number(data.produced_uom_id);
  if (productId) {
    const product = await processingRepository.findProduct(executor, productId);
    if (!product || product.deleted_at) throw rejected('The produced product does not exist.');
    if (product.company_id !== companyId) throw rejected(`${product.name} belongs to a different company.`);
    if (uomId === null) uomId = product.uom_id;
  }
  let uom = null;
  if (uomId !== null) {
    uom = await processingRepository.findUom(executor, uomId);
    if (!uom || uom.deleted_at || uom.status !== 'active') throw rejected('The produced UOM is not an active UOM.');
  }
  let producedQuantity = null;
  if (!blank(data.produced_quantity)) {
    if (!uom) throw rejected('Select the UOM of the produced quantity.');
    const error = quantity.validate(data.produced_quantity, uom.decimal_places, 'Produced quantity', { allowZero: true });
    if (error) throw rejected(error);
    producedQuantity = String(data.produced_quantity).trim();
  }
  return {
    produced_product_id: productId,
    produced_uom_id: uom ? uom.id : null,
    produced_unit: uom ? uom.code : null,
    produced_quantity: producedQuantity,
  };
};

export const processingService = {
  outputOptions: (companyId) => processingRepository.findOutputOptions(companyId),

  /** What posting would put into stock (derived from the record) and the company's active locations. */
  outputFormData: async (id) => {
    const record = await processingRepository.findById(id);
    if (!record) throw notFound();
    const locations = await inventoryRepository.findLocations({ company_id: record.company_id, status: 'active', limit: 500 });
    return {
      processing_record_id: record.id,
      processing_no: record.processing_no,
      status: record.status,
      output_posted_at: record.output_posted_at,
      produced_product_id: record.produced_product_id,
      produced_product_name: record.produced_product_name,
      produced_uom_id: record.produced_uom_id,
      produced_unit: record.produced_unit,
      produced_quantity: record.produced_quantity,
      locations: locations.rows,
    };
  },

  /**
   * Posts the produced quantity of a COMPLETED record to finished-material
   * stock, exactly as recorded (no formula). Product, UOM, quantity and
   * company come from the locked record; the client only chooses the
   * destination location and date. Creates the output lot and one
   * PRODUCTION_OUTPUT IN movement; posting twice fails on the posted flag,
   * the lot's unique processing_record_id and the movement's unique key.
   */
  postOutput: async (id, data, userId) => {
    try {
      return await inTransaction(async (connection) => {
        const record = await processingRepository.lock(connection, id);
        if (!record) throw notFound();
        if (record.status !== 'completed') throw rejected('Only a completed processing record can post its output to stock.');
        const existingLot = await processingRepository.findOutputLot(connection, id);
        if (record.output_posted_at || existingLot) {
          throw rejected(`The output of ${record.processing_no} is already posted to stock${existingLot ? ` (lot ${existingLot.lot_no})` : ''}.`);
        }
        if (!blank(data.company_id) && Number(data.company_id) !== record.company_id) {
          throw rejected(`${record.processing_no} belongs to a different company.`);
        }
        if (!record.produced_product_id) throw rejected('Select the produced product before posting output to stock.');
        if (!record.produced_uom_id) throw rejected('Select the produced UOM before posting output to stock.');
        if (record.produced_quantity === null || quantity.toMicro(record.produced_quantity) <= 0) {
          throw rejected('The produced quantity must be greater than zero to post output to stock.');
        }
        const product = await processingRepository.findProduct(connection, record.produced_product_id);
        if (!product || product.deleted_at) throw rejected('The produced product no longer exists.');
        if (product.status !== 'active') throw rejected(`${product.name} is inactive.`);
        if (product.company_id !== record.company_id) throw rejected(`${product.name} belongs to a different company.`);
        const uom = await processingRepository.findUom(connection, record.produced_uom_id);
        if (!uom || uom.deleted_at || uom.status !== 'active') throw rejected('The produced UOM is not an active UOM.');
        const produced = String(Number(record.produced_quantity));
        const precisionError = quantity.validate(produced, uom.decimal_places, 'Produced quantity');
        if (precisionError) throw rejected(precisionError);

        const location = await inventoryRepository.findLocation(connection, data.location_id);
        if (!location) throw rejected('Stock location not found.');
        if (location.company_id !== record.company_id) throw rejected(`Location ${location.code} belongs to a different company.`);
        if (location.status !== 'active') throw rejected(`Location ${location.code} is inactive.`);
        await companyScope.assertActiveCompany(record.company_id, connection);

        const financialYear = financialYearFor(dateFor(data.movement_date));
        await numberSeriesService.ensure(connection, LOT_SERIES.module, LOT_SERIES.prefix, financialYear);
        const lotNo = await numberSeriesService.next(connection, LOT_SERIES.module, financialYear);
        const lotId = await processingRepository.insertOutputLot(connection, {
          company_id: record.company_id,
          lot_no: lotNo,
          financial_year: financialYear,
          processing_record_id: record.id,
          product_id: product.id,
          uom_id: uom.id,
          unit: uom.code,
          quantity: produced,
          received_date: data.movement_date,
          user_id: userId,
        });
        const movement = await nextMovementNo(connection, data.movement_date);
        await inventoryRepository.insertMovement(connection, {
          company_id: record.company_id,
          movement_no: movement.movementNo,
          financial_year: movement.financialYear,
          movement_date: data.movement_date,
          movement_type: 'PRODUCTION_OUTPUT',
          direction: 'in',
          location_id: location.id,
          lot_id: lotId,
          product_id: product.id,
          uom_id: uom.id,
          unit: uom.code,
          quantity: produced,
          source_type: 'processing_record',
          processing_record_id: record.id,
          reason: null,
          remarks: text(data.remarks),
          created_by: userId,
        });
        await processingRepository.setOutputPosted(connection, id, userId);
        return lotId;
      });
    } catch (error) {
      if (error && error.code === 'ER_DUP_ENTRY' && /processing_record/.test(error.message)) {
        throw rejected('This processing output is already posted to stock.');
      }
      throw error;
    }
  },

  /** Starts processing of an ISSUED material issue — one record per issue, lines copied from the issue. */
  create: async (data, userId) => {
    try {
      return await inTransaction(async (connection) => {
        const issue = await materialIssueRepository.lock(connection, data.material_issue_id);
        if (!issue) throw rejected('Material issue not found.');
        if (issue.status !== 'issued') throw rejected(`Processing starts from an issued material issue (${issue.issue_no} is ${issue.status}).`);
        const lines = await materialIssueRepository.lockLines(connection, issue.id);
        const existing = await processingRepository.findByIssue(connection, issue.id);
        if (existing) throw rejected(`${issue.issue_no} already has processing record ${existing.processing_no}.`);
        await companyScope.assertActiveCompany(issue.company_id, connection);

        const financialYear = financialYearFor(dateFor(data.start_date));
        await numberSeriesService.ensure(connection, PROCESSING_SERIES.module, PROCESSING_SERIES.prefix, financialYear);
        const processingNo = await numberSeriesService.next(connection, PROCESSING_SERIES.module, financialYear);
        return processingRepository.insert(connection, {
          company_id: issue.company_id,
          processing_no: processingNo,
          financial_year: financialYear,
          material_issue_id: issue.id,
          start_date: data.start_date,
          remarks: text(data.remarks),
          user_id: userId,
        }, lines);
      });
    } catch (error) {
      if (error && error.code === 'ER_DUP_ENTRY' && /material_issue_id/.test(error.message)) {
        throw rejected('This material issue already has a processing record.');
      }
      throw error;
    }
  },

  /** In-process records only; completed records are read-only. */
  update: async (id, data, userId) => {
    await inTransaction(async (connection) => {
      const record = await processingRepository.lock(connection, id);
      if (!record) throw notFound();
      if (record.status !== 'in_process') throw rejected('A completed processing record cannot be edited.');
      const items = await processingRepository.lockItems(connection, id);
      const values = checkLineQuantities(items, data.items);
      const output = await checkOutput(connection, record.company_id, data);
      await processingRepository.update(connection, id, {
        start_date: data.start_date,
        ...output,
        remarks: text(data.remarks),
        user_id: userId,
      });
      for (const [itemId, v] of Object.entries(values)) {
        await processingRepository.updateItem(connection, Number(itemId), v);
      }
    });
  },

  /**
   * in_process → completed. Every issued lot needs its consumed, wastage and
   * balance quantities recorded (0 is allowed), and the produced quantity
   * with its UOM. No formula between them is enforced.
   */
  complete: async (id, data, userId) => {
    await inTransaction(async (connection) => {
      const record = await processingRepository.lock(connection, id);
      if (!record) throw notFound();
      if (record.status !== 'in_process') throw rejected('This processing record is already completed.');
      const items = await processingRepository.lockItems(connection, id);
      const missing = [];
      for (const item of items) {
        for (const [field, label] of LINE_FIELDS) {
          if (item[field] === null) missing.push(`${label} quantity for line ${item.id}`);
        }
      }
      if (record.produced_quantity === null || record.produced_uom_id === null) missing.push('produced quantity and its UOM');
      if (missing.length > 0) throw rejected(`Record before completing: ${missing.join(', ')}.`, missing);
      // Re-check stored values (issued caps, precision) before they become final.
      checkLineQuantities(items, items.map((i) => ({
        id: i.id, consumed_quantity: stored(i.consumed_quantity), wastage_quantity: stored(i.wastage_quantity), balance_quantity: stored(i.balance_quantity),
      })));
      if (String(data.completion_date) < String(record.start_date).slice(0, 10)) {
        throw rejected('The completion date cannot be before the start date.');
      }
      await processingRepository.setCompleted(connection, id, data.completion_date, userId);
    });
  },
};
