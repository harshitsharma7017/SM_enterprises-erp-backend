import { fobValueRepository } from './fob-value.repository.js';

// FobValueController talks to the Eloquent model directly — there is no
// FobValueService in the Laravel source, no transaction (single table, no
// children to sync), and no canDelete() dependency check at all. This
// service exists only to match the project's established module shape; it
// does not add business logic Laravel doesn't have.
export const fobValueService = {

  findAll: async (filters) => {
    return await fobValueRepository.findAll(filters);
  },

  findById: async (id) => {
    return await fobValueRepository.findByIdIncludingRelations(id);
  },

  create: async (data, userId) => {
    const payload = {
      name: data.name,
      status: data.status,
      remarks: data.remarks || null,
      created_by: userId,
      updated_by: userId
    };

    const id = await fobValueRepository.create(payload);

    return await fobValueService.findById(id);
  },

  update: async (id, data, userId) => {
    const existing = await fobValueRepository.findById(id);
    if (!existing) {
      throw { status: 404, message: 'FOB Value not found' };
    }

    const payload = {
      name: data.name,
      status: data.status,
      remarks: data.remarks || null,
      updated_by: userId
    };

    await fobValueRepository.update(id, payload);

    return await fobValueService.findById(id);
  },

  /**
   * Unconditional — `FobValueController::destroy()` calls `$fobValue->delete()`
   * directly with no dependency check of any kind. Do not add one.
   */
  delete: async (id) => {
    const existing = await fobValueRepository.findById(id);
    if (!existing) {
      throw { status: 404, message: 'FOB Value not found' };
    }

    await fobValueRepository.softDelete(id);
  },

  toggleStatus: async (id, userId) => {
    const existing = await fobValueRepository.findById(id);
    if (!existing) {
      throw { status: 404, message: 'FOB Value not found' };
    }

    const newStatus = existing.status === 'active' ? 'inactive' : 'active';
    await fobValueRepository.toggleStatus(id, newStatus, userId);

    return await fobValueService.findById(id);
  }
};
