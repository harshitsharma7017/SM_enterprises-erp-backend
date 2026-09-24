import { pool } from '../../config/database.js';
import { orderFulfilmentRepository } from './order-fulfilment.repository.js';
import { orderConfirmationRepository } from './order-confirmation.repository.js';
import { findProductionSource } from '../lot/lot.repository.js';
import { quantity } from '../../services/quantity.service.js';
import { companyScope } from '../../services/company-scope.service.js';

const rejected = (message) => ({ status: 422, message });
const notFound = () => ({ status: 404, message: 'Order Confirmation not found' });

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

const blank = (v) => v === undefined || v === null || String(v).trim() === '';
const micro = (v) => quantity.toMicro(v);
const fromMicro = (v) => quantity.fromMicro(v);
const sameUnit = (a, b) => String(a || '').trim().toUpperCase() === String(b || '').trim().toUpperCase();

/**
 * Per-item figures. Only basic relationships of recorded quantities — no
 * business formula:
 *   pending     = ordered − dispatched (still owed to the customer; the
 *                 project's "ordered − received" convention), never < 0
 *   to_produce  = ordered − produced, never < 0
 * Fulfilment follows dispatch; production status follows allocations.
 */
const itemFigures = (item, dispatched) => {
  const ordered = micro(item.ordered_quantity);
  const produced = micro(item.produced_quantity);
  const shipped = micro(dispatched || 0);
  return {
    ...item,
    dispatched_quantity: fromMicro(shipped),
    pending_quantity: fromMicro(Math.max(ordered - shipped, 0)),
    to_produce_quantity: fromMicro(Math.max(ordered - produced, 0)),
    production_status: produced <= 0 ? 'not_produced' : (produced >= ordered ? 'produced' : 'partially_produced'),
    fulfilment_status: shipped <= 0 ? 'open' : (shipped >= ordered ? 'fulfilled' : 'partially_fulfilled'),
  };
};

/**
 * The order's lifecycle status: its stored status (draft / sent / cancelled)
 * or, once confirmed, its fulfilment — open until something is dispatched.
 */
export const orderStatusOf = (status, items) => {
  if (status !== 'confirmed') return status;
  if (items.length > 0 && items.every((i) => i.fulfilment_status === 'fulfilled')) return 'fulfilled';
  if (items.some((i) => i.fulfilment_status !== 'open')) return 'partially_fulfilled';
  return 'open';
};

export const orderFulfilmentService = {
  /** Order list rows + derived status and production progress. */
  decorateList: async (rows) => {
    const summaries = await orderFulfilmentRepository.findSummaries(rows.map((r) => r.id));
    const byId = Object.fromEntries(summaries.map((s) => [s.order_confirmation_id, s]));
    return rows.map((row) => {
      const s = byId[row.id] || { items_count: 0, allocated_items_count: 0, produced_items_count: 0 };
      return {
        ...row,
        // No dispatch exists yet, so a confirmed order is open.
        order_status: row.status === 'confirmed' ? 'open' : row.status,
        items_count: Number(s.items_count),
        allocated_items_count: Number(s.allocated_items_count),
        produced_items_count: Number(s.produced_items_count),
      };
    });
  },

  /**
   * Full fulfilment of one order: per item ordered / produced / dispatched /
   * pending / to produce and statuses; its production allocations with the
   * full production trace; and the company's finished stock of each product.
   */
  fulfilment: async (ocId) => {
    const oc = await orderConfirmationRepository.findById(ocId);
    if (!oc) throw notFound();
    const rawItems = await orderFulfilmentRepository.findItems(ocId);
    const dispatched = await orderFulfilmentRepository.dispatchedByItem(rawItems.map((i) => i.id));
    const items = rawItems.map((i) => itemFigures(i, dispatched[i.id]));

    const allocations = await orderFulfilmentRepository.findAllocations('a.order_confirmation_id = ?', [ocId]);
    const traces = {};
    for (const id of [...new Set(allocations.map((a) => a.processing_record_id))]) {
      traces[id] = await findProductionSource(id);
    }

    const productIds = [...new Set(items.map((i) => i.product_id).filter(Boolean))];
    const lots = oc.company_id ? await orderFulfilmentRepository.findFinishedLots(oc.company_id, productIds) : [];
    const finished = productIds.map((productId) => {
      const productLots = lots.filter((l) => l.product_id === productId);
      return {
        product_id: productId,
        stock_quantity: fromMicro(productLots.reduce((sum, l) => sum + micro(l.stock_quantity), 0)),
        allocatable_quantity: fromMicro(productLots.reduce((sum, l) => sum + Math.max(micro(l.allocatable_quantity), 0), 0)),
        lots: productLots,
      };
    });

    return {
      order_confirmation_id: oc.id,
      oc_num: oc.oc_num,
      company_id: oc.company_id,
      status: oc.status,
      order_status: orderStatusOf(oc.status, items),
      items,
      allocations: allocations.map((a) => ({ ...a, production: traces[a.processing_record_id] })),
      finished_stock: finished,
    };
  },

  /** Finished lots that could be allocated to one order item (same company and product, quantity left). */
  allocationFormData: async (ocId, itemId) => {
    const oc = await orderConfirmationRepository.findById(ocId);
    if (!oc) throw notFound();
    const item = await orderFulfilmentRepository.findItem(pool, ocId, itemId);
    if (!item) throw rejected('The item does not belong to this order.');
    if (!item.product_id || !oc.company_id) return { item, lots: [] };
    const lots = await orderFulfilmentRepository.findFinishedLots(oc.company_id, [item.product_id]);
    return { item, lots: lots.filter((l) => micro(l.allocatable_quantity) > 0) };
  },

  /**
   * Allocates finished production output (a Phase 9 lot) to an item of a
   * CONFIRMED order. Explicit and manual — no allocation rule is defined.
   * Lock order: order, then lot; every read after both locks. A lot's active
   * allocations never exceed its produced quantity (across all orders).
   */
  allocate: async (ocId, data, userId) => inTransaction(async (connection) => {
    const oc = await orderFulfilmentRepository.lockOrder(connection, ocId);
    if (!oc) throw notFound();
    const lot = await orderFulfilmentRepository.lockLot(connection, data.lot_id);
    if (oc.status !== 'confirmed') throw rejected(`Production can only be allocated to a confirmed order (${oc.oc_num} is ${oc.status}).`);
    if (oc.company_id === null) throw rejected(`${oc.oc_num} has no company yet.`);
    const item = await orderFulfilmentRepository.findItem(connection, oc.id, data.order_confirmation_item_id);
    if (!item) throw rejected('The item does not belong to this order.');
    if (!item.product_id) throw rejected('The order item has no product, so production cannot be allocated to it.');

    if (!lot) throw rejected('Lot not found.');
    if (lot.source_type !== 'production') throw rejected(`Lot ${lot.lot_no} is not finished production output.`);
    if (lot.status !== 'received') throw rejected(`Lot ${lot.lot_no} is ${lot.status}.`);
    if (lot.company_id !== oc.company_id) throw rejected(`Lot ${lot.lot_no} belongs to a different company than ${oc.oc_num}.`);
    if (lot.product_id !== item.product_id) throw rejected(`Lot ${lot.lot_no} is a different product than the order item.`);
    if (!blank(item.unit) && !sameUnit(item.unit, lot.unit)) {
      throw rejected(`Lot ${lot.lot_no} is in ${lot.unit}, the order item in ${item.unit}; no unit conversion is applied.`);
    }
    await companyScope.assertActiveCompany(oc.company_id, connection);

    const error = quantity.validate(data.quantity, lot.uom_decimal_places, 'Allocation quantity');
    if (error) throw rejected(error);
    if (await orderFulfilmentRepository.findActiveAllocation(connection, item.id, lot.id)) {
      throw rejected(`Lot ${lot.lot_no} is already allocated to this item; cancel that allocation to change it.`);
    }
    const allocatable = micro(lot.quantity) - micro(await orderFulfilmentRepository.allocatedOnLot(connection, lot.id));
    if (micro(data.quantity) > allocatable) {
      throw rejected(`Allocating ${String(data.quantity).trim()} exceeds the ${fromMicro(Math.max(allocatable, 0))}${lot.unit ? ` ${lot.unit}` : ''} of lot ${lot.lot_no} not yet allocated.`);
    }

    return orderFulfilmentRepository.insert(connection, {
      company_id: oc.company_id,
      order_confirmation_id: oc.id,
      order_confirmation_item_id: item.id,
      processing_record_id: lot.processing_record_id,
      lot_id: lot.id,
      product_id: lot.product_id,
      uom_id: lot.uom_id,
      unit: lot.unit,
      quantity: String(data.quantity).trim(),
      remarks: blank(data.remarks) ? null : String(data.remarks).trim(),
      created_by: userId,
    });
  }),

  /** active → cancelled (history kept); frees the lot's quantity. */
  cancelAllocation: async (ocId, allocationId, reason, userId) => inTransaction(async (connection) => {
    const oc = await orderFulfilmentRepository.lockOrder(connection, ocId);
    if (!oc) throw notFound();
    const allocation = await orderFulfilmentRepository.lockAllocation(connection, allocationId);
    if (!allocation || allocation.order_confirmation_id !== oc.id) throw { status: 404, message: 'Allocation not found' };
    if (allocation.status !== 'active') throw rejected('This allocation is already cancelled.');
    await orderFulfilmentRepository.setCancelled(connection, allocation.id, blank(reason) ? null : String(reason).trim(), userId);
  }),
};
