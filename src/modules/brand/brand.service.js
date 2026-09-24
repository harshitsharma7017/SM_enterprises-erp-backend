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

  // `connection`: a caller-owned transaction (Excel import) — then only the new id is returned.
  create: async (data, userId, { connection = null } = {}) => {
    const id = await brandRepository.create({ ...toPayload(data), created_by: userId, updated_by: userId }, connection || undefined);
    if (connection) return id;
    return brandRepository.findById(id);
  },

  update: async (id, data, userId) => {
    const existing = await brandRepository.findById(id);
    if (!existing) throw notFound();

    const payload = toPayload(data);
    if (payload.company_id !== existing.company_id) {
      // Projections must share their brand's company, so a brand in use cannot move.
      if (await brandRepository.countProjections(id) > 0) {
        throw companyScope.error('This brand is used by brand projections, so its company cannot be changed.');
      }
      await companyScope.assertActiveCompany(payload.company_id);
    }

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

    const projectionCount = await brandRepository.countProjections(id);
    if (projectionCount > 0) {
      throw { status: 400, message: `This brand is used by ${projectionCount} brand projection(s). Deactivate it instead.` };
    }
    await brandRepository.softDelete(id);
  },
};
