import { pool } from '../../config/database.js';
import { brandProjectionRepository } from './brand-projection.repository.js';
import { numberSeriesService, financialYearFor } from '../../services/number-series.service.js';

const SERIES = { module: 'brand_projection', prefix: 'BP/' };

const notFound = () => ({ status: 404, message: 'Brand projection not found' });
const rejected = (message) => ({ status: 422, message });

const headerPayload = (data) => ({
  company_id: Number(data.company_id),
  brand_id: Number(data.brand_id),
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

/** Locks the header row so concurrent status changes serialise. */
const lockHeader = async (connection, id) => {
  const [rows] = await connection.query(
    'SELECT * FROM brand_projections WHERE id = ? AND deleted_at IS NULL FOR UPDATE',
    [id]
  );
  if (rows.length === 0) throw notFound();
  return rows[0];
};

export const brandProjectionService = {
  findAll: (filters) => brandProjectionRepository.findAll(filters),

  findById: (id) => brandProjectionRepository.findById(id),

  getFormData: async (projectionId = null) => {
    const projection = projectionId ? await brandProjectionRepository.findHeader(projectionId) : null;
    const [brands, products] = await Promise.all([
      brandProjectionRepository.getBrandsForForm(projection ? projection.brand_id : null),
      brandProjectionRepository.getProductsForForm(),
    ]);
    return { brands, products };
  },

  // `connection`: a caller-owned transaction (Excel import) — then only the new id is returned.
  create: async (data, items, userId, { connection: external = null } = {}) => {
    const work = async (connection) => {
      const financialYear = financialYearFor();
      await numberSeriesService.ensure(connection, SERIES.module, SERIES.prefix, financialYear);
      const projectionNo = await numberSeriesService.next(connection, SERIES.module, financialYear);

      const projectionId = await brandProjectionRepository.create(connection, {
        ...headerPayload(data),
        projection_no: projectionNo,
        financial_year: financialYear,
        created_by: userId,
        updated_by: userId,
      });
      await brandProjectionRepository.replaceItems(connection, projectionId, items);
      return projectionId;
    };
    if (external) return work(external);
    const id = await inTransaction(work);
    return brandProjectionRepository.findById(id);
  },

  update: async (id, data, items, userId) => {
    await inTransaction(async (connection) => {
      const existing = await lockHeader(connection, id);
      if (existing.status !== 'draft') {
        throw rejected('Only a draft projection can be edited. Reopen it first.');
      }
      await brandProjectionRepository.update(connection, id, { ...headerPayload(data), updated_by: userId });
      await brandProjectionRepository.replaceItems(connection, id, items);
    });
    return brandProjectionRepository.findById(id);
  },

  /**
   * draft → finalized. Lines are re-checked because products may have been
   * edited since the draft was saved.
   */
  finalize: async (id, userId) => {
    await inTransaction(async (connection) => {
      const existing = await lockHeader(connection, id);
      if (existing.status !== 'draft') throw rejected('Only a draft projection can be finalized.');

      const lines = await brandProjectionRepository.findItemsForValidation(connection, id);
      if (lines.length === 0) throw rejected('Add at least one material line before finalizing.');

      const problems = [];
      for (const line of lines) {
        if (line.deleted_at) problems.push(`${line.name} has been deleted`);
        else if (line.company_id !== existing.company_id) problems.push(`${line.name} no longer belongs to this company`);
        else if (line.status !== 'active') problems.push(`${line.name} is inactive`);
        else if (line.uom_id !== line.line_uom_id) problems.push(`${line.name}'s UOM has changed — re-save the projection`);
      }
      if (problems.length > 0) throw rejected(`Cannot finalize: ${problems.join('; ')}.`);

      await brandProjectionRepository.setStatus(connection, id, 'finalized', userId);
    });
    return brandProjectionRepository.findById(id);
  },

  /** finalized → draft, only while no requirements have been generated from it. */
  reopen: async (id, userId) => {
    await inTransaction(async (connection) => {
      const existing = await lockHeader(connection, id);
      if (existing.status !== 'finalized') throw rejected('Only a finalized projection can be reopened.');
      if (await brandProjectionRepository.countRequirements(connection, id) > 0) {
        throw rejected('Material requirements have been generated from this projection. Delete them before reopening.');
      }
      await brandProjectionRepository.setStatus(connection, id, 'draft', userId);
    });
    return brandProjectionRepository.findById(id);
  },

  delete: async (id) => {
    const existing = await brandProjectionRepository.findHeader(id);
    if (!existing) throw notFound();
    if (existing.status !== 'draft') throw rejected('Only a draft projection can be deleted.');
    await brandProjectionRepository.softDelete(id);
  },
};
