import { markupRepository } from './markup.repository.js';

// Helper: formats agent_commission_type + value into a label string.
// Mirrors Supplier::agentCommissionLabel() accessor.
const formatCommissionLabel = (type, value) => {
  if (!type || value === null || value === undefined || value === '') return null;
  const v = parseFloat(value);
  if (isNaN(v)) return null;
  // Trim trailing zeros like Laravel's rtrim approach
  const formatted = v.toFixed(4).replace(/\.?0+$/, '');
  return type === 'percent' ? `${formatted}%` : `${formatted} INR`;
};

const formatAgentLabel = (name, code) => {
  if (!name && !code) return null;
  return `${name} (${code})`;
};

export const markupService = {
  findAll: async (filters) => {
    return await markupRepository.findAll(filters);
  },

  findById: async (id) => {
    return await markupRepository.findByIdWithRelations(id);
  },

  // Build the preview arithmetic the show page displays.
  // Matches MarkupService::preview() exactly.
  preview: (markup, costPrice = 100.0) => {
    const discount  = parseFloat(markup.supplier_discount_percent) || 0;
    const pct       = parseFloat(markup.markup_percent) || 0;
    const clientPrice = Math.round(costPrice * (1 + pct / 100) * 100) / 100;
    const ourCost     = Math.round(costPrice * (1 - discount / 100) * 100) / 100;
    const profit      = Math.round((clientPrice - ourCost) * 100) / 100;
    return { cost: costPrice, discount, client_price: clientPrice, our_cost: ourCost, profit };
  },

  // Enrich a raw markup row with derived agent/commission labels.
  enrich: (row) => {
    if (!row) return null;
    return {
      ...row,
      supplier_agent: formatAgentLabel(row.supplier_agent_name, row.supplier_agent_display_code),
      supplier_agent_commission: formatCommissionLabel(row.supplier_agent_commission_type, row.supplier_agent_commission_value),
      buyer_agent: formatAgentLabel(row.buyer_agent_name, row.buyer_agent_display_code),
      buyer_agent_commission: formatCommissionLabel(row.buyer_agent_commission_type, row.buyer_agent_commission_value),
    };
  },

  getFormData: async (supplierId = null, buyerId = null) => {
    const [suppliers, buyers, defaultMarkups, supplierDiscounts, supplierAC, buyerAC] = await Promise.all([
      markupRepository.getActiveSuppliersForForm(supplierId),
      markupRepository.getActiveBuyersForForm(buyerId),
      markupRepository.getDefaultMarkups(),
      markupRepository.getAllSupplierDiscounts(),
      markupRepository.getAllSupplierAgentCommissions(),
      markupRepository.getAllBuyerAgentCommissions(),
    ]);

    // Build keyed lookup objects matching MarkupController::formData()
    const discounts = {};
    for (const s of supplierDiscounts) {
      discounts[s.id] = parseFloat(s.discount_percent) || 0;
    }

    const supplierAgentCommissions = {};
    for (const s of supplierAC) {
      supplierAgentCommissions[s.id] = {
        agent: formatAgentLabel(s.agent_name, s.agent_display_code),
        commission: formatCommissionLabel(s.agent_commission_type, s.agent_commission_value),
      };
    }

    const buyerAgentCommissions = {};
    for (const b of buyerAC) {
      buyerAgentCommissions[b.id] = {
        agent: formatAgentLabel(b.agent_name, b.agent_display_code),
        commission: formatCommissionLabel(b.agent_commission_type, b.agent_commission_value),
      };
    }

    const defaultMarkupPercents = {};
    for (const d of defaultMarkups) {
      defaultMarkupPercents[d.id] = parseFloat(d.markup_percent);
    }

    return {
      suppliers: suppliers.map(s => ({ id: s.id, label: `${s.display_code} — ${s.company_name}` })),
      buyers:    buyers.map(b => ({ id: b.id, label: `${b.display_code} — ${b.company_name}` })),
      defaultMarkups: defaultMarkups.map(d => ({ id: d.id, name: d.name })),
      defaultMarkupPercents,
      discounts,
      supplierAgentCommissions,
      buyerAgentCommissions,
    };
  },

  create: async (data, userId) => {
    const payload = {
      supplier_id:    data.supplier_id,
      buyer_id:       data.buyer_id,
      markup_percent: data.markup_percent,
      status:         data.status,
      remarks:        data.remarks || null,
      created_by:     userId,
      updated_by:     userId,
    };
    const id = await markupRepository.create(payload);
    const row = await markupRepository.findByIdWithRelations(id);
    return markupService.enrich(row);
  },

  update: async (id, data, userId) => {
    const existing = await markupRepository.findById(id);
    if (!existing) throw { status: 404, message: 'Markup rule not found' };

    const payload = {
      supplier_id:    data.supplier_id,
      buyer_id:       data.buyer_id,
      markup_percent: data.markup_percent,
      status:         data.status,
      remarks:        data.remarks || null,
      updated_by:     userId,
    };
    await markupRepository.update(id, payload);
    const row = await markupRepository.findByIdWithRelations(id);
    return markupService.enrich(row);
  },

  // MarkupService::canDelete() always returns allowed:true in the original.
  canDelete: () => ({ allowed: true, reason: null }),

  delete: async (id) => {
    const existing = await markupRepository.findById(id);
    if (!existing) throw { status: 404, message: 'Markup rule not found' };
    await markupRepository.softDelete(id);
  },

  toggleStatus: async (id, userId) => {
    const existing = await markupRepository.findById(id);
    if (!existing) throw { status: 404, message: 'Markup rule not found' };
    const newStatus = existing.status === 'active' ? 'inactive' : 'active';
    await markupRepository.toggleStatus(id, newStatus, userId);
    const row = await markupRepository.findByIdWithRelations(id);
    return markupService.enrich(row);
  },
};
