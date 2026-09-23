import { brandRepository } from './brand.repository.js';
import { companyScope } from '../../services/company-scope.service.js';

const notFound = () => ({ status: 404, message: 'Brand not found' });

const toPayload = (data) => ({
  company_id: Number(data.company_id),
  code: data.code.trim().toUpperCase(),
  name: data.name.trim(),
  status: data.status,
});

export const brandService = {
  findAll: (filters) => brandRepository.findAll(filters),

  findById: (id) => brandRepository.findById(id),

  create: async (data, userId) => {
    const id = await brandRepository.create({ ...toPayload(data), created_by: userId, updated_by: userId });
    return brandRepository.findById(id);
  },

  update: async (id, data, userId) => {
    const existing = await brandRepository.findById(id);
    if (!existing) throw notFound();

    const payload = toPayload(data);
    // Nothing references brands yet, so ownership may move — but only to an active company.
    await companyScope.assertChangedOwnerActive(existing.company_id, payload.company_id);

    await brandRepository.update(id, { ...payload, updated_by: userId });
    return brandRepository.findById(id);
  },

  toggleStatus: async (id, userId) => {
    const existing = await brandRepository.findById(id);
    if (!existing) throw notFound();
    await brandRepository.toggleStatus(id, existing.status === 'active' ? 'inactive' : 'active', userId);
    return brandRepository.findById(id);
  },

  delete: async (id) => {
    const existing = await brandRepository.findById(id);
    if (!existing) throw notFound();
    await brandRepository.softDelete(id);
  },
};
