import { pool } from '../../config/database.js';
import { supplierReturnRepository } from './supplier-return.repository.js';
import { qualityControlRepository } from '../quality-control/quality-control.repository.js';
import { assertLotSourceUsable } from '../quality-control/quality-control.service.js';
import { numberSeriesService, financialYearFor } from '../../services/number-series.service.js';
import { quantity } from '../../services/quantity.service.js';

const RETURN_SERIES = { module: 'supplier_return', prefix: 'SR/' };

const notFound = () => ({ status: 404, message: 'Supplier return not found' });
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

/**
 * Locks the QC (first — the lock every return/debit-note action on a QC
 * takes) and checks it is a completed inspection with rejected material
 * whose lot, GRN, PO and supplier are still valid.
 */
const lockReturnableQc = async (connection, qcId, companyId) => {
  const qc = await qualityControlRepository.lock(connection, qcId);
  if (!qc) throw rejected('Quality inspection not found.');
  if (qc.status !== 'completed') throw rejected(`Only a completed inspection can be returned (${qc.qc_no} is ${qc.status}).`);
  if (quantity.toMicro(qc.rejected_quantity) <= 0) throw rejected(`${qc.qc_no} has no rejected quantity to return.`);
  const src = await qualityControlRepository.findLotSource(connection, qc.lot_id);
  await assertLotSourceUsable(src, companyId, connection);
  return { qc, src };
};

/** quantity <= rejected − (other draft/posted returns of the QC). */
const checkReturnable = async (connection, qc, src, value, excludeId = 0) => {
  const error = quantity.validate(value, src.uom_decimal_places, 'Return quantity');
  if (error) throw rejected(error, [error]);
  const reserved = quantity.toMicro(await supplierReturnRepository.reservedOnQc(connection, qc.id, excludeId));
  const remaining = quantity.toMicro(qc.rejected_quantity) - reserved;
  if (quantity.toMicro(value) > remaining) {
    throw rejected(`Returning ${String(value).trim()} exceeds the ${quantity.fromMicro(Math.max(remaining, 0))}${qc.unit ? ` ${qc.unit}` : ''} of rejected material on ${qc.qc_no} not yet returned.`);
  }
};

/** Locks QC → return, in that order. */
const lockReturn = async (connection, id) => {
  const ref = await supplierReturnRepository.findRef(id);
  if (!ref) throw notFound();
  await qualityControlRepository.lock(connection, ref.quality_inspection_id);
  return supplierReturnRepository.lock(connection, id);
};

export const supplierReturnService = {
  /** Returnable QCs of a company, or one QC's rejected / returned / remaining figures. */
  formData: async ({ company_id: companyId, quality_inspection_id: qcId, search }) => {
    if (!blank(qcId)) {
      const qc = await supplierReturnRepository.findReturnableQc(qcId);
      if (!qc) throw { status: 404, message: 'Quality inspection not found' };
      return { inspection: qc };
    }
    const id = Number(companyId);
    if (!Number.isInteger(id) || id <= 0) throw rejected('company_id or quality_inspection_id is required');
    return { inspections: await supplierReturnRepository.findReturnable(id, search) };
  },

  create: async (data, userId) => inTransaction(async (connection) => {
    const { qc, src } = await lockReturnableQc(connection, data.quality_inspection_id, data.company_id);
    await checkReturnable(connection, qc, src, data.quantity);

    const financialYear = financialYearFor(dateFor(data.return_date));
    await numberSeriesService.ensure(connection, RETURN_SERIES.module, RETURN_SERIES.prefix, financialYear);
    const returnNo = await numberSeriesService.next(connection, RETURN_SERIES.module, financialYear);

    return supplierReturnRepository.insert(connection, {
      company_id: qc.company_id,
      return_no: returnNo,
      financial_year: financialYear,
      return_date: data.return_date,
      quality_inspection_id: qc.id,
      // Source chain and supplier are inherited from the inspection.
      lot_id: qc.lot_id,
      inward_entry_id: qc.inward_entry_id,
      inward_entry_item_id: qc.inward_entry_item_id,
      purchase_order_id: qc.purchase_order_id,
      purchase_order_item_id: qc.purchase_order_item_id,
      supplier_id: qc.supplier_id,
      product_id: qc.product_id,
      uom_id: qc.uom_id,
      unit: qc.unit,
      quantity: String(data.quantity).trim(),
      reason: text(data.reason),
      remarks: text(data.remarks),
      created_by: userId,
    });
  }),

  /** draft → posted: the quantity counts as returned. Re-checked with the QC locked. */
  post: async (id, userId) => {
    await inTransaction(async (connection) => {
      const existing = await lockReturn(connection, id);
      if (existing.status !== 'draft') throw rejected(`Only a draft return can be posted (this one is ${existing.status}).`);
      const { qc, src } = await lockReturnableQc(connection, existing.quality_inspection_id);
      await checkReturnable(connection, qc, src, String(Number(existing.quantity)), existing.id);
      await supplierReturnRepository.setPosted(connection, id, userId);
    });
  },

  /** draft/posted → cancelled, unless a live debit note is raised against it. */
  cancel: async (id, userId) => {
    await inTransaction(async (connection) => {
      const existing = await lockReturn(connection, id);
      if (existing.status === 'cancelled') throw rejected('This return is already cancelled.');
      const debitNotes = await supplierReturnRepository.countDebitNotes(connection, id);
      if (debitNotes > 0) throw rejected(`${existing.return_no} has ${debitNotes} debit note(s). Cancel them first.`);
      await supplierReturnRepository.setCancelled(connection, id, userId);
    });
  },
};
