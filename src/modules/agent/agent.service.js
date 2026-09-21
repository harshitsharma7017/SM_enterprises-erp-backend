import { pool } from '../../config/database.js';
import { agentRepository } from './agent.repository.js';

const isBlank = (v) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '');

export const AGENT_TYPES = {
  supplier: 'Supplier',
  buyer: 'Buyer',
  jobber: 'Jobber'
};

export const COMMISSION_TYPES = {
  percent: '% of value',
  fixed: 'Fixed / piece'
};

// Laravel also exposes COMMISSION_PAYERS/PAYMENT_TERMS option lists, but
// those describe `commission_paid_by`/`payment_term` — columns that do not
// exist on the locked schema and are never persisted (see buildPayload).
// Shipping their dropdown options here would offer a frontend fields it can
// never actually save, so they are deliberately omitted rather than
// simulated.

// "One side per agent" — Agent.php:20-23. Buyer-side agents are paid
// internationally, so no commission currency is INR-implied for them.
export const isDomesticAgentType = (agentType) => agentType !== 'buyer';

export const agentService = {

  findAll: async (filters) => {
    return await agentRepository.findAll(filters);
  },

  findById: async (id) => {
    const agent = await agentRepository.findByIdIncludingRelations(id);
    if (!agent) return null;

    const [categories, commissions] = await Promise.all([
      agentRepository.getCategories(id),
      agentRepository.getCommissions(id)
    ]);

    return { ...agent, categories, commissions };
  },

  /**
   * Builds the agents-table payload from validated input. Only the columns
   * the locked schema actually has are read here — `comments` and every
   * contact/tax/bank/commission-metadata field from the Laravel source are
   * deliberately never referenced, and `commission_rate` is never touched.
   */
  buildPayload: (data) => ({
    agent_type: data.agent_type,
    name: data.name,
    display_code: data.display_code,
    calculation_basis_id: data.calculation_basis_id,
    status: data.status,
    remarks: data.remarks || null
  }),

  create: async (data, userId) => {
    let connection;
    try {
      connection = await pool.getConnection();
      await connection.beginTransaction();

      const payload = {
        ...agentService.buildPayload(data),
        created_by: userId,
        updated_by: userId
      };

      const agentId = await agentRepository.create(connection, payload);

      await agentService.syncCategories(connection, agentId, data.categories || []);
      await agentService.syncCommissions(connection, agentId, data.commissions || []);

      await connection.commit();

      return await agentService.findById(agentId);
    } catch (error) {
      if (connection) await connection.rollback();
      throw error;
    } finally {
      if (connection) connection.release();
    }
  },

  update: async (id, data, userId) => {
    let connection;
    try {
      connection = await pool.getConnection();
      await connection.beginTransaction();

      const existing = await agentRepository.findById(id);
      if (!existing) {
        throw { status: 404, message: 'Agent not found' };
      }

      const payload = {
        ...agentService.buildPayload(data),
        updated_by: userId
      };

      await agentRepository.update(connection, id, payload);

      await agentService.syncCategories(connection, id, data.categories || []);
      await agentService.syncCommissions(connection, id, data.commissions || []);

      await connection.commit();

      return await agentService.findById(id);
    } catch (error) {
      if (connection) await connection.rollback();
      throw error;
    } finally {
      if (connection) connection.release();
    }
  },

  /**
   * Delete-then-bulk-insert, de-duplicating first. `agent_category` on the
   * locked schema has no composite unique key (Laravel's migration defines
   * one; this DB does not), so nothing stops a duplicate (agent_id,
   * category_id) pair from being inserted twice unless we do it ourselves —
   * matching what Eloquent's `sync()` does internally regardless of the DB
   * constraint.
   */
  syncCategories: async (connection, agentId, categoryIds) => {
    const deduped = [...new Set((categoryIds || []).map((id) => Number(id)))];
    await agentRepository.syncCategories(connection, agentId, deduped);
  },

  /**
   * Full delete-and-reinsert. Rows with a blank `amount` are skipped (in
   * practice unreachable once validation requires `amount` on every
   * submitted row, but preserved as the same defensive belt-and-suspenders
   * check AgentService::syncCommissions() itself has). `sort_order` is a
   * running counter over the SURVIVING rows only, starting at 0 — matching
   * `$order = 0; ... $order++` in the source exactly.
   */
  syncCommissions: async (connection, agentId, commissions) => {
    await agentRepository.deleteCommissions(connection, agentId);

    let order = 0;
    for (const raw of commissions) {
      const row = raw || {};
      if (isBlank(row.amount)) continue;

      await agentRepository.insertCommission(connection, agentId, {
        commission_type: row.commission_type,
        amount: row.amount,
        currency_id: isBlank(row.currency_id) ? null : row.currency_id,
        sort_order: order
      });
      order++;
    }
  },

  /**
   * Real dependency check — NOT the permissive stub used by Buyer/Supplier.
   * Matches AgentService::canDelete() exactly: counts non-deleted buyers and
   * suppliers currently pointing at this agent (their FK is nullOnDelete, so
   * a delete would otherwise silently blank the commission trail on
   * existing orders rather than failing loudly).
   */
  canDelete: async (agentId) => {
    const [buyerCount, supplierCount] = await Promise.all([
      agentRepository.countBuyersForAgent(agentId),
      agentRepository.countSuppliersForAgent(agentId)
    ]);

    if (buyerCount === 0 && supplierCount === 0) {
      return { allowed: true, reason: null };
    }

    const used = [];
    if (buyerCount > 0) used.push(`${buyerCount} ${buyerCount === 1 ? 'buyer' : 'buyers'}`);
    if (supplierCount > 0) used.push(`${supplierCount} ${supplierCount === 1 ? 'supplier' : 'suppliers'}`);

    const existing = await agentRepository.findById(agentId);
    const name = existing ? existing.name : 'This agent';

    return {
      allowed: false,
      reason: `${name} is linked to ${used.join(' and ')}. Reassign them before deleting this agent, or mark it inactive instead.`
    };
  },

  delete: async (id) => {
    const existing = await agentRepository.findById(id);
    if (!existing) {
      throw { status: 404, message: 'Agent not found' };
    }

    const check = await agentService.canDelete(id);
    if (!check.allowed) {
      throw { status: 400, message: check.reason };
    }

    // No transaction needed for a single UPDATE, matching the source.
    // Categories/commissions are left in place — nothing cascades on a
    // soft delete.
    await agentRepository.softDelete(id);
  },

  toggleStatus: async (id, userId) => {
    const existing = await agentRepository.findById(id);
    if (!existing) {
      throw { status: 404, message: 'Agent not found' };
    }

    const newStatus = existing.status === 'active' ? 'inactive' : 'active';
    await agentRepository.toggleStatus(id, newStatus, userId);

    return await agentService.findById(id);
  },

  /**
   * Convenience only — the unique index (via displayCodeExists/nameExists,
   * which include soft-deleted rows) is the real enforcement.
   */
  checkCode: async (field, value, ignoreId) => {
    if (field !== 'display_code' && field !== 'name') {
      throw { status: 422, message: 'Unknown field.' };
    }

    const taken = field === 'display_code'
      ? await agentRepository.displayCodeExists(value, ignoreId)
      : await agentRepository.nameExists(value, ignoreId);

    return { available: !taken };
  },

  /**
   * Dropdown sources for the create/edit forms. Active-only, WITH a
   * current-value union when editing — categories/calculationBases/
   * currencies each fold in whatever this agent already references, so an
   * edit form never silently blanks out a since-deactivated selection.
   * Matches AgentController::formData()'s Product-style pattern exactly
   * (unlike Buyer/Supplier, which never union).
   */
  getFormData: async (agent = null) => {
    const categoryIncludeIds = agent ? (agent.categories || []).map((c) => c.id) : [];
    const currencyIncludeIds = agent
      ? [...new Set((agent.commissions || []).map((c) => c.currency_id).filter((id) => id !== null && id !== undefined))]
      : [];
    const calculationBasisIncludeId = agent ? agent.calculation_basis_id : null;

    const [categories, calculationBases, currencies] = await Promise.all([
      agentRepository.getCategoriesForForm(categoryIncludeIds),
      agentRepository.getCalculationBasesForForm(calculationBasisIncludeId),
      agentRepository.getCurrenciesForForm(currencyIncludeIds)
    ]);

    return {
      agentTypes: AGENT_TYPES,
      commissionTypes: COMMISSION_TYPES,
      categories,
      calculationBases,
      currencies
    };
  }
};
