import { pool } from '../../config/database.js';
import { dispatchRepository } from './dispatch.repository.js';
import { inventoryRepository } from '../inventory/inventory.repository.js';
import { checkLot, nextMovementNo } from '../inventory/inventory.service.js';
import { inwardEntryRepository } from '../inward-entry/inward-entry.repository.js';
import { numberSeriesService, financialYearFor } from '../../services/number-series.service.js';
import { quantity } from '../../services/quantity.service.js';
import { companyScope } from '../../services/company-scope.service.js';

const DISPATCH_SERIES = { module: 'dispatch', prefix: 'DSP/' };
const STOCK = 'STOCK_DISPATCH';
const DIRECT = 'DIRECT_SUPPLIER_DISPATCH';
// Confirmed POs whose material the mill can still ship (same statuses receiving accepts).
const DIRECT_PO_STATUSES = ['raised', 'partial'];

const notFound = () => ({ status: 404, message: 'Dispatch not found' });
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
const micro = (v) => quantity.toMicro(v);
const fromMicro = (v) => quantity.fromMicro(v);

/** Transport / destination / reference fields, recorded as entered. */
const headerFields = (data) => ({
  destination_name: text(data.destination_name),
  destination_address: text(data.destination_address),
  transporter: text(data.transporter),
  vehicle_no: text(data.vehicle_no),
  document_reference: text(data.document_reference),
  invoice_reference: text(data.invoice_reference),
  remarks: text(data.remarks),
});

// ---------------- STOCK_DISPATCH ----------------

/** The order: confirmed, company-owned, in an active company. The buyer is always the order's. */
const checkOrder = async (executor, oc, companyId) => {
  if (!oc) throw rejected('Order not found.');
  if (oc.status !== 'confirmed') throw rejected(`Only a confirmed order can be dispatched (${oc.oc_num} is ${oc.status}).`);
  if (oc.company_id === null) throw rejected(`${oc.oc_num} has no company yet.`);
  if (!blank(companyId) && Number(companyId) !== oc.company_id) throw rejected(`${oc.oc_num} belongs to a different company.`);
  await companyScope.assertActiveCompany(oc.company_id, executor);
};

const checkLocation = async (executor, locationId, companyId) => {
  const location = await inventoryRepository.findLocation(executor, locationId);
  if (!location) throw rejected('Stock location not found.');
  if (location.company_id !== companyId) throw rejected(`Location ${location.code} belongs to a different company.`);
  if (location.status !== 'active') throw rejected(`Location ${location.code} is inactive.`);
  return location;
};

/**
 * Stock lines: finished production lots allocated to the order's items. Each
 * line needs the (item, lot) allocation and may dispatch only what is left of
 * it (allocated − already posted), and together never more than the lot holds
 * at the location. Product/UOM come from the lot. `lots` maps id → lot row
 * (locked when posting).
 */
const checkStockLines = async (executor, oc, location, lines, lots, excludeDispatchId = 0) => {
  const errors = [];
  const seen = new Set();
  const byLot = {};
  const output = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const label = `Line ${i + 1}`;
    if (blank(line.order_confirmation_item_id) || blank(line.lot_id)) {
      errors.push(`${label}: an order item and a finished lot are required`);
      continue;
    }
    const item = await dispatchRepository.findOrderItem(executor, oc.id, line.order_confirmation_item_id);
    if (!item) {
      errors.push(`${label}: the item does not belong to ${oc.oc_num}`);
      continue;
    }
    const lot = lots[line.lot_id];
    if (!lot) {
      errors.push(`${label}: lot not found`);
      continue;
    }
    const key = `${item.id}-${lot.id}`;
    if (seen.has(key)) {
      errors.push(`${label}: lot ${lot.lot_no} appears twice for the same item`);
      continue;
    }
    seen.add(key);
    if (lot.source_type !== 'production') {
      errors.push(`${label}: lot ${lot.lot_no} is not finished production output`);
      continue;
    }
    try {
      checkLot(lot);
    } catch (error) {
      errors.push(`${label}: ${error.message}`);
      continue;
    }
    if (lot.company_id !== oc.company_id) {
      errors.push(`${label}: lot ${lot.lot_no} belongs to a different company`);
      continue;
    }
    if (lot.product_id !== item.product_id) {
      errors.push(`${label}: lot ${lot.lot_no} is a different product than the order item`);
      continue;
    }
    const allocation = await dispatchRepository.findActiveAllocation(executor, item.id, lot.id);
    if (!allocation) {
      errors.push(`${label}: lot ${lot.lot_no} is not allocated to this order item`);
      continue;
    }
    const qtyError = quantity.validate(line.quantity, lot.uom_decimal_places, `${label}: quantity`);
    if (qtyError) {
      errors.push(qtyError);
      continue;
    }
    const dispatched = micro(await dispatchRepository.dispatchedOnAllocation(executor, item.id, lot.id, excludeDispatchId));
    const left = micro(allocation.quantity) - dispatched;
    if (micro(line.quantity) > left) {
      errors.push(`${label}: dispatching ${String(line.quantity).trim()} exceeds the ${fromMicro(Math.max(left, 0))}${lot.unit ? ` ${lot.unit}` : ''} of lot ${lot.lot_no} allocated to this item and not yet dispatched`);
      continue;
    }
    byLot[lot.id] = (byLot[lot.id] || 0) + micro(line.quantity);
    output.push({
      order_confirmation_item_id: item.id,
      lot_id: lot.id,
      purchase_order_item_id: null,
      product_id: lot.product_id,
      uom_id: lot.uom_id,
      unit: lot.unit,
      quantity: String(line.quantity).trim(),
      remarks: text(line.remarks),
    });
  }
  for (const [lotId, requested] of Object.entries(byLot)) {
    const totals = await inventoryRepository.lotTotals(executor, Number(lotId), location.id);
    const available = micro(totals.location_quantity);
    if (requested > available) {
      errors.push(`Lot ${lots[lotId].lot_no}: dispatching ${fromMicro(requested)} exceeds the ${fromMicro(Math.max(available, 0))}${lots[lotId].unit ? ` ${lots[lotId].unit}` : ''} in stock at ${location.code}`);
    }
  }
  if (errors.length > 0) throw rejected(`Dispatch lines are invalid: ${errors.join('; ')}`, errors);
  return output;
};

const readLots = async (executor, lines) => {
  const lots = {};
  for (const id of [...new Set(lines.map((l) => l.lot_id).filter((v) => !blank(v)).map(Number))]) {
    const [rows] = await executor.query(`
      SELECT l.*, ie.receipt_status, ie.entry_type, ie.deleted_at AS grn_deleted_at,
             p.company_id AS product_company_id, COALESCE(u.decimal_places, 0) AS uom_decimal_places
      FROM lots l
      LEFT JOIN inward_entries ie ON ie.id = l.inward_entry_id
      LEFT JOIN products p ON p.id = l.product_id
      LEFT JOIN uoms u ON u.id = l.uom_id
      WHERE l.id = ?`, [id]);
    if (rows[0]) lots[id] = rows[0];
  }
  return lots;
};

// ---------------- DIRECT_SUPPLIER_DISPATCH ----------------

/** A confirmed PO of an active company whose supplier (the mill) still exists and fits the company. */
const checkPo = async (executor, po, companyId) => {
  if (!po) throw rejected('Purchase order not found.');
  if (po.company_id === null) throw rejected(`${po.po_num} has no company yet.`);
  if (!blank(companyId) && Number(companyId) !== po.company_id) throw rejected(`${po.po_num} belongs to a different company.`);
  if (!DIRECT_PO_STATUSES.includes(po.status)) {
    throw rejected(`${po.po_num} is ${po.status}; only a confirmed purchase order with quantity outstanding can be direct-dispatched.`);
  }
  const supplier = await dispatchRepository.findSupplier(executor, po.supplier_id);
  if (!supplier || supplier.deleted_at) throw rejected(`The supplier of ${po.po_num} no longer exists.`);
  if (supplier.company_id !== null && supplier.company_id !== po.company_id) {
    throw rejected(`${supplier.company_name} belongs to a different company than ${po.po_num}.`);
  }
  await companyScope.assertActiveCompany(po.company_id, executor);
};

/**
 * Destination of a direct dispatch: the PO's order buyer when the PO was
 * raised from an order; otherwise an optional buyer usable by the company
 * and/or a named vendor destination.
 */
const directBuyer = async (executor, po, data) => {
  if (po.order_confirmation_id) {
    const oc = await dispatchRepository.findOrder(executor, po.order_confirmation_id);
    return oc ? oc.buyer_id : null;
  }
  if (blank(data.buyer_id)) {
    if (blank(data.destination_name)) throw rejected('Select a buyer or name the destination (customer / vendor).');
    return null;
  }
  const buyer = await dispatchRepository.findBuyer(executor, data.buyer_id);
  if (!buyer || buyer.deleted_at) throw rejected('The selected buyer does not exist.');
  if (buyer.company_id !== null && buyer.company_id !== po.company_id) throw rejected(`${buyer.company_name} belongs to a different company.`);
  return buyer.id;
};

/**
 * Direct lines: PO lines shipped by the mill. A PO line is fulfilled by GRN
 * receipt or by direct dispatch — together never above its ordered quantity
 * (pending = ordered − received − posted direct dispatch). Product/UOM come
 * from the PO line; the order item comes from the line's own OC link.
 */
const checkDirectLines = (po, poLines, lines) => {
  const errors = [];
  const byLine = Object.fromEntries(poLines.map((l) => [l.id, l]));
  const requested = {};
  const output = [];
  lines.forEach((line, index) => {
    const label = `Line ${index + 1}`;
    const pl = byLine[line.purchase_order_item_id];
    if (!pl) {
      errors.push(`${label}: the PO line does not belong to ${po.po_num}`);
      return;
    }
    if (!pl.product_id || pl.product_deleted_at) {
      errors.push(`${label}: ${pl.description || `PO line ${pl.id}`} has no product`);
      return;
    }
    const qtyError = quantity.validate(line.quantity, pl.uom_decimal_places, `${label}: quantity`);
    if (qtyError) {
      errors.push(qtyError);
      return;
    }
    requested[pl.id] = (requested[pl.id] || 0) + micro(line.quantity);
    output.push({
      order_confirmation_item_id: pl.order_confirmation_item_id || null,
      lot_id: null,
      purchase_order_item_id: pl.id,
      product_id: pl.product_id,
      uom_id: pl.uom_id,
      unit: pl.unit,
      quantity: String(line.quantity).trim(),
      remarks: text(line.remarks),
    });
  });
  for (const [lineId, qty] of Object.entries(requested)) {
    const pl = byLine[lineId];
    const pending = micro(pl.pending_quantity);
    if (qty > pending) {
      errors.push(`${pl.product_name}: dispatching ${fromMicro(qty)} exceeds the ${fromMicro(Math.max(pending, 0))}${pl.unit ? ` ${pl.unit}` : ''} of ${po.po_num} neither received nor dispatched`);
    }
  }
  if (errors.length > 0) throw rejected(`Dispatch lines are invalid: ${errors.join('; ')}`, errors);
  return output;
};

/** Validates a whole draft/posting of either type and returns the header + lines to store. */
const validate = async (executor, type, data, { oc, po, lots, excludeDispatchId = 0 }) => {
  if (type === STOCK) {
    await checkOrder(executor, oc, data.company_id);
    const location = await checkLocation(executor, data.location_id, oc.company_id);
    const lines = await checkStockLines(executor, oc, location, data.items, lots, excludeDispatchId);
    return { header: { company_id: oc.company_id, buyer_id: oc.buyer_id, order_confirmation_id: oc.id, purchase_order_id: null, supplier_id: null, location_id: location.id }, lines };
  }
  await checkPo(executor, po, data.company_id);
  const buyerId = await directBuyer(executor, po, data);
  const poLines = await inwardEntryRepository.findPoLines(executor, po.id);
  const lines = checkDirectLines(po, poLines, data.items);
  return { header: { company_id: po.company_id, buyer_id: buyerId, order_confirmation_id: null, purchase_order_id: po.id, supplier_id: po.supplier_id, location_id: null }, lines };
};

export const dispatchService = {
  /**
   * Form data: a company's dispatchable orders + locations (stock) or open
   * POs + buyers (direct); or, for one order, what each allocation can still
   * dispatch from a location; or, for one PO, its lines' remaining quantity.
   */
  formData: async ({ type, company_id: companyId, order_confirmation_id: ocId, location_id: locationId, purchase_order_id: poId }) => {
    if (type === STOCK && !blank(ocId)) {
      const oc = await dispatchRepository.findOrder(pool, ocId);
      if (!oc) throw { status: 404, message: 'Order not found' };
      const locations = oc.company_id ? (await inventoryRepository.findLocations({ company_id: oc.company_id, status: 'active', limit: 500 })).rows : [];
      const lines = await dispatchRepository.findDispatchable(oc.id, blank(locationId) ? null : Number(locationId));
      return { order: { id: oc.id, oc_num: oc.oc_num, status: oc.status, company_id: oc.company_id, buyer_id: oc.buyer_id }, locations, lines };
    }
    if (type === DIRECT && !blank(poId)) {
      const [[po]] = await pool.query(`
        SELECT po.id, po.po_num, po.status, po.company_id, po.supplier_id, po.order_confirmation_id, s.company_name AS supplier_name,
               oc.oc_num, b.company_name AS order_buyer_name
        FROM purchase_orders po LEFT JOIN suppliers s ON s.id = po.supplier_id
        LEFT JOIN order_confirmations oc ON oc.id = po.order_confirmation_id
        LEFT JOIN buyers b ON b.id = oc.buyer_id
        WHERE po.id = ? AND po.deleted_at IS NULL`, [poId]);
      if (!po) throw { status: 404, message: 'Purchase order not found' };
      const buyers = po.company_id ? await dispatchRepository.findBuyers(po.company_id) : [];
      return { purchase_order: po, lines: await inwardEntryRepository.findPoLines(pool, po.id), buyers };
    }
    const id = Number(companyId);
    if (!Number.isInteger(id) || id <= 0) throw rejected('company_id is required');
    if (type === DIRECT) return { purchase_orders: await dispatchRepository.findDirectDispatchPos(id), buyers: await dispatchRepository.findBuyers(id) };
    return { orders: await dispatchRepository.findDispatchableOrders(id), locations: (await inventoryRepository.findLocations({ company_id: id, status: 'active', limit: 500 })).rows };
  },

  /** Draft: validated against current records, reserves nothing (posting re-checks under lock). */
  create: async (data, userId) => inTransaction(async (connection) => {
    const type = data.dispatch_type;
    const oc = type === STOCK ? await dispatchRepository.findOrder(connection, data.order_confirmation_id) : null;
    const [[po]] = type === DIRECT ? await connection.query('SELECT * FROM purchase_orders WHERE id = ? AND deleted_at IS NULL', [data.purchase_order_id]) : [[null]];
    const lots = type === STOCK ? await readLots(connection, data.items) : {};
    const { header, lines } = await validate(connection, type, data, { oc, po, lots });

    const financialYear = financialYearFor(dateFor(data.dispatch_date));
    await numberSeriesService.ensure(connection, DISPATCH_SERIES.module, DISPATCH_SERIES.prefix, financialYear);
    const dispatchNo = await numberSeriesService.next(connection, DISPATCH_SERIES.module, financialYear);
    const id = await dispatchRepository.insertHeader(connection, {
      ...header,
      dispatch_no: dispatchNo,
      financial_year: financialYear,
      dispatch_date: data.dispatch_date,
      dispatch_type: type,
      ...headerFields(data),
      user_id: userId,
    });
    await dispatchRepository.replaceItems(connection, id, lines);
    return id;
  }),

  /** Draft only; type, company, order / PO are fixed once created. */
  update: async (id, data, userId) => {
    await inTransaction(async (connection) => {
      const existing = await dispatchRepository.lock(connection, id);
      if (!existing) throw notFound();
      if (existing.status !== 'draft') throw rejected(`A ${existing.status} dispatch cannot be edited.`);
      if (!blank(data.company_id) && Number(data.company_id) !== existing.company_id) throw rejected('The company of a dispatch cannot be changed.');
      const merged = {
        ...data,
        company_id: existing.company_id,
        location_id: existing.dispatch_type === STOCK ? data.location_id : null,
      };
      const oc = existing.dispatch_type === STOCK ? await dispatchRepository.findOrder(connection, existing.order_confirmation_id) : null;
      const [[po]] = existing.dispatch_type === DIRECT ? await connection.query('SELECT * FROM purchase_orders WHERE id = ? AND deleted_at IS NULL', [existing.purchase_order_id]) : [[null]];
      const lots = existing.dispatch_type === STOCK ? await readLots(connection, data.items) : {};
      const { header, lines } = await validate(connection, existing.dispatch_type, merged, { oc, po, lots, excludeDispatchId: existing.id });
      await dispatchRepository.updateHeader(connection, id, {
        dispatch_date: data.dispatch_date,
        buyer_id: header.buyer_id,
        location_id: header.location_id,
        ...headerFields(data),
        user_id: userId,
      });
      await dispatchRepository.replaceItems(connection, id, lines);
    });
  },

  /**
   * draft → posted. Locks first — the dispatch and its lines, then the order
   * and every lot (stock; ascending ids) or the PO and its lines (direct, the
   * order GRN posting uses) — re-validates, then: stock lines each write one
   * DISPATCH OUT movement; direct lines write none (the material never entered
   * ERP stock). Posting twice fails on status and, for stock lines, on the
   * movement's unique key.
   */
  post: async (id, userId) => {
    try {
      await inTransaction(async (connection) => {
        const existing = await dispatchRepository.lock(connection, id);
        if (!existing) throw notFound();
        if (existing.status !== 'draft') throw rejected(`Only a draft dispatch can be posted (this one is ${existing.status}).`);
        const saved = await dispatchRepository.lockItems(connection, id);
        if (saved.length === 0) throw rejected('Add at least one line before posting.');
        const data = {
          company_id: existing.company_id,
          location_id: existing.location_id,
          buyer_id: existing.buyer_id,
          destination_name: existing.destination_name,
          items: saved.map((l) => ({
            order_confirmation_item_id: l.order_confirmation_item_id, lot_id: l.lot_id,
            purchase_order_item_id: l.purchase_order_item_id, quantity: String(Number(l.quantity)), remarks: l.remarks,
          })),
        };

        if (existing.dispatch_type === STOCK) {
          const oc = await dispatchRepository.findOrder(connection, existing.order_confirmation_id, { lock: true });
          const lots = {};
          for (const lotId of [...new Set(saved.map((l) => l.lot_id))].sort((a, b) => a - b)) {
            const lot = await inventoryRepository.lockLot(connection, lotId);
            if (lot) lots[lot.id] = lot;
          }
          await validate(connection, STOCK, data, { oc, lots, excludeDispatchId: existing.id });
          for (const line of saved) {
            const lot = lots[line.lot_id];
            const { financialYear, movementNo } = await nextMovementNo(connection, existing.dispatch_date);
            await inventoryRepository.insertMovement(connection, {
              company_id: existing.company_id,
              movement_no: movementNo,
              financial_year: financialYear,
              movement_date: String(existing.dispatch_date).slice(0, 10),
              movement_type: 'DISPATCH',
              direction: 'out',
              location_id: existing.location_id,
              lot_id: lot.id,
              product_id: lot.product_id,
              uom_id: lot.uom_id,
              unit: lot.unit,
              quantity: String(Number(line.quantity)),
              source_type: 'dispatch',
              dispatch_item_id: line.id,
              reason: null,
              remarks: text(existing.destination_name),
              created_by: userId,
            });
          }
        } else {
          const po = await inwardEntryRepository.lockPo(connection, existing.purchase_order_id);
          if (po) await inwardEntryRepository.lockPoLines(connection, po.id);
          await validate(connection, DIRECT, data, { po });
        }
        await dispatchRepository.setPosted(connection, id, userId);
      });
    } catch (error) {
      if (error && error.code === 'ER_DUP_ENTRY' && /dispatch_item/.test(error.message)) {
        throw rejected('This dispatch is already posted.');
      }
      throw error;
    }
  },

  /** Drafts only: a posted dispatch is history (and, for stock, in the immutable ledger). */
  cancel: async (id, reason, userId) => {
    await inTransaction(async (connection) => {
      const existing = await dispatchRepository.lock(connection, id);
      if (!existing) throw notFound();
      if (existing.status === 'cancelled') throw rejected('This dispatch is already cancelled.');
      if (existing.status !== 'draft') throw rejected('A posted dispatch cannot be cancelled: there is no reversal yet.');
      await dispatchRepository.setCancelled(connection, id, text(reason), userId);
    });
  },
};
