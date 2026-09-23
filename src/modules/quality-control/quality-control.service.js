import { pool } from '../../config/database.js';
import { qualityControlRepository } from './quality-control.repository.js';
import { numberSeriesService, financialYearFor } from '../../services/number-series.service.js';
import { quantity } from '../../services/quantity.service.js';
import { companyScope } from '../../services/company-scope.service.js';

const QC_SERIES = { module: 'qc', prefix: 'QC/' };

const notFound = () => ({ status: 404, message: 'Quality inspection not found' });
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
 * The received lot must still be a valid QC source: lot received, its GRN a
 * posted GRN, lot/GRN/PO in one company, and the supplier the PO's own,
 * active and usable by that company. Shared with supplier returns and debit
 * notes, which re-check the lot behind their QC.
 */
export const assertLotSourceUsable = async (src, companyId, executor = pool) => {
  if (!src) throw rejected('Lot not found.');
  if (src.status !== 'received') throw rejected(`Lot ${src.lot_no} is ${src.status}.`);
  if (src.entry_type !== 'grn' || src.grn_deleted_at || src.receipt_status !== 'posted') {
    throw rejected(`Goods receipt ${src.inward_no} is not posted (${src.grn_deleted_at ? 'deleted' : src.receipt_status}).`);
  }
  if (src.grn_company_id !== src.company_id || src.po_company_id !== src.company_id) {
    throw rejected(`Lot ${src.lot_no}, its goods receipt and its purchase order are not in the same company.`);
  }
  if (!blank(companyId) && Number(companyId) !== src.company_id) {
    throw rejected(`Lot ${src.lot_no} belongs to a different company.`);
  }
  if (src.po_deleted_at) throw rejected(`Purchase order ${src.po_num} no longer exists.`);
  if (src.grn_supplier_id !== src.supplier_id || src.po_supplier_id !== src.supplier_id) {
    throw rejected(`Lot ${src.lot_no} does not have the same supplier as ${src.po_num}.`);
  }
  if (!src.supplier_name || src.supplier_deleted_at) throw rejected(`The supplier of ${src.po_num} no longer exists.`);
  if (src.supplier_status !== 'active') throw rejected(`Supplier ${src.supplier_name} is inactive.`);
  if (src.supplier_company_id !== null && src.supplier_company_id !== src.company_id) {
    throw rejected(`Supplier ${src.supplier_name} belongs to a different company than lot ${src.lot_no}.`);
  }
  await companyScope.assertActiveCompany(src.company_id, executor);
};

/**
 * Validates QC quantities in the lot's UOM precision and returns them
 * normalised. A draft needs the inspected quantity; accepted/rejected may be
 * left blank until completion, but anything entered must be consistent:
 *   accepted, rejected <= inspected · accepted + rejected = inspected
 *   return <= rejected
 */
const checkQuantities = (data, decimals, { complete = false } = {}) => {
  const errors = [];
  const inspectedError = quantity.validate(data.inspected_quantity, decimals, 'Inspected quantity');
  if (inspectedError) errors.push(inspectedError);

  const optional = (value, label) => {
    if (blank(value)) return null;
    const error = quantity.validate(value, decimals, label, { allowZero: true });
    if (error) {
      errors.push(error);
      return undefined;
    }
    return String(value).trim();
  };
  const accepted = optional(data.accepted_quantity, 'Accepted quantity');
  const rejectedQty = optional(data.rejected_quantity, 'Rejected quantity');
  const returnQty = optional(data.return_quantity, 'Return quantity');

  if (complete && accepted === null) errors.push('Accepted quantity is required to complete the inspection');
  if (complete && rejectedQty === null) errors.push('Rejected quantity is required to complete the inspection');

  if (errors.length === 0) {
    const inspected = quantity.toMicro(data.inspected_quantity);
    if (accepted !== null && quantity.toMicro(accepted) > inspected) errors.push('Accepted quantity cannot exceed the inspected quantity');
    if (rejectedQty !== null && quantity.toMicro(rejectedQty) > inspected) errors.push('Rejected quantity cannot exceed the inspected quantity');
    if (accepted !== null && rejectedQty !== null && quantity.toMicro(accepted) + quantity.toMicro(rejectedQty) !== inspected) {
      errors.push(`Accepted + rejected (${quantity.fromMicro(quantity.toMicro(accepted) + quantity.toMicro(rejectedQty))}) must equal the inspected quantity (${quantity.fromMicro(inspected)})`);
    }
    if (returnQty !== null) {
      if (rejectedQty === null) errors.push('Enter the rejected quantity before a return quantity');
      else if (quantity.toMicro(returnQty) > quantity.toMicro(rejectedQty)) errors.push('Return quantity cannot exceed the rejected quantity');
    }
  }
  if (errors.length > 0) throw rejected(`Inspection quantities are invalid: ${errors.join('; ')}`, errors);
  return {
    inspected_quantity: String(data.inspected_quantity).trim(),
    accepted_quantity: accepted,
    rejected_quantity: rejectedQty,
    return_quantity: returnQty,
  };
};

/** Inspected quantity of all active QCs on the lot may not exceed the lot quantity. */
const checkCapacity = async (connection, src, inspectedQuantity, excludeId = 0) => {
  const claimed = quantity.toMicro(await qualityControlRepository.claimedOnLot(connection, src.id, excludeId));
  const lotQty = quantity.toMicro(src.quantity);
  if (claimed + quantity.toMicro(inspectedQuantity) > lotQty) {
    const remaining = quantity.fromMicro(Math.max(lotQty - claimed, 0));
    throw rejected(`Inspecting ${inspectedQuantity} exceeds the ${remaining}${src.unit ? ` ${src.unit}` : ''} of lot ${src.lot_no} not yet under inspection.`);
  }
};

const inspectionFields = (data) => ({
  shade: text(data.shade),
  edge_to_edge_shade: text(data.edge_to_edge_shade),
  weaving_defects: text(data.weaving_defects),
  remarks: text(data.remarks),
});

/** Locks GRN → lot → QC (the GRN-cancel lock order) and returns the QC with its lot source. */
const lockInspection = async (connection, id) => {
  const ref = await qualityControlRepository.findRef(id);
  if (!ref) throw notFound();
  await qualityControlRepository.lockGrnAndLot(connection, ref.inward_entry_id, ref.lot_id);
  const qc = await qualityControlRepository.lock(connection, id);
  const src = await qualityControlRepository.findLotSource(connection, qc.lot_id);
  return { qc, src };
};

export const qualityControlService = {
  /** Eligible lots of a company, or one lot's QC source figures. */
  formData: async ({ company_id: companyId, lot_id: lotId, search }) => {
    if (!blank(lotId)) {
      const src = await qualityControlRepository.findLotSource(pool, lotId);
      if (!src) throw { status: 404, message: 'Lot not found' };
      return { lot: src };
    }
    const id = Number(companyId);
    if (!Number.isInteger(id) || id <= 0) throw rejected('company_id or lot_id is required');
    return { lots: await qualityControlRepository.findEligibleLots(id, search) };
  },

  create: async (data, userId) => {
    const ref = await qualityControlRepository.findLotRef(data.lot_id);
    if (!ref) throw rejected('Lot not found.');
    return inTransaction(async (connection) => {
      await qualityControlRepository.lockGrnAndLot(connection, ref.inward_entry_id, ref.id);
      const src = await qualityControlRepository.findLotSource(connection, ref.id);
      await assertLotSourceUsable(src, data.company_id, connection);
      const quantities = checkQuantities(data, src.uom_decimal_places);
      await checkCapacity(connection, src, quantities.inspected_quantity);

      const financialYear = financialYearFor(dateFor(data.inspection_date));
      await numberSeriesService.ensure(connection, QC_SERIES.module, QC_SERIES.prefix, financialYear);
      const qcNo = await numberSeriesService.next(connection, QC_SERIES.module, financialYear);

      return qualityControlRepository.insert(connection, {
        company_id: src.company_id,
        qc_no: qcNo,
        financial_year: financialYear,
        inspection_date: data.inspection_date,
        // Source chain always comes from the lot.
        lot_id: src.id,
        inward_entry_id: src.inward_entry_id,
        inward_entry_item_id: src.inward_entry_item_id,
        purchase_order_id: src.purchase_order_id,
        purchase_order_item_id: src.purchase_order_item_id,
        supplier_id: src.supplier_id,
        product_id: src.product_id,
        uom_id: src.uom_id,
        unit: src.unit,
        ...quantities,
        ...inspectionFields(data),
        created_by: userId,
      });
    });
  },

  /** Draft inspections only; the lot cannot be changed. */
  update: async (id, data, userId) => {
    await inTransaction(async (connection) => {
      const { qc, src } = await lockInspection(connection, id);
      if (qc.status !== 'draft') throw rejected(`A ${qc.status} inspection cannot be edited.`);
      await assertLotSourceUsable(src, undefined, connection);
      const quantities = checkQuantities(data, src.uom_decimal_places);
      await checkCapacity(connection, src, quantities.inspected_quantity, qc.id);
      await qualityControlRepository.update(connection, id, {
        inspection_date: data.inspection_date,
        ...quantities,
        ...inspectionFields(data),
        updated_by: userId,
      });
    });
  },

  /**
   * draft → completed. Quantities must be complete and consistent; the result
   * follows from them: nothing rejected → accepted, nothing accepted →
   * rejected, otherwise partially accepted.
   */
  complete: async (id, userId) => {
    await inTransaction(async (connection) => {
      const { qc, src } = await lockInspection(connection, id);
      if (qc.status !== 'draft') throw rejected(`Only a draft inspection can be completed (this one is ${qc.status}).`);
      await assertLotSourceUsable(src, undefined, connection);
      const q = checkQuantities({
        inspected_quantity: String(Number(qc.inspected_quantity)),
        accepted_quantity: qc.accepted_quantity === null ? null : String(Number(qc.accepted_quantity)),
        rejected_quantity: qc.rejected_quantity === null ? null : String(Number(qc.rejected_quantity)),
        return_quantity: qc.return_quantity === null ? null : String(Number(qc.return_quantity)),
      }, src.uom_decimal_places, { complete: true });
      await checkCapacity(connection, src, q.inspected_quantity, qc.id);

      const accepted = quantity.toMicro(q.accepted_quantity);
      const rejectedQty = quantity.toMicro(q.rejected_quantity);
      const result = rejectedQty === 0 ? 'accepted' : (accepted === 0 ? 'rejected' : 'partially_accepted');
      await qualityControlRepository.setCompleted(connection, id, result, userId);
    });
  },

  /**
   * draft/completed → cancelled. History is kept; the lot quantity is freed
   * for re-inspection. A completed QC with live returns or debit notes cannot
   * be cancelled until those are cancelled.
   */
  cancel: async (id, reason, userId) => {
    await inTransaction(async (connection) => {
      const { qc } = await lockInspection(connection, id);
      if (qc.status === 'cancelled') throw rejected('This inspection is already cancelled.');
      const deps = await qualityControlRepository.countDependents(connection, id);
      if (deps.returns_count > 0 || deps.debit_notes_count > 0) {
        throw rejected(`${qc.qc_no} has ${deps.returns_count} supplier return(s) and ${deps.debit_notes_count} debit note(s). Cancel them first.`);
      }
      await qualityControlRepository.setCancelled(connection, id, text(reason), userId);
    });
  },
};
