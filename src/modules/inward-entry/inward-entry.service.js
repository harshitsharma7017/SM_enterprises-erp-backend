import { pool } from '../../config/database.js';
import { inwardEntryRepository } from './inward-entry.repository.js';
import { purchaseOrderRepository } from '../purchase-order/purchase-order.repository.js';

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

const nextNumber = async (connection, module, financialYear) => {
  const [rows] = await connection.query(
    'SELECT id, current_number, padding FROM number_series WHERE module = ? AND financial_year = ? FOR UPDATE',
    [module, financialYear]
  );
  if (rows.length === 0) throw new Error(`Number series not found for ${module}`);
  const series = rows[0];
  const newNumber = series.current_number + 1;
  await connection.query('UPDATE number_series SET current_number = ? WHERE id = ?', [newNumber, series.id]);
  return String(newNumber).padStart(series.padding, '0');
};

export const inwardEntryService = {
  create: async (data, userId) => {
    let connection;
    try {
      connection = await pool.getConnection();
      await connection.beginTransaction();

      // Validate PO
      const po = await purchaseOrderRepository.findById(data.purchase_order_id);
      if (!po) {
        throw new Error('Purchase Order not found.');
      }
      if (po.status === 'received') {
        throw new Error('Purchase Order is already fully received.');
      }
      if (po.status === 'cancelled') {
        const err = new Error('Purchase Order is cancelled.');
        err.status = 422;
        throw err;
      }
      // Planning-origin (garment) POs are received through the GRN, a later phase —
      // their metre-based quantities do not fit this integer inward entry.
      if (po.origin && po.origin !== 'order_confirmation') {
        const err = new Error('Planning purchase orders cannot be received through Goods Inward yet.');
        err.status = 422;
        throw err;
      }

      const financialYear = financialYearFor(new Date(data.inward_date));
      await ensureNumberSeries(connection, 'inward', 'GT/INW/', financialYear);
      const number = await nextNumber(connection, 'inward', financialYear);
      const inwardNo = `GT/INW/${number}/${financialYear}`;

      const [headerResult] = await connection.query(`
        INSERT INTO inward_entries (
          company_id, inward_no, financial_year, inward_date, purchase_order_id, supplier_id,
          challan_no, challan_date, remarks, status, created_by, updated_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, NOW(), NOW())
      `, [
        po.company_id, // inherited from the purchase order
        inwardNo,
        financialYear,
        data.inward_date,
        data.purchase_order_id,
        po.supplier_id,
        data.challan_no || null,
        data.challan_date || null,
        data.remarks || null,
        userId,
        userId
      ]);

      const inwardEntryId = headerResult.insertId;

      await inwardEntryRepository.syncItems(connection, inwardEntryId, data.items);

      await connection.commit();
      return inwardEntryId;
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

      const existing = await inwardEntryRepository.findById(id);
      if (!existing) throw new Error('Inward Entry not found');
      
      if (existing.status !== 'pending') {
        throw new Error('Cannot update inward entry after QC approval/rejection.');
      }

      await connection.query(`
        UPDATE inward_entries SET
          inward_date = ?, challan_no = ?, challan_date = ?, remarks = ?, updated_by = ?, updated_at = NOW()
        WHERE id = ?
      `, [
        data.inward_date,
        data.challan_no || null,
        data.challan_date || null,
        data.remarks || null,
        userId,
        id
      ]);

      await inwardEntryRepository.syncItems(connection, id, data.items);

      await connection.commit();
    } catch (error) {
      if (connection) await connection.rollback();
      throw error;
    } finally {
      if (connection) connection.release();
    }
  },

  approve: async (id, data, userId) => {
    let connection;
    try {
      connection = await pool.getConnection();
      await connection.beginTransaction();

      const existing = await inwardEntryRepository.findById(id);
      if (!existing) throw new Error('Inward Entry not found');
      
      if (existing.status !== 'pending') {
        throw new Error('Inward Entry has already been processed for QC.');
      }

      // Update items with passed/rejected qty
      for (const item of data.items) {
        // Validate
        const existingItem = existing.items.find(i => i.id === item.id);
        if (!existingItem) continue;
        
        const passedQty = parseInt(item.passed_qty, 10) || 0;
        const rejectedQty = parseInt(item.rejected_qty, 10) || 0;
        
        if (passedQty + rejectedQty > existingItem.received_qty) {
          throw new Error(`Total QC quantity cannot exceed received quantity for item ${item.id}`);
        }
        
        await inwardEntryRepository.updateItemQC(connection, item.id, id, passedQty, rejectedQty, item.qc_remarks || null);
      }

      const status = data.status || 'approved';

      await connection.query(`
        UPDATE inward_entries SET
          status = ?, qc_inspected_by = ?, qc_inspected_at = NOW(), updated_by = ?, updated_at = NOW()
        WHERE id = ?
      `, [status, userId, userId, id]);

      // Update PO Status
      await inwardEntryService.recalculatePOStatus(connection, existing.purchase_order_id);

      await connection.commit();
    } catch (error) {
      if (connection) await connection.rollback();
      throw error;
    } finally {
      if (connection) connection.release();
    }
  },

  recalculatePOStatus: async (connection, poId) => {
    // A PO is 'received' if all items have sum(passed_qty) >= ordered_qty
    const [items] = await connection.query(`
      SELECT 
        poi.id,
        poi.qty as ordered_qty,
        IFNULL((
          SELECT SUM(iei.passed_qty) 
          FROM inward_entry_items iei 
          JOIN inward_entries ie ON ie.id = iei.inward_entry_id 
          WHERE iei.purchase_order_item_id = poi.id 
            AND ie.status = 'approved' 
            AND ie.deleted_at IS NULL
        ), 0) as total_passed_qty
      FROM purchase_order_items poi
      WHERE poi.purchase_order_id = ?
    `, [poId]);

    let fullyReceived = true;
    let anyReceived = false;

    for (const item of items) {
      if (item.total_passed_qty > 0) {
        anyReceived = true;
      }
      if (item.total_passed_qty < item.ordered_qty) {
        fullyReceived = false;
      }
    }

    let newStatus = 'raised';
    if (fullyReceived && items.length > 0) {
      newStatus = 'received';
    } else if (anyReceived) {
      newStatus = 'partial';
    }

    await connection.query('UPDATE purchase_orders SET status = ? WHERE id = ?', [newStatus, poId]);
  },

  delete: async (id) => {
    let connection;
    try {
      connection = await pool.getConnection();
      await connection.beginTransaction();

      const existing = await inwardEntryRepository.findById(id);
      if (!existing) throw new Error('Inward Entry not found');
      
      await inwardEntryRepository.softDelete(connection, id);

      // Recalculate PO if QC was already approved
      if (existing.status === 'approved') {
        await inwardEntryService.recalculatePOStatus(connection, existing.purchase_order_id);
      }

      await connection.commit();
    } catch (error) {
      if (connection) await connection.rollback();
      throw error;
    } finally {
      if (connection) connection.release();
    }
  }
};
