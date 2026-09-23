import { pool } from '../../config/database.js';
import { materialPlanRepository } from './material-plan.repository.js';
import { materialRequirementRepository } from '../material-requirement/material-requirement.repository.js';
import { materialRequirementService } from '../material-requirement/material-requirement.service.js';
import { numberSeriesService, financialYearFor } from '../../services/number-series.service.js';
import { quantity } from '../../services/quantity.service.js';

const SERIES = { module: 'material_plan', prefix: 'MP/' };

const notFound = () => ({ status: 404, message: 'Material plan not found' });
const rejected = (message, errors) => ({ status: 422, message, errors });

const headerPayload = (data) => ({
  company_id: Number(data.company_id),
  title: data.title.trim(),
  period_start: data.period_start,
  period_end: data.period_end,
  remarks: data.remarks ? data.remarks.trim() : null,
});

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

/**
 * Validates plan lines against their requirements. Must run inside a
 * transaction after the requirement rows are locked.
 *
 * `available` = required − quantity allocated on every OTHER live plan
 * (drafts included), so the total planned for a requirement never exceeds
 * what was required. Planning more than required (e.g. buffers for wastage)
 * is deliberately not allowed until the client defines such a rule.
 */
const checkLines = async (connection, companyId, lines, planId = null) => {
  const ids = lines.map((l) => l.material_requirement_id);
  await materialPlanRepository.lockRequirements(connection, ids);
  const requirements = await materialRequirementRepository.findManyForPlanning(connection, ids);
  const byId = Object.fromEntries(requirements.map((r) => [r.id, r]));

  const ownLines = planId ? await materialPlanRepository.findItems(connection, planId) : [];
  const ownById = Object.fromEntries(ownLines.map((l) => [l.material_requirement_id, l]));

  const errors = [];
  lines.forEach((line, index) => {
    const label = `Line ${index + 1}`;
    const r = byId[line.material_requirement_id];
    if (!r) {
      errors.push(`${label}: material requirement does not exist`);
      return;
    }
    const name = `${r.requirement_no} (${r.product_name})`;
    if (r.company_id !== companyId) {
      errors.push(`${label}: ${name} belongs to a different company`);
      return;
    }
    if (r.status === 'closed') {
      errors.push(`${label}: ${name} is closed`);
      return;
    }
    const qtyError = quantity.validate(line.planned_quantity, r.uom_decimal_places, `${label}: planned quantity`);
    if (qtyError) {
      errors.push(qtyError);
      return;
    }
    const own = ownById[r.id] ? quantity.toMicro(ownById[r.id].planned_quantity) : 0;
    const available = quantity.toMicro(r.required_quantity) - (quantity.toMicro(r.allocated_quantity) - own);
    if (quantity.toMicro(line.planned_quantity) > available) {
      errors.push(`${label}: ${name} — planned quantity exceeds the ${quantity.fromMicro(Math.max(available, 0))} ${r.uom_code} still unplanned`);
    }
  });

  if (errors.length > 0) throw rejected(`Plan lines are invalid: ${errors.join('; ')}`, errors);
};

export const materialPlanService = {
  findAll: (filters) => materialPlanRepository.findAll(filters),

  findById: (id) => materialPlanRepository.findById(id),

  create: async (data, items, userId) => {
    const id = await inTransaction(async (connection) => {
      const header = headerPayload(data);
      await checkLines(connection, header.company_id, items);

      const financialYear = financialYearFor();
      await numberSeriesService.ensure(connection, SERIES.module, SERIES.prefix, financialYear);
      const planNo = await numberSeriesService.next(connection, SERIES.module, financialYear);

      const planId = await materialPlanRepository.create(connection, {
        ...header, plan_no: planNo, financial_year: financialYear, created_by: userId, updated_by: userId,
      });
      await materialPlanRepository.replaceItems(connection, planId, items);
      return planId;
    });
    return materialPlanRepository.findById(id);
  },

  update: async (id, data, items, userId) => {
    await inTransaction(async (connection) => {
      const existing = await materialPlanRepository.lock(connection, id);
      if (!existing) throw notFound();
      if (existing.status !== 'draft') throw rejected('Only a draft material plan can be edited. Revert it to draft first.');

      const header = headerPayload(data);
      await checkLines(connection, header.company_id, items, id);
      await materialPlanRepository.update(connection, id, { ...header, updated_by: userId });
      await materialPlanRepository.replaceItems(connection, id, items);
    });
    return materialPlanRepository.findById(id);
  },

  /** draft → planned: commits the quantities and updates requirement statuses. */
  markPlanned: async (id, userId) => {
    await inTransaction(async (connection) => {
      const existing = await materialPlanRepository.lock(connection, id);
      if (!existing) throw notFound();
      if (existing.status !== 'draft') throw rejected('Only a draft material plan can be marked planned.');

      const lines = await materialPlanRepository.findItems(connection, id);
      if (lines.length === 0) throw rejected('Add at least one line before marking the plan planned.');
      await checkLines(connection, existing.company_id, lines.map((l) => ({ ...l, planned_quantity: String(Number(l.planned_quantity)) })), id);

      await materialPlanRepository.setStatus(connection, id, 'planned', userId);
      await materialRequirementService.recalculateStatuses(connection, lines.map((l) => l.material_requirement_id));
    });
    return materialPlanRepository.findById(id);
  },

  /** planned → draft: the quantities are no longer committed. */
  revertToDraft: async (id, userId) => {
    await inTransaction(async (connection) => {
      const existing = await materialPlanRepository.lock(connection, id);
      if (!existing) throw notFound();
      if (existing.status !== 'planned') throw rejected('Only a planned material plan can be reverted to draft.');
      if (await materialPlanRepository.countLivePurchaseOrderLines(connection, id) > 0) {
        throw rejected('Purchase orders have been raised from this plan. Cancel them before reverting the plan to draft.');
      }
      await materialPlanRepository.setStatus(connection, id, 'draft', userId);
      const lines = await materialPlanRepository.findItems(connection, id);
      await materialRequirementService.recalculateStatuses(connection, lines.map((l) => l.material_requirement_id));
    });
    return materialPlanRepository.findById(id);
  },

  /** planned → closed (final). Closed plans keep counting as planned quantity. */
  close: async (id, userId) => {
    await inTransaction(async (connection) => {
      const existing = await materialPlanRepository.lock(connection, id);
      if (!existing) throw notFound();
      if (existing.status !== 'planned') throw rejected('Only a planned material plan can be closed.');
      await materialPlanRepository.setStatus(connection, id, 'closed', userId);
    });
    return materialPlanRepository.findById(id);
  },

  delete: async (id) => {
    const existing = await materialPlanRepository.findById(id);
    if (!existing) throw notFound();
    if (existing.status !== 'draft') throw rejected('Only a draft material plan can be deleted.');
    await materialPlanRepository.softDelete(id);
  },
};
