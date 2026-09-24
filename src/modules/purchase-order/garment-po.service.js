import { pool } from '../../config/database.js';
import { garmentPoRepository } from './garment-po.repository.js';
import { purchaseOrderRepository } from './purchase-order.repository.js';
import { companyScope } from '../../services/company-scope.service.js';
import { numberSeriesService, financialYearFor } from '../../services/number-series.service.js';
import { quantity } from '../../services/quantity.service.js';

export const GARMENT_ORIGINS = ['material_requirement', 'material_plan'];

// Same series and format as every other PO (GT/PO/NNN/FY) — one global numbering.
const PO_SERIES = { module: 'po', prefix: 'GT/PO/' };

const notFound = () => ({ status: 404, message: 'Purchase Order not found' });
const rejected = (message) => ({ status: 422, message });

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

const roundMoney = (n) => Math.round(n * 100) / 100;

const headerPayload = (data) => ({
  supplier_id: Number(data.supplier_id),
  po_date: data.po_date,
  dispatch_date: data.dispatch_date || null,
  delivery_details: data.delivery_details || null,
  packing_details: data.packing_details || null,
  remarks: data.remarks || null,
});

/** Supplier must exist, be an active supplier-side party, and be the PO company's own or shared. */
const checkSupplier = async (executor, supplierId, companyId, currentSupplierId = null) => {
  const supplier = await garmentPoRepository.findSupplier(executor, supplierId);
  if (!supplier) throw rejected('Selected supplier does not exist.');
  if (!['supplier', 'both'].includes(supplier.party_type)) throw rejected(`${supplier.company_name} is not a supplier.`);
  if (supplier.status !== 'active' && supplier.id !== currentSupplierId) throw rejected(`${supplier.company_name} is inactive.`);
  if (supplier.company_id !== null && supplier.company_id !== companyId) {
    throw rejected(`${supplier.company_name} belongs to a different company.`);
  }
};

/**
 * Validates garment PO lines and returns them in insertable form. Runs inside
 * a transaction; locks the requirement rows so concurrent POs serialise.
 *
 * Available quantity excludes this PO's own current lines (so editing a PO
 * does not count its own quantity twice):
 *   requirement: required − ordered − reserved (+ own)
 *   plan item:   planned  − ordered − reserved (+ own)   [material_plan origin]
 */
const checkLines = async (connection, po, lines, poId = null) => {
  const errors = [];
  const isPlan = po.origin === 'material_plan';

  let planItems = [];
  if (isPlan) {
    planItems = await garmentPoRepository.findPlanItems(connection, lines.map((l) => l.material_plan_item_id));
  }
  const planItemById = Object.fromEntries(planItems.map((i) => [i.id, i]));

  // Resolve each line's requirement (a plan line takes its plan item's requirement).
  const resolved = lines.map((l) => ({
    ...l,
    material_requirement_id: isPlan ? planItemById[l.material_plan_item_id]?.material_requirement_id : l.material_requirement_id,
  }));
  const requirementIds = [...new Set(resolved.map((l) => l.material_requirement_id).filter(Boolean))];
  await garmentPoRepository.lockRequirements(connection, requirementIds);
  const requirements = await garmentPoRepository.findRequirements(connection, requirementIds);
  const reqById = Object.fromEntries(requirements.map((r) => [r.id, r]));

  const own = poId ? await garmentPoRepository.findOwnLines(connection, poId) : [];
  const ownByReq = {};
  const ownByPlanItem = {};
  for (const o of own) {
    ownByReq[o.material_requirement_id] = (ownByReq[o.material_requirement_id] || 0) + quantity.toMicro(o.ordered_quantity);
    if (o.material_plan_item_id) ownByPlanItem[o.material_plan_item_id] = quantity.toMicro(o.ordered_quantity);
  }

  // Several plan lines cannot share a requirement within one PO (validator
  // prevents duplicates), but a requirement's total across this PO still
  // has to fit — tracked here.
  const usedByReq = {};

  const output = [];
  resolved.forEach((line, index) => {
    const label = `Line ${index + 1}`;
    let planItem = null;
    if (isPlan) {
      planItem = planItemById[line.material_plan_item_id];
      if (!planItem || planItem.material_plan_id !== po.material_plan_id) {
        errors.push(`${label}: plan line does not belong to the selected material plan`);
        return;
      }
    }
    const r = reqById[line.material_requirement_id];
    if (!r) {
      errors.push(`${label}: material requirement does not exist`);
      return;
    }
    const name = `${r.requirement_no} (${r.product_name})`;
    if (r.company_id !== po.company_id) {
      errors.push(`${label}: ${name} belongs to a different company`);
      return;
    }
    if (r.status === 'closed') {
      errors.push(`${label}: ${name} is closed`);
      return;
    }
    if (!r.product_id || r.product_deleted_at || r.product_status !== 'active') {
      errors.push(`${label}: product of ${name} is inactive or deleted`);
      return;
    }
    if (r.product_company_id !== po.company_id) {
      errors.push(`${label}: product of ${name} belongs to a different company`);
      return;
    }
    if (!r.product_uom_id || r.product_uom_id !== r.line_uom_id) {
      errors.push(`${label}: the UOM of ${r.product_name} no longer matches its projection line`);
      return;
    }
    const qtyError = quantity.validate(line.ordered_quantity, r.uom_decimal_places, `${label}: quantity`);
    if (qtyError) {
      errors.push(qtyError);
      return;
    }
    const qty = quantity.toMicro(line.ordered_quantity);

    const reqAvailable = quantity.toMicro(r.remaining_quantity) + (ownByReq[r.id] || 0) - (usedByReq[r.id] || 0);
    if (qty > reqAvailable) {
      errors.push(`${label}: ${name} — ${quantity.fromMicro(qty)} exceeds the ${quantity.fromMicro(Math.max(reqAvailable, 0))} ${r.uom_code} remaining on the requirement`);
      return;
    }
    if (planItem) {
      const planAvailable = quantity.toMicro(planItem.remaining_quantity) + (ownByPlanItem[planItem.id] || 0);
      if (qty > planAvailable) {
        errors.push(`${label}: ${name} — ${quantity.fromMicro(qty)} exceeds the ${quantity.fromMicro(Math.max(planAvailable, 0))} ${r.uom_code} remaining on the plan line`);
        return;
      }
    }
    usedByReq[r.id] = (usedByReq[r.id] || 0) + qty;

    const costPrice = line.cost_price === null || line.cost_price === undefined || line.cost_price === '' ? null : Number(line.cost_price);
    output.push({
      line_id: line.line_id,
      material_requirement_id: r.id,
      material_plan_item_id: planItem ? planItem.id : null,
      product_id: r.product_id,
      unit: r.uom_code, // derived from the product's (= projection line's) UOM
      ordered_quantity: String(line.ordered_quantity).trim(),
      cost_price: costPrice,
      amount: costPrice === null ? 0 : roundMoney(quantity.fromMicro(qty) * costPrice),
      remarks: line.remarks || null,
    });
  });

  if (errors.length > 0) {
    const err = rejected(`Purchase order lines are invalid: ${errors.join('; ')}`);
    err.errors = errors;
    throw err;
  }
  return output;
};

/** The source (company, origin, plan) must still be valid — plans must be 'planned'. */
const checkSource = async (executor, po) => {
  if (po.origin === 'material_plan') {
    const plan = await garmentPoRepository.findPlan(executor, po.material_plan_id);
    if (!plan) throw rejected('Selected material plan does not exist.');
    if (plan.company_id !== po.company_id) throw rejected('Selected material plan belongs to a different company.');
    if (plan.status !== 'planned') throw rejected(`Material plan ${plan.plan_no} is ${plan.status}; only a planned material plan can be ordered from.`);
  }
};

export const garmentPoService = {
  isGarment: (po) => GARMENT_ORIGINS.includes(po?.origin),

  /** Form data: suppliers usable by the company, plus requirements or a plan's lines with availability. */
  getSources: async ({ companyId, origin, planId, poId }) => {
    const suppliers = await garmentPoRepository.getSuppliersForCompany(companyId);
    const own = poId ? await garmentPoRepository.findOwnLines(pool, poId) : [];
    const ownByReq = Object.fromEntries(own.map((o) => [o.material_requirement_id, Number(o.ordered_quantity)]));
    const ownByPlanItem = Object.fromEntries(own.filter((o) => o.material_plan_item_id).map((o) => [o.material_plan_item_id, Number(o.ordered_quantity)]));

    // "remaining" shown to the form includes this PO's own quantity back.
    const withOwn = (r) => ({ ...r, remaining_quantity: Number(r.remaining_quantity) + (ownByReq[r.id] || 0) });

    if (origin === 'material_plan') {
      const plans = await garmentPoRepository.getPlansForCompany(companyId);
      if (!planId) return { suppliers, plans, lines: [] };
      const plan = await garmentPoRepository.findPlan(pool, planId);
      if (!plan || plan.company_id !== companyId) throw rejected('Selected material plan does not belong to this company.');
      const items = await garmentPoRepository.findPlanItems(pool, await garmentPoRepository.getPlanItemIds(planId));
      const reqs = await garmentPoRepository.findRequirements(pool, items.map((i) => i.material_requirement_id));
      const reqById = Object.fromEntries(reqs.map((r) => [r.id, withOwn(r)]));
      const lines = items.map((i) => {
        const r = reqById[i.material_requirement_id] || {};
        const planRemaining = Number(i.remaining_quantity) + (ownByPlanItem[i.id] || 0);
        return {
          material_plan_item_id: i.id,
          material_requirement_id: i.material_requirement_id,
          requirement_no: r.requirement_no,
          requirement_status: r.status,
          projection_no: r.projection_no,
          brand_name: r.brand_name,
          product_name: r.product_name,
          uom_code: r.uom_code,
          uom_decimal_places: r.uom_decimal_places,
          required_quantity: r.required_quantity,
          planned_quantity: i.planned_quantity,
          ordered_quantity: i.ordered_quantity,
          reserved_quantity: i.reserved_quantity,
          // what can still be ordered on this plan line (never more than the requirement allows)
          remaining_quantity: Math.min(planRemaining, Number(r.remaining_quantity ?? 0)),
        };
      });
      return { suppliers, plans, lines };
    }

    const requirements = (await garmentPoRepository.getRequirementsForCompany(companyId)).map(withOwn);
    return { suppliers, requirements };
  },

  create: async (data, userId) => {
    const id = await inTransaction(async (connection) => {
      const po = {
        company_id: await companyScope.assertActiveCompany(data.company_id, connection),
        origin: data.origin,
        material_plan_id: data.origin === 'material_plan' ? Number(data.material_plan_id) : null,
      };
      await checkSource(connection, po);
      const header = headerPayload(data);
      await checkSupplier(connection, header.supplier_id, po.company_id);
      const lines = await checkLines(connection, po, data.items);

      const financialYear = financialYearFor();
      await numberSeriesService.ensure(connection, PO_SERIES.module, PO_SERIES.prefix, financialYear);
      const number = await numberSeriesService.nextNumber(connection, PO_SERIES.module, financialYear);

      const poId = await garmentPoRepository.insertHeader(connection, {
        ...po, ...header,
        po_num: `${PO_SERIES.prefix}${number}/${financialYear}`,
        financial_year: financialYear,
        created_by: userId,
        updated_by: userId,
      });
      await garmentPoRepository.insertLines(connection, poId, lines);
      return poId;
    });
    return purchaseOrderRepository.findById(id);
  },

  /**
   * Draft: header and lines are editable (same company/origin/plan).
   * Raised (confirmed): only dates/notes and each existing line's quantity,
   * price and remarks — no supplier, company, source or product changes.
   */
  update: async (id, data, userId) => {
    await inTransaction(async (connection) => {
      const existing = await garmentPoRepository.lockPo(connection, id);
      if (!existing) throw notFound();
      if (!GARMENT_ORIGINS.includes(existing.origin)) throw rejected('Not a planning purchase order.');
      if (!['draft', 'raised'].includes(existing.status)) {
        throw rejected(`A ${existing.status} purchase order cannot be edited.`);
      }

      const header = headerPayload(data);
      const confirmed = existing.status === 'raised';

      if (confirmed) {
        if (header.supplier_id !== existing.supplier_id) throw rejected('The supplier of a confirmed purchase order cannot be changed.');
        const own = await garmentPoRepository.findOwnLines(connection, id);
        const key = (l) => (existing.origin === 'material_plan' ? `p${l.material_plan_item_id}` : `r${l.material_requirement_id}`);
        const ownByKey = Object.fromEntries(own.map((l) => [key(l), l]));
        const sameSources = data.items.length === own.length && data.items.every((l) => ownByKey[key(l)]);
        if (!sameSources) {
          throw rejected('Lines of a confirmed purchase order cannot be added, removed or re-sourced — only quantity, price and remarks can change.');
        }
        const lines = await checkLines(connection, existing, data.items.map((l) => ({ ...l, line_id: ownByKey[key(l)].id })), id);
        await garmentPoRepository.updateHeader(connection, id, { ...header, updated_by: userId });
        for (const line of lines) await garmentPoRepository.updateLine(connection, line.line_id, line);
        return;
      }

      await checkSource(connection, existing);
      await checkSupplier(connection, header.supplier_id, existing.company_id, existing.supplier_id);
      const lines = await checkLines(connection, existing, data.items, id);
      await garmentPoRepository.updateHeader(connection, id, { ...header, updated_by: userId });
      await garmentPoRepository.deleteLines(connection, id);
      await garmentPoRepository.insertLines(connection, id, lines);
    });
    return purchaseOrderRepository.findById(id);
  },

  /** draft → raised. Garment POs are fully re-validated first. */
  confirm: async (id, userId) => {
    await inTransaction(async (connection) => {
      const existing = await garmentPoRepository.lockPo(connection, id);
      if (!existing) throw notFound();
      if (existing.status !== 'draft') throw rejected('Only a draft purchase order can be confirmed.');

      const own = await garmentPoRepository.findOwnLines(connection, id);
      if (own.length === 0) throw rejected('Add at least one line before confirming.');
      if (GARMENT_ORIGINS.includes(existing.origin)) {
        await checkSource(connection, existing);
        await checkSupplier(connection, existing.supplier_id, existing.company_id, existing.supplier_id);
        await checkLines(connection, existing, own.map((l) => ({ ...l, ordered_quantity: String(Number(l.ordered_quantity)) })), id);
      }
      await garmentPoRepository.setConfirmed(connection, id, userId);
    });
    return purchaseOrderRepository.findById(id);
  },

  /** draft/raised → cancelled, only while nothing has been received against it. */
  cancel: async (id, userId) => {
    await inTransaction(async (connection) => {
      const existing = await garmentPoRepository.lockPo(connection, id);
      if (!existing) throw notFound();
      if (!['draft', 'raised'].includes(existing.status)) {
        throw rejected(`A ${existing.status} purchase order cannot be cancelled.`);
      }
      if (await garmentPoRepository.countInwardEntries(connection, id) > 0) {
        throw rejected('Goods have been recorded against this purchase order, so it cannot be cancelled.');
      }
      if (await garmentPoRepository.countDispatches(connection, id) > 0) {
        throw rejected('Direct dispatches exist for this purchase order, so it cannot be cancelled.');
      }
      await garmentPoRepository.setCancelled(connection, id, userId);
    });
    return purchaseOrderRepository.findById(id);
  },
};
