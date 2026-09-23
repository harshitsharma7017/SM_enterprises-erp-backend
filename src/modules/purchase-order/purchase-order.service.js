import { pool } from '../../config/database.js';
import { purchaseOrderRepository } from './purchase-order.repository.js';
import { GARMENT_ORIGINS } from './garment-po.service.js';
import { companyScope } from '../../services/company-scope.service.js';
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
      
      // Company is inherited from the order confirmation, never taken from the request.
      const [ocRows] = await connection.query(
        'SELECT company_id FROM order_confirmations WHERE id = ? AND deleted_at IS NULL',
        [data.order_confirmation_id]
      );
      if (ocRows.length === 0) {
        throw companyScope.error('Order Confirmation not found.');
      }
      const companyId = ocRows[0].company_id;
      await companyScope.assertLinks(companyId, {
        supplierIds: [data.supplier_id],
        productIds: (data.items || []).map((item) => item && item.product_id),
      }, connection);

      const payload = {
        ...data,
        company_id: companyId,
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

      // Company (inherited from the OC) is not editable; only item products are checked.
      const [poRows] = await connection.query('SELECT company_id, status FROM purchase_orders WHERE id = ?', [id]);
      if (poRows.length && poRows[0].status === 'cancelled') {
        throw companyScope.error('A cancelled purchase order cannot be edited.');
      }
      // Editing replaces every line, which receipts reference — so it stops once goods are recorded.
      const [receipts] = await connection.query(
        "SELECT COUNT(*) AS cnt FROM inward_entries WHERE purchase_order_id = ? AND deleted_at IS NULL AND receipt_status <> 'cancelled'",
        [id]
      );
      if (receipts[0].cnt > 0) {
        throw companyScope.error('Goods receipts exist for this purchase order, so its lines can no longer be edited.');
      }
      await companyScope.assertLinks(poRows.length ? poRows[0].company_id : null, {
        productIds: (data.items || []).map((item) => item && item.product_id),
      }, connection);

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

      // Planning-origin POs are cancelled once confirmed, never deleted, so the
      // ordered quantity history they carry stays intact.
      const [rows] = await connection.query('SELECT origin, status FROM purchase_orders WHERE id = ?', [id]);
      if (rows.length && GARMENT_ORIGINS.includes(rows[0].origin) && rows[0].status !== 'draft') {
        throw companyScope.error('Only a draft planning purchase order can be deleted. Cancel it instead.');
      }

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
