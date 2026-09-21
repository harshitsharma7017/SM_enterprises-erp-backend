import { pool } from '../../config/database.js';
import { purchaseOrderRepository } from './purchase-order.repository.js';
import { numberSeriesService } from '../../services/number-series.service.js';

const financialYearFor = (date = new Date()) => {
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  const startYear = month >= 4 ? year : year - 1;
  return `${startYear}-${String(startYear + 1).slice(-2)}`;
};

const ensureNumberSeries = async (connection, module, prefix, financialYear) => {
  const [existing] = await connection.query(
    'SELECT id FROM number_series WHERE module = ? AND financial_year = ?',
    [module, financialYear]
  );
  if (existing.length === 0) {
    await connection.query(
      `INSERT INTO number_series (module, prefix, financial_year, current_number, padding, reset_yearly, created_at, updated_at)
       VALUES (?, ?, ?, 0, 3, 1, NOW(), NOW())`,
      [module, prefix, financialYear]
    );
  }
};

export const purchaseOrderService = {
  create: async (data, userId) => {
    let connection;
    try {
      connection = await pool.getConnection();
      await connection.beginTransaction();

      const financialYear = financialYearFor();
      await ensureNumberSeries(connection, 'po', 'GT/PO/', financialYear);
      const number = await numberSeriesService.nextNumber(connection, 'po', financialYear);
      const po_num = `GT/PO/${number}/${financialYear}`;
      
      const payload = {
        ...data,
        po_num,
        financial_year: financialYear,
        created_by: userId,
        updated_by: userId
      };

      const poId = await purchaseOrderRepository.create(connection, payload);
      
      if (data.items && Array.isArray(data.items)) {
        await purchaseOrderRepository.syncItems(connection, poId, data.items);
      }
      
      if (data.timeline && Array.isArray(data.timeline)) {
        await purchaseOrderRepository.syncTimeline(connection, poId, data.timeline);
      }

      await connection.commit();
      return await purchaseOrderRepository.findById(poId);
    } catch (error) {
      if (connection) await connection.rollback();
      throw error;
    } finally {
      if (connection) connection.release();
    }
  },

  update: async (id, data, userId) => {
    let connection;
    try {
      connection = await pool.getConnection();
      await connection.beginTransaction();

      const payload = {
        ...data,
        updated_by: userId
      };

      await purchaseOrderRepository.update(connection, id, payload);
      
      if (data.items && Array.isArray(data.items)) {
        await purchaseOrderRepository.syncItems(connection, id, data.items);
      }
      
      if (data.timeline && Array.isArray(data.timeline)) {
        await purchaseOrderRepository.syncTimeline(connection, id, data.timeline);
      }

      await connection.commit();
      return await purchaseOrderRepository.findById(id);
    } catch (error) {
      if (connection) await connection.rollback();
      throw error;
    } finally {
      if (connection) connection.release();
    }
  },

  delete: async (id) => {
    let connection;
    try {
      connection = await pool.getConnection();
      await connection.beginTransaction();

      await purchaseOrderRepository.delete(connection, id);

      await connection.commit();
    } catch (error) {
      if (connection) await connection.rollback();
      throw error;
    } finally {
      if (connection) connection.release();
    }
  }
};
