import { companyRepository } from './company.repository.js';

const notFound = () => ({ status: 404, message: 'Company not found' });

const toPayload = (data) => ({
  code: data.code.trim().toUpperCase(),
  name: data.name.trim(),
  short_name: data.short_name ? data.short_name.trim() : null,
  address: data.address || null,
  phone: data.phone || null,
  email: data.email || null,
  gstin: data.gstin ? data.gstin.trim().toUpperCase() : null,
  is_active: data.is_active === undefined ? 1 : (data.is_active ? 1 : 0),
});

export const companyService = {
  findAll: (filters) => companyRepository.findAll(filters),

  options: () => companyRepository.options(),

  findById: (id) => companyRepository.findById(id),

  create: async (data, userId) => {
    const id = await companyRepository.create({ ...toPayload(data), created_by: userId, updated_by: userId });
    return companyRepository.findById(id);
  },

  update: async (id, data, userId) => {
    const existing = await companyRepository.findById(id);
    if (!existing) throw notFound();

    // Deactivation only blocks NEW assignments; existing records keep their owner.
    await companyRepository.update(id, { ...toPayload(data), updated_by: userId });
    return companyRepository.findById(id);
  },

  toggleStatus: async (id, userId) => {
    const existing = await companyRepository.findById(id);
    if (!existing) throw notFound();
    await companyRepository.setActive(id, existing.is_active ? 0 : 1, userId);
    return companyRepository.findById(id);
  },

  delete: async (id) => {
    const existing = await companyRepository.findById(id);
    if (!existing) throw notFound();

    const usage = await companyRepository.usage(id);
    if (usage.length > 0) {
      const detail = usage.map((u) => `${u.count} ${u.label}(s)`).join(', ');
      throw { status: 400, message: `This company is used by ${detail}. Deactivate it instead.` };
    }

    await companyRepository.softDelete(id);
  },
};
