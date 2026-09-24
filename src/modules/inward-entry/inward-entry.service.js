import { pool } from '../../config/database.js';
import { inwardEntryRepository, RECEIVED_CONDITION } from './inward-entry.repository.js';
import { numberSeriesService, financialYearFor } from '../../services/number-series.service.js';
import { quantity } from '../../services/quantity.service.js';

// Same series and format as every inward entry so far (GT/INW/NNN/FY).
const GRN_SERIES = { module: 'inward', prefix: 'GT/INW/' };
const LOT_SERIES = { module: 'lot', prefix: 'LOT/' };
const RECEIVABLE_PO_STATUSES = ['raised', 'partial'];

const notFound = () => ({ status: 404, message: 'Goods receipt not found' });
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

/** PO must be a confirmed, company-owned PO with a valid supplier. */
const checkPo = (po, supplier, companyId) => {
  if (!po) throw rejected('Purchase order not found.');
  if (po.company_id === null) {
    throw rejected(`${po.po_num} has no company yet. Assign its order confirmation to a company before receiving.`);
  }
  if (companyId !== undefined && companyId !== null && companyId !== '' && Number(companyId) !== po.company_id) {
    throw rejected(`${po.po_num} belongs to a different company.`);
  }
  if (po.status === 'draft') throw rejected(`${po.po_num} is a draft. Confirm it before receiving goods.`);
  if (po.status === 'cancelled') throw rejected(`${po.po_num} is cancelled.`);
  if (po.status === 'received') throw rejected(`${po.po_num} is already fully received.`);
  if (!RECEIVABLE_PO_STATUSES.includes(po.status)) throw rejected(`${po.po_num} cannot be received in status ${po.status}.`);
  if (!supplier || supplier.deleted_at) throw rejected(`The supplier of ${po.po_num} no longer exists.`);
  if (supplier.company_id !== null && supplier.company_id !== po.company_id) {
    throw rejected(`${supplier.company_name} belongs to a different company than ${po.po_num}.`);
  }
};

/**
 * Validates GRN lines against the PO's lines and returns them in insertable
 * form. `poLines` must have been read after the PO lines were locked.
 * Pending = ordered − received on POSTED receipts; this GRN's lines for one
 * PO line (e.g. several widths) are summed before comparing.
 */
const checkLines = (po, poLines, lines) => {
  const errors = [];
  const poLineById = Object.fromEntries(poLines.map((l) => [l.id, l]));
  const requestedByPoLine = {};
  const output = [];

  lines.forEach((line, index) => {
    const label = `Line ${index + 1}`;
    const pl = poLineById[line.purchase_order_item_id];
    if (!pl) {
      errors.push(`${label}: the PO line does not belong to ${po.po_num}`);
      return;
    }
    const name = pl.product_name || `PO line ${pl.id}`;
    if (!pl.product_id || pl.product_deleted_at) {
      errors.push(`${label}: ${name} has no product to receive`);
      return;
    }
    if (pl.product_company_id !== po.company_id) {
      errors.push(`${label}: ${name} does not belong to the PO's company`);
      return;
    }
    const qtyError = quantity.validate(line.received_quantity, pl.uom_decimal_places, `${label}: received quantity`);
    if (qtyError) {
      errors.push(qtyError);
      return;
    }
    const width = String(line.width_inch ?? '').trim();
    if (!width) {
      errors.push(`${label}: width is required`);
      return;
    }
    if (!/^\d+(\.\d{1,3})?$/.test(width) || Number(width) <= 0 || Number(width) > 999.999) {
      errors.push(`${label}: width must be a positive number (inches, up to 3 decimals)`);
      return;
    }
    requestedByPoLine[pl.id] = (requestedByPoLine[pl.id] || 0) + quantity.toMicro(line.received_quantity);
    output.push({
      purchase_order_item_id: pl.id,
      product_id: pl.product_id,
      description: pl.description,
      unit: pl.unit,
      uom_id: pl.uom_id,
      received_quantity: String(line.received_quantity).trim(),
      width_inch: width,
      supplier_lot_no: line.supplier_lot_no || null,
      remarks: line.remarks || null,
    });
  });

  for (const [poLineId, requested] of Object.entries(requestedByPoLine)) {
    const pl = poLineById[poLineId];
    const pending = quantity.toMicro(pl.pending_quantity);
    if (requested > pending) {
      errors.push(`${pl.product_name}: receiving ${quantity.fromMicro(requested)} exceeds the ${quantity.fromMicro(Math.max(pending, 0))} ${pl.unit || ''} still pending on ${po.po_num}`.trim());
    }
  }

  if (errors.length > 0) throw rejected(`Goods receipt lines are invalid: ${errors.join('; ')}`, errors);
  return output;
};

/** Locks the PO and its lines, then validates PO, supplier and lines. */
const lockAndCheck = async (connection, poId, companyId, lines) => {
  const po = await inwardEntryRepository.lockPo(connection, poId);
  const supplier = po ? await inwardEntryRepository.findSupplier(connection, po.supplier_id) : null;
  checkPo(po, supplier, companyId);
  await inwardEntryRepository.lockPoLines(connection, po.id);
  const poLines = await inwardEntryRepository.findPoLines(connection, po.id);
  return { po, lines: checkLines(po, poLines, lines) };
};

export const inwardEntryService = {
  /** Eligible POs for a company (confirmed, with quantity still pending). */
  eligiblePurchaseOrders: (companyId) => inwardEntryRepository.findEligiblePos(companyId),

  /** A PO's lines with Ordered / Received / Pending, for the GRN form. */
  receivingLines: async (poId) => {
    const [[po]] = await pool.query(`
      SELECT po.id, po.po_num, po.origin, po.status, po.company_id, po.supplier_id, s.company_name AS supplier_name
      FROM purchase_orders po LEFT JOIN suppliers s ON s.id = po.supplier_id
      WHERE po.id = ? AND po.deleted_at IS NULL
    `, [poId]);
    if (!po) throw { status: 404, message: 'Purchase Order not found' };
    return { purchase_order: po, lines: await inwardEntryRepository.findPoLines(pool, poId) };
  },

  create: async (data, userId) => {
    return inTransaction(async (connection) => {
      const { po, lines } = await lockAndCheck(connection, data.purchase_order_id, data.company_id, data.items);

      const financialYear = financialYearFor(dateFor(data.inward_date));
      await numberSeriesService.ensure(connection, GRN_SERIES.module, GRN_SERIES.prefix, financialYear);
      const number = await numberSeriesService.nextNumber(connection, GRN_SERIES.module, financialYear);

      const id = await inwardEntryRepository.insertHeader(connection, {
        company_id: po.company_id, // always the PO's company
        inward_no: `${GRN_SERIES.prefix}${number}/${financialYear}`,
        financial_year: financialYear,
        inward_date: data.inward_date,
        purchase_order_id: po.id,
        supplier_id: po.supplier_id, // always the PO's supplier
        challan_no: data.challan_no || null,
        challan_date: data.challan_date || null,
        remarks: data.remarks || null,
        created_by: userId,
        updated_by: userId,
      });
      await inwardEntryRepository.replaceLines(connection, id, lines);
      return id;
    });
  },

  /** Draft GRNs only; the PO cannot be changed. */
  update: async (id, data, userId) => {
    await inTransaction(async (connection) => {
      const existing = await inwardEntryRepository.lockHeader(connection, id);
      if (!existing) throw notFound();
      if (existing.entry_type !== 'grn') throw rejected('Legacy inward entries are read-only history.');
      if (existing.receipt_status !== 'draft') throw rejected(`A ${existing.receipt_status} goods receipt cannot be edited.`);

      const { lines } = await lockAndCheck(connection, existing.purchase_order_id, existing.company_id, data.items);
      await inwardEntryRepository.updateHeader(connection, id, {
        inward_date: data.inward_date,
        challan_no: data.challan_no || null,
        challan_date: data.challan_date || null,
        remarks: data.remarks || null,
        updated_by: userId,
      });
      await inwardEntryRepository.replaceLines(connection, id, lines);
    });
  },

  /**
   * draft → posted. Re-validates against quantities received on POSTED GRNs
   * with the PO lines locked, creates one lot per line, then updates the PO's
   * receiving status — all in one transaction.
   */
  post: async (id, userId) => {
    await inTransaction(async (connection) => {
      const existing = await inwardEntryRepository.lockHeader(connection, id);
      if (!existing) throw notFound();
      if (existing.entry_type !== 'grn') throw rejected('Legacy inward entries are read-only history.');
      if (existing.receipt_status !== 'draft') throw rejected(`Only a draft goods receipt can be posted (this one is ${existing.receipt_status}).`);

      // Take the PO lock before any plain read: the transaction's snapshot must
      // start after a concurrent GRN / direct dispatch of the same PO committed.
      await inwardEntryRepository.lockPo(connection, existing.purchase_order_id);
      const saved = await inwardEntryRepository.findLines(connection, id);
      if (saved.length === 0) throw rejected('Add at least one line before posting.');
      const { po, lines } = await lockAndCheck(connection, existing.purchase_order_id, existing.company_id, saved.map((l) => ({
        purchase_order_item_id: l.purchase_order_item_id,
        received_quantity: String(Number(l.received_quantity)),
        width_inch: String(Number(l.width_inch)),
        supplier_lot_no: l.supplier_lot_no,
        remarks: l.remarks,
      })));

      const financialYear = financialYearFor(dateFor(existing.inward_date));
      await numberSeriesService.ensure(connection, LOT_SERIES.module, LOT_SERIES.prefix, financialYear);
      for (let i = 0; i < saved.length; i++) {
        const lotNo = await numberSeriesService.next(connection, LOT_SERIES.module, financialYear);
        await inwardEntryRepository.insertLot(connection, {
          company_id: po.company_id,
          lot_no: lotNo,
          financial_year: financialYear,
          inward_entry_id: id,
          inward_entry_item_id: saved[i].id,
          purchase_order_id: po.id,
          purchase_order_item_id: lines[i].purchase_order_item_id,
          supplier_id: po.supplier_id,
          product_id: lines[i].product_id,
          uom_id: lines[i].uom_id,
          unit: lines[i].unit,
          quantity: lines[i].received_quantity,
          width_inch: lines[i].width_inch,
          supplier_lot_no: lines[i].supplier_lot_no,
          received_date: String(existing.inward_date).slice(0, 10),
          created_by: userId,
        });
      }

      await inwardEntryRepository.setPosted(connection, id, userId);
      await inwardEntryService.recalculatePOStatus(connection, po.id);
    });
  },

  /**
   * draft/posted → cancelled. Lots of a posted GRN are cancelled with it; the
   * PO status follows. Not while a lot has a live quality inspection (QC takes
   * the GRN in share mode first, so the check cannot race an inspection).
   */
  cancel: async (id, userId) => {
    await inTransaction(async (connection) => {
      const existing = await inwardEntryRepository.lockHeader(connection, id);
      if (!existing) throw notFound();
      if (existing.entry_type !== 'grn') throw rejected('Legacy inward entries are read-only history.');
      if (existing.receipt_status === 'cancelled') throw rejected('This goods receipt is already cancelled.');

      await inwardEntryRepository.lockPo(connection, existing.purchase_order_id);
      const inspections = await inwardEntryRepository.countActiveInspections(connection, id);
      if (inspections > 0) {
        throw rejected(`${existing.inward_no} has ${inspections} quality inspection(s) on its lots. Cancel them first.`);
      }
      await inwardEntryRepository.setCancelled(connection, id, userId);
      if (existing.receipt_status === 'posted') {
        await inwardEntryRepository.cancelLots(connection, id, userId);
        await inwardEntryService.recalculatePOStatus(connection, existing.purchase_order_id);
      }
    });
  },

  /** Only a draft GRN can be deleted; posted receipts are cancelled, legacy entries are history. */
  delete: async (id) => {
    await inTransaction(async (connection) => {
      const existing = await inwardEntryRepository.lockHeader(connection, id);
      if (!existing) throw notFound();
      if (existing.entry_type !== 'grn' || existing.receipt_status !== 'draft') {
        throw rejected('Only a draft goods receipt can be deleted.');
      }
      await inwardEntryRepository.softDelete(connection, id);
    });
  },

  /**
   * Legacy QC on OLD inward entries only (integer passed/rejected). GRN
   * material is inspected per lot in the quality-control module.
   */
  approve: async (id, data, userId) => {
    await inTransaction(async (connection) => {
      const existing = await inwardEntryRepository.lockHeader(connection, id);
      if (!existing) throw notFound();
      if (existing.entry_type !== 'legacy_inward') {
        throw rejected('Goods receipts are inspected per lot in Quality Control.');
      }
      if (existing.status !== 'pending') throw rejected('Inward Entry has already been processed for QC.');

      const items = await inwardEntryRepository.findLines(connection, id);
      for (const item of data.items) {
        const existingItem = items.find((i) => i.id === item.id);
        if (!existingItem) continue;
        const passedQty = parseInt(item.passed_qty, 10) || 0;
        const rejectedQty = parseInt(item.rejected_qty, 10) || 0;
        if (passedQty + rejectedQty > existingItem.received_qty) {
          throw rejected(`Total QC quantity cannot exceed received quantity for item ${item.id}`);
        }
        await inwardEntryRepository.updateItemQC(connection, item.id, id, passedQty, rejectedQty, item.qc_remarks || null);
      }

      await connection.query(`
        UPDATE inward_entries SET status = ?, qc_inspected_by = ?, qc_inspected_at = NOW(), updated_by = ?, updated_at = NOW()
        WHERE id = ?
      `, [data.status || 'approved', userId, userId, id]);
      await inwardEntryService.recalculatePOStatus(connection, existing.purchase_order_id);
    });
  },

  /**
   * The one PO receiving-status rule. Only raised/partial/received POs are
   * touched (draft and cancelled stay as they are):
   *   nothing received → raised · some → partial · every line fully → received
   * Received = quantity on POSTED receipts (see RECEIVED_CONDITION).
   */
  recalculatePOStatus: async (connection, poId) => {
    const [[po]] = await connection.query('SELECT status FROM purchase_orders WHERE id = ?', [poId]);
    if (!po || !['raised', 'partial', 'received'].includes(po.status)) return;

    const [lines] = await connection.query(`
      SELECT COALESCE(poi.ordered_quantity, poi.qty) AS ordered,
             COALESCE((
               SELECT SUM(COALESCE(iei.received_quantity, iei.received_qty))
               FROM inward_entry_items iei
               JOIN inward_entries ie ON ie.id = iei.inward_entry_id
               WHERE iei.purchase_order_item_id = poi.id AND ${RECEIVED_CONDITION}
             ), 0) AS received
      FROM purchase_order_items poi
      WHERE poi.purchase_order_id = ?
    `, [poId]);

    const anyReceived = lines.some((l) => quantity.toMicro(l.received) > 0);
    const fullyReceived = lines.length > 0 && lines.every((l) => quantity.toMicro(l.received) >= quantity.toMicro(l.ordered));
    const next = fullyReceived ? 'received' : (anyReceived ? 'partial' : 'raised');
    if (next !== po.status) {
      await connection.query('UPDATE purchase_orders SET status = ?, updated_at = NOW() WHERE id = ?', [next, poId]);
    }
  },
};
