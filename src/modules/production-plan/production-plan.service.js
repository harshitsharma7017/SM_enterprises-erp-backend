import { pool } from '../../config/database.js';
import { companyScope } from '../../services/company-scope.service.js';
import { numberSeriesService, financialYearFor } from '../../services/number-series.service.js';
import { quantity } from '../../services/quantity.service.js';
import { productionPlanRepository } from './production-plan.repository.js';

/**
 * Production plans (requirement 12). Lifecycle:
 *   draft → planned        lines frozen; processing can be booked against them
 *   planned → draft        only while no processing is booked
 *   planned → completed    closed by hand — no produced-vs-planned rule is enforced
 *   draft/planned → cancelled   only while no processing is booked
 *   draft → deleted
 * Produced / pending quantities are derived (see the repository); nothing here
 * reserves stock or material.
 */
const SERIES = { module: 'production_plan', prefix: 'PP/' };
const notFound = () => ({ status: 404, message: 'Production plan not found' });
const rejected = (message, errors) => ({ status: 422, message, errors });
const blank = (v) => v === undefined || v === null || String(v).trim() === '';
const DATE = /^\d{4}-\d{2}-\d{2}$/;

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

const header = (data) => {
  const errors = [];
  const title = blank(data.title) ? '' : String(data.title).trim();
  if (!title) errors.push('Title is required');
  else if (title.length > 200) errors.push('Title cannot exceed 200 characters');
  if (blank(data.plan_date) || !DATE.test(String(data.plan_date))) errors.push('Plan date is required (YYYY-MM-DD)');
  const target = blank(data.target_date) ? null : String(data.target_date);
  if (target && !DATE.test(target)) errors.push('Target date must be YYYY-MM-DD');
  if (target && !blank(data.plan_date) && target < String(data.plan_date)) errors.push('The target date cannot be before the plan date.');
  const remarks = blank(data.remarks) ? null : String(data.remarks).trim();
  if (remarks && remarks.length > 2000) errors.push('Remarks cannot exceed 2000 characters');
  return { errors, value: { title, plan_date: data.plan_date, target_date: target, remarks } };
};

/** Each line: an active product of the company, a planned quantity in its UOM, optionally the confirmed order line it is for. */
const checkLines = async (executor, companyId, lines) => {
  const errors = [];
  const out = [];
  if (!Array.isArray(lines) || lines.length === 0) {
    return { errors: ['Add at least one product to produce.'], lines: out };
  }
  for (const [i, line] of lines.entries()) {
    const label = `Line ${i + 1}`;
    const [[product]] = await executor.query(`
      SELECT p.id, p.name, p.company_id, p.status, p.deleted_at, p.uom_id, u.code AS uom_code, COALESCE(u.decimal_places, 0) AS decimals
      FROM products p LEFT JOIN uoms u ON u.id = p.uom_id WHERE p.id = ?`, [Number(line.product_id) || 0]);
    if (!product || product.deleted_at) {
      errors.push(`${label}: select a product`);
      continue;
    }
    if (product.company_id !== companyId) {
      errors.push(`${label}: ${product.name} belongs to a different company`);
      continue;
    }
    if (product.status !== 'active') errors.push(`${label}: ${product.name} is inactive`);
    if (!product.uom_id) errors.push(`${label}: ${product.name} has no UOM`);
    const qtyError = quantity.validate(line.planned_quantity, product.decimals, `${label}: planned quantity`);
    if (qtyError) errors.push(qtyError);
    let orderItemId = null;
    if (!blank(line.order_confirmation_item_id)) {
      const [[item]] = await executor.query(`
        SELECT oci.id, oci.product_id, oc.oc_num, oc.status, oc.company_id FROM order_confirmation_items oci
        JOIN order_confirmations oc ON oc.id = oci.order_confirmation_id WHERE oci.id = ? AND oc.deleted_at IS NULL`, [Number(line.order_confirmation_item_id) || 0]);
      if (!item) errors.push(`${label}: order line not found`);
      else if (item.company_id !== companyId) errors.push(`${label}: ${item.oc_num} belongs to a different company`);
      else if (item.status !== 'confirmed') errors.push(`${label}: ${item.oc_num} is ${item.status}; only a confirmed order can be planned for`);
      else if (item.product_id !== product.id) errors.push(`${label}: the order line is a different product`);
      else orderItemId = item.id;
    }
    const remarks = blank(line.remarks) ? null : String(line.remarks).trim();
    if (remarks && remarks.length > 1000) errors.push(`${label}: remarks cannot exceed 1000 characters`);
    out.push({
      product_id: product.id,
      uom_id: product.uom_id,
      unit: product.uom_code,
      planned_quantity: String(line.planned_quantity ?? '').trim(),
      order_confirmation_item_id: orderItemId,
      remarks,
    });
  }
  return { errors, lines: out };
};

const fail = (errors) => {
  if (errors.length) throw rejected(`Production plan is invalid: ${errors.join('; ')}`, errors);
};

export const productionPlanService = {
  findAll: (filters) => productionPlanRepository.findAll(filters),

  /** The plan with line progress, booked processing records and the material each line still needs. */
  findById: async (id) => {
    const plan = await productionPlanRepository.findById(id);
    if (!plan) return null;
    plan.materials = await productionPlanRepository.materialNeeds(plan.company_id, plan.items);
    return plan;
  },

  formData: async (companyId) => {
    const id = Number(companyId);
    if (!Number.isInteger(id) || id <= 0) throw rejected('company_id is required');
    return productionPlanRepository.formData(id);
  },

  openLines: async (companyId) => {
    const id = Number(companyId);
    if (!Number.isInteger(id) || id <= 0) throw rejected('company_id is required');
    return productionPlanRepository.openLines(id);
  },

  create: async (data, userId) => inTransaction(async (connection) => {
    const companyError = await companyScope.checkField(data.company_id, { required: true, mustBeActive: true });
    const h = header(data);
    const errors = [...(companyError ? [companyError] : []), ...h.errors];
    const companyId = Number(data.company_id);
    const checked = companyError ? { errors: [], lines: [] } : await checkLines(connection, companyId, data.items);
    fail([...errors, ...checked.errors]);
    const financialYear = financialYearFor(new Date(`${data.plan_date}T00:00:00Z`));
    await numberSeriesService.ensure(connection, SERIES.module, SERIES.prefix, financialYear);
    const planNo = await numberSeriesService.next(connection, SERIES.module, financialYear);
    const id = await productionPlanRepository.create(connection, { company_id: companyId, plan_no: planNo, financial_year: financialYear, ...h.value, user_id: userId });
    await productionPlanRepository.replaceItems(connection, id, checked.lines);
    return id;
  }),

  update: async (id, data, userId) => inTransaction(async (connection) => {
    const plan = await productionPlanRepository.lock(connection, id);
    if (!plan) throw notFound();
    if (plan.status !== 'draft') throw rejected(`A ${plan.status} production plan cannot be edited; revert it to draft first.`);
    if (!blank(data.company_id) && Number(data.company_id) !== plan.company_id) throw rejected('The company of a production plan cannot be changed.');
    const h = header(data);
    const checked = await checkLines(connection, plan.company_id, data.items);
    fail([...h.errors, ...checked.errors]);
    await productionPlanRepository.update(connection, id, { ...h.value, user_id: userId });
    await productionPlanRepository.replaceItems(connection, id, checked.lines);
  }),

  markPlanned: async (id, userId) => inTransaction(async (connection) => {
    const plan = await productionPlanRepository.lock(connection, id);
    if (!plan) throw notFound();
    if (plan.status !== 'draft') throw rejected('Only a draft production plan can be marked planned.');
    const [items] = await connection.query('SELECT product_id, planned_quantity, order_confirmation_item_id, remarks FROM production_plan_items WHERE production_plan_id = ?', [id]);
    const checked = await checkLines(connection, plan.company_id, items);
    fail(checked.errors);
    await companyScope.assertActiveCompany(plan.company_id, connection);
    await productionPlanRepository.setStatus(connection, id, 'planned', userId);
  }),

  revertToDraft: async (id, userId) => inTransaction(async (connection) => {
    const plan = await productionPlanRepository.lock(connection, id);
    if (!plan) throw notFound();
    if (plan.status !== 'planned') throw rejected('Only a planned production plan can be reverted to draft.');
    if (await productionPlanRepository.countProcessing(connection, id) > 0) throw rejected('Processing is booked against this plan, so it cannot go back to draft.');
    await productionPlanRepository.setStatus(connection, id, 'draft', userId);
  }),

  complete: async (id, userId) => inTransaction(async (connection) => {
    const plan = await productionPlanRepository.lock(connection, id);
    if (!plan) throw notFound();
    if (plan.status !== 'planned') throw rejected('Only a planned production plan can be completed.');
    await productionPlanRepository.setStatus(connection, id, 'completed', userId);
  }),

  cancel: async (id, reason, userId) => inTransaction(async (connection) => {
    const plan = await productionPlanRepository.lock(connection, id);
    if (!plan) throw notFound();
    if (!['draft', 'planned'].includes(plan.status)) throw rejected(`A ${plan.status} production plan cannot be cancelled.`);
    if (await productionPlanRepository.countProcessing(connection, id) > 0) throw rejected('Processing is booked against this plan, so it cannot be cancelled; complete it instead.');
    await productionPlanRepository.setStatus(connection, id, 'cancelled', userId, { reason: blank(reason) ? null : String(reason).trim().slice(0, 500) });
  }),

  delete: async (id) => inTransaction(async (connection) => {
    const plan = await productionPlanRepository.lock(connection, id);
    if (!plan) throw notFound();
    if (plan.status !== 'draft') throw rejected('Only a draft production plan can be deleted.');
    await productionPlanRepository.delete(connection, id);
  }),

  /**
   * Booking a processing record against a plan line (called from processing
   * update): the line must be on a PLANNED plan of the record's company, and
   * be the same product as the record's produced product when one is set.
   */
  checkBooking: async (executor, companyId, lineId, producedProductId) => {
    if (blank(lineId)) return null;
    const line = await productionPlanRepository.findLine(executor, Number(lineId));
    if (!line) throw rejected('Production plan line not found.');
    if (line.company_id !== companyId) throw rejected(`${line.plan_no} belongs to a different company.`);
    if (line.plan_status !== 'planned') throw rejected(`${line.plan_no} is ${line.plan_status}; processing can only be booked against a planned production plan.`);
    if (producedProductId && Number(producedProductId) !== line.product_id) throw rejected(`The produced product is not the product of the ${line.plan_no} line.`);
    return line.id;
  },
};
