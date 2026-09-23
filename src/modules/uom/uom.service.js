import { uomRepository } from './uom.repository.js';

const notFound = () => ({ status: 404, message: 'UOM not found' });

const toPayload = (data) => ({
  code: data.code.trim().toUpperCase(),
  name: data.name.trim(),
  decimal_places: Number(data.decimal_places),
  status: data.status,
});

export const uomService = {
  findAll: (filters) => uomRepository.findAll(filters),

  findById: (id) => uomRepository.findById(id),

  create: async (data, userId) => {
    const id = await uomRepository.create({ ...toPayload(data), created_by: userId, updated_by: userId });
    return uomRepository.findById(id);
  },

  update: async (id, data, userId) => {
    const existing = await uomRepository.findById(id);
    if (!existing) throw notFound();
    await uomRepository.update(id, { ...toPayload(data), updated_by: userId });
    return uomRepository.findById(id);
  },

  toggleStatus: async (id, userId) => {
    const existing = await uomRepository.findById(id);
    if (!existing) throw notFound();
    await uomRepository.toggleStatus(id, existing.status === 'active' ? 'inactive' : 'active', userId);
    return uomRepository.findById(id);
  },

  delete: async (id) => {
    const existing = await uomRepository.findById(id);
    if (!existing) throw notFound();

    const productCount = await uomRepository.countProducts(id);
    if (productCount > 0) {
      throw { status: 400, message: `This UOM is used by ${productCount} product(s). Reassign them first, or deactivate it instead.` };
    }
    await uomRepository.softDelete(id);
  },
};
