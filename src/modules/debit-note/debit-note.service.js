import { pool } from '../../config/database.js';
import { debitNoteRepository } from './debit-note.repository.js';
import { qualityControlRepository } from '../quality-control/quality-control.repository.js';
import { assertLotSourceUsable } from '../quality-control/quality-control.service.js';
import { numberSeriesService, financialYearFor } from '../../services/number-series.service.js';
import { quantity } from '../../services/quantity.service.js';

const NOTE_SERIES = { module: 'debit_note', prefix: 'DN/' };
const MAX_AMOUNT = 999999999999.99; // DECIMAL(14, 2), the PO amount column size

const notFound = () => ({ status: 404, message: 'Debit note not found' });
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
// Same rounding the PO uses for line amounts (garment-po.service).
const roundMoney = (n) => Math.round(n * 100) / 100;

/**
 * Locks QC → return (the order every QC-dependent action uses) and checks
 * the source: a completed inspection with rejected material, a valid lot/GRN/
 * PO/supplier chain, and — when given — a POSTED return of that inspection.
 */
const lockSource = async (connection, qcId, returnId, companyId) => {
  const qc = await qualityControlRepository.lock(connection, qcId);
  if (!qc) throw rejected('Quality inspection not found.');
  if (qc.status !== 'completed') throw rejected(`A debit note needs a completed inspection (${qc.qc_no} is ${qc.status}).`);
  if (quantity.toMicro(qc.rejected_quantity) <= 0) throw rejected(`${qc.qc_no} has no rejected quantity.`);
  const src = await qualityControlRepository.findLotSource(connection, qc.lot_id);
  await assertLotSourceUsable(src, companyId, connection);

  let ret = null;
  if (!blank(returnId)) {
    ret = await debitNoteRepository.lockReturn(connection, returnId);
    if (!ret || ret.quality_inspection_id !== qc.id) throw rejected(`The supplier return does not belong to ${qc.qc_no}.`);
    if (ret.status !== 'posted') throw rejected(`Supplier return ${ret.return_no} is ${ret.status}; only a posted return can be debited.`);
  }
  return { qc, src, ret };
};

/**
 * quantity <= rejected − other live notes on the QC, and (through a return)
 * <= returned − other live notes on that return.
 */
const checkQuantity = async (connection, { qc, src, ret }, value, excludeId = 0) => {
  const error = quantity.validate(value, src.uom_decimal_places, 'Debit note quantity');
  if (error) throw rejected(error, [error]);
  const requested = quantity.toMicro(value);
  const unit = qc.unit ? ` ${qc.unit}` : '';

  const onQc = quantity.toMicro(await debitNoteRepository.reserved(connection, 'quality_inspection_id', qc.id, excludeId));
  const qcRemaining = quantity.toMicro(qc.rejected_quantity) - onQc;
  if (requested > qcRemaining) {
    throw rejected(`Debiting ${String(value).trim()} exceeds the ${quantity.fromMicro(Math.max(qcRemaining, 0))}${unit} of rejected material on ${qc.qc_no} not yet debited.`);
  }
  if (ret) {
    const onReturn = quantity.toMicro(await debitNoteRepository.reserved(connection, 'supplier_return_id', ret.id, excludeId));
    const returnRemaining = quantity.toMicro(ret.quantity) - onReturn;
    if (requested > returnRemaining) {
      throw rejected(`Debiting ${String(value).trim()} exceeds the ${quantity.fromMicro(Math.max(returnRemaining, 0))}${unit} returned on ${ret.return_no} not yet debited.`);
    }
  }
};

/**
 * Amount: quantity × the PO line's price when the PO has one (not
 * overridable). Without a PO price the amount is entered manually or left
 * empty. No tax is applied — the client has not defined tax rules.
 */
const priceFor = async (connection, qc, value, manualAmount) => {
  const unitPrice = await debitNoteRepository.findPoUnitPrice(connection, qc.purchase_order_item_id);
  if (unitPrice !== null && unitPrice !== undefined) {
    return {
      unit_price: unitPrice,
      amount: roundMoney(quantity.fromMicro(quantity.toMicro(value)) * Number(unitPrice)),
      amount_basis: 'po_price',
    };
  }
  if (blank(manualAmount)) return { unit_price: null, amount: null, amount_basis: 'none' };
  const amountText = String(manualAmount).trim();
  if (!/^\d+(\.\d{1,2})?$/.test(amountText) || Number(amountText) > MAX_AMOUNT) {
    throw rejected('Amount must be a non-negative number with at most 2 decimal places.');
  }
  return { unit_price: null, amount: amountText, amount_basis: 'manual' };
};

/** Locks QC → return → note. */
const lockNote = async (connection, id) => {
  const ref = await debitNoteRepository.findRef(id);
  if (!ref) throw notFound();
  const source = await lockSource(connection, ref.quality_inspection_id, ref.supplier_return_id);
  const note = await debitNoteRepository.lock(connection, id);
  return { note, source };
};

/** Lock only QC → note, for cancelling (the source may no longer be debitable). */
const lockNoteForCancel = async (connection, id) => {
  const ref = await debitNoteRepository.findRef(id);
  if (!ref) throw notFound();
  await qualityControlRepository.lock(connection, ref.quality_inspection_id);
  if (ref.supplier_return_id) await debitNoteRepository.lockReturn(connection, ref.supplier_return_id);
  return debitNoteRepository.lock(connection, id);
};

export const debitNoteService = {
  /** Debitable inspections (with their posted returns) of a company, or one inspection's figures. */
  formData: async ({ company_id: companyId, quality_inspection_id: qcId, search }) => {
    if (!blank(qcId)) {
      const inspection = await debitNoteRepository.findDebitableQc(qcId);
      if (!inspection) throw { status: 404, message: 'Quality inspection not found' };
      return { inspection };
    }
    const id = Number(companyId);
    if (!Number.isInteger(id) || id <= 0) throw rejected('company_id or quality_inspection_id is required');
    return { inspections: await debitNoteRepository.findDebitable(id, search) };
  },

  create: async (data, userId) => inTransaction(async (connection) => {
    const source = await lockSource(connection, data.quality_inspection_id, data.supplier_return_id, data.company_id);
    await checkQuantity(connection, source, data.quantity);
    const { qc, ret } = source;
    const price = await priceFor(connection, qc, data.quantity, data.amount);

    const financialYear = financialYearFor(dateFor(data.debit_note_date));
    await numberSeriesService.ensure(connection, NOTE_SERIES.module, NOTE_SERIES.prefix, financialYear);
    const noteNo = await numberSeriesService.next(connection, NOTE_SERIES.module, financialYear);

    return debitNoteRepository.insert(connection, {
      company_id: qc.company_id,
      debit_note_no: noteNo,
      financial_year: financialYear,
      debit_note_date: data.debit_note_date,
      quality_inspection_id: qc.id,
      supplier_return_id: ret ? ret.id : null,
      // Supplier and source chain are inherited from the inspection.
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
      ...price,
      reason: text(data.reason),
      remarks: text(data.remarks),
      created_by: userId,
    });
  }),

  /** Draft notes only; the source (inspection, return, supplier) cannot be changed. */
  update: async (id, data, userId) => {
    await inTransaction(async (connection) => {
      const { note, source } = await lockNote(connection, id);
      if (note.status !== 'draft') throw rejected(`A ${note.status} debit note cannot be edited.`);
      await checkQuantity(connection, source, data.quantity, note.id);
      const price = await priceFor(connection, source.qc, data.quantity, data.amount);
      await debitNoteRepository.update(connection, id, {
        debit_note_date: data.debit_note_date,
        quantity: String(data.quantity).trim(),
        ...price,
        reason: text(data.reason),
        remarks: text(data.remarks),
        updated_by: userId,
      });
    });
  },

  /** draft → posted (final). Source and quantities are re-checked with QC and return locked. */
  post: async (id, userId) => {
    await inTransaction(async (connection) => {
      const { note, source } = await lockNote(connection, id);
      if (note.status !== 'draft') throw rejected(`Only a draft debit note can be posted (this one is ${note.status}).`);
      await checkQuantity(connection, source, String(Number(note.quantity)), note.id);
      await debitNoteRepository.setPosted(connection, id, userId);
    });
  },

  /** draft/posted → cancelled. */
  cancel: async (id, userId) => {
    await inTransaction(async (connection) => {
      const note = await lockNoteForCancel(connection, id);
      if (note.status === 'cancelled') throw rejected('This debit note is already cancelled.');
      await debitNoteRepository.setCancelled(connection, id, userId);
    });
  },
};
