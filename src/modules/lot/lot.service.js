import { lotRepository } from './lot.repository.js';

// Lots are created by posting a goods receipt (inward-entry.service); they are read-only here.
export const lotService = {
  findAll: (filters) => lotRepository.findAll(filters),
  findById: (id) => lotRepository.findById(id),
};
