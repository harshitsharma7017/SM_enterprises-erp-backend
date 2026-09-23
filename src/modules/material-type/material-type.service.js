import { materialTypeRepository } from './material-type.repository.js';
import { companyScope } from '../../services/company-scope.service.js';

const notFound = () => ({ status: 404, message: 'Material type not found' });

const toPayload = (data) => ({
  company_id: Number(data.company_id),
  code: data.code.trim().toUpperCase(),
  name: data.name.trim(),
  status: data.status,
});

export const materialTypeService = {
  findAll: (filters) => materialTypeRepository.findAll(filters),

  findById: (id) => materialTypeRepository.findById(id),

  create: async (data, userId) => {
    const id = await materialTypeRepository.create({ ...toPayload(data), created_by: userId, updated_by: userId });
    return materialTypeRepository.findById(id);
  },

  update: async (id, data, userId) => {
    const existing = await materialTypeRepository.findById(id);
    if (!existing) throw notFound();

    const payload = toPayload(data);
    if (payload.company_id !== existing.company_id) {
      // Products must share their material type's company, so a type in use cannot move.
      if (await materialTypeRepository.countProducts(id) > 0) {
        throw companyScope.error('This material type is used by products, so its company cannot be changed.');
      }
      await companyScope.assertActiveCompany(payload.company_id);
    }

    await materialTypeRepository.update(id, { ...payload, updated_by: userId });
    return materialTypeRepository.findById(id);
  },

  toggleStatus: async (id, userId) => {
    const existing = await materialTypeRepository.findById(id);
    if (!existing) throw notFound();
    await materialTypeRepository.toggleStatus(id, existing.status === 'active' ? 'inactive' : 'active', userId);
    return materialTypeRepository.findById(id);
  },

  delete: async (id) => {
    const existing = await materialTypeRepository.findById(id);
    if (!existing) throw notFound();

    const productCount = await materialTypeRepository.countProducts(id);
    if (productCount > 0) {
      throw { status: 400, message: `This material type is used by ${productCount} product(s). Reassign them first, or deactivate it instead.` };
    }
    await materialTypeRepository.softDelete(id);
  },
};
