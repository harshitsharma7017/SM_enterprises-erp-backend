import { pool } from '../../config/database.js';
import { materialRequirementRepository } from './material-requirement.repository.js';
import { numberSeriesService, financialYearFor } from '../../services/number-series.service.js';
import { quantity } from '../../services/quantity.service.js';

const SERIES = { module: 'material_requirement', prefix: 'MR/' };

const notFound = () => ({ status: 404, message: 'Material requirement not found' });
const rejected = (message) => ({ status: 422, message });

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

export const materialRequirementService = {
  findAll: (filters) => materialRequirementRepository.findAll(filters),

  findById: (id) => materialRequirementRepository.findById(id),

  /**
   * Creates one requirement per projection item that does not have one yet.
   * Idempotent: re-running only fills gaps (UNIQUE brand_projection_item_id
   * is the final guard against duplicates).
   */
  generateFromProjection: async (projectionId, userId) => {
    return inTransaction(async (connection) => {
      const [rows] = await connection.query(
        'SELECT * FROM brand_projections WHERE id = ? AND deleted_at IS NULL FOR UPDATE',
        [projectionId]
      );
      const projection = rows[0];
      if (!projection) throw { status: 404, message: 'Brand projection not found' };
      if (projection.status !== 'finalized') {
        throw rejected('Requirements can only be generated from a finalized projection.');
      }

      const items = await materialRequirementRepository.findUngeneratedItems(connection, projectionId);
      if (items.length === 0) {
        throw rejected('Requirements have already been generated for every line of this projection.');
      }

      const financialYear = financialYearFor();
      await numberSeriesService.ensure(connection, SERIES.module, SERIES.prefix, financialYear);

      const createdIds = [];
      for (const item of items) {
        const requirementNo = await numberSeriesService.next(connection, SERIES.module, financialYear);
        createdIds.push(await materialRequirementRepository.create(connection, {
          company_id: projection.company_id, // same company as the source projection
          requirement_no: requirementNo,
          financial_year: financialYear,
          brand_projection_id: projection.id,
          brand_projection_item_id: item.id,
          created_by: userId,
          updated_by: userId,
        }));
      }
      return createdIds;
    });
  },

  /**
   * open/planned follow the committed plan quantity; closed is only set or
   * cleared manually and is left alone here.
   */
  recalculateStatuses: async (connection, ids) => {
    const rows = await materialRequirementRepository.findManyForPlanning(connection, [...new Set(ids)]);
    for (const row of rows) {
      if (row.status === 'closed') continue;
      const next = quantity.toMicro(row.planned_quantity) >= quantity.toMicro(row.required_quantity) ? 'planned' : 'open';
      if (next !== row.status) {
        await connection.query('UPDATE material_requirements SET status = ?, updated_at = NOW() WHERE id = ?', [next, row.id]);
      }
    }
  },

  /** open/planned → closed. Not while a draft plan still includes it. */
  close: async (id, remarks, userId) => {
    await inTransaction(async (connection) => {
      const existing = await materialRequirementRepository.lock(connection, id);
      if (!existing) throw notFound();
      if (existing.status === 'closed') throw rejected('This requirement is already closed.');
      if (await materialRequirementRepository.countDraftPlans(connection, id) > 0) {
        throw rejected('This requirement is on a draft material plan. Remove it from the plan (or mark the plan planned) before closing.');
      }
      await materialRequirementRepository.setStatus(connection, id, 'closed', userId, remarks ? String(remarks).slice(0, 2000) : null);
    });
    return materialRequirementRepository.findById(id);
  },

  /** closed → open/planned (whichever the committed plan quantity implies). */
  reopen: async (id, userId) => {
    await inTransaction(async (connection) => {
      const existing = await materialRequirementRepository.lock(connection, id);
      if (!existing) throw notFound();
      if (existing.status !== 'closed') throw rejected('Only a closed requirement can be reopened.');
      await materialRequirementRepository.setStatus(connection, id, 'open', userId);
      await materialRequirementService.recalculateStatuses(connection, [id]);
    });
    return materialRequirementRepository.findById(id);
  },

  /** Only an open requirement that no live plan uses; it can then be regenerated. */
  delete: async (id) => {
    await inTransaction(async (connection) => {
      const existing = await materialRequirementRepository.lock(connection, id);
      if (!existing) throw notFound();
      if (existing.status !== 'open') throw rejected('Only an open requirement can be deleted.');
      if (await materialRequirementRepository.countActivePlans(connection, id) > 0) {
        throw rejected('This requirement is used on a material plan and cannot be deleted.');
      }
      await materialRequirementRepository.deleteLinesOfDeletedPlans(connection, id);
      await materialRequirementRepository.hardDelete(connection, id);
    });
  },
};
