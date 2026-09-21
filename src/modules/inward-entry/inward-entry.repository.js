import { pool } from '../../config/database.js';

export const inwardEntryRepository = {
  findAll: async (filters = {}) => {
    let query = `
      SELECT ie.*,
        po.po_num as purchase_order_num,
        s.company_name as supplier_name,
        u1.name as creator_name,
        u2.name as qc_inspector_name
      FROM inward_entries ie
      LEFT JOIN purchase_orders po ON po.id = ie.purchase_order_id
      LEFT JOIN suppliers s ON s.id = ie.supplier_id
      LEFT JOIN users u1 ON u1.id = ie.created_by
      LEFT JOIN users u2 ON u2.id = ie.qc_inspected_by
      WHERE ie.deleted_at IS NULL
    `;
    const params = [];

    if (filters.status) {
      query += ` AND ie.status = ?`;
      params.push(filters.status);
    }
    
    if (filters.purchase_order_id) {
      query += ` AND ie.purchase_order_id = ?`;
      params.push(filters.purchase_order_id);
    }

    query += ` ORDER BY ie.id DESC`;

    // Pagination
    const page = parseInt(filters.page, 10) || 1;
    const limit = parseInt(filters.limit, 10) || 15;
    const offset = (page - 1) * limit;

    const countQuery = `SELECT COUNT(*) as total FROM (${query}) as sub`;
    const [[{ total }]] = await pool.query(countQuery, params);

    query += ` LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const [rows] = await pool.query(query, params);
    return { rows, total };
  },

  findById: async (id) => {
    const [rows] = await pool.query(`
      SELECT ie.*,
        po.po_num as purchase_order_num,
        s.company_name as supplier_name,
        u1.name as creator_name,
        u2.name as qc_inspector_name
      FROM inward_entries ie
      LEFT JOIN purchase_orders po ON po.id = ie.purchase_order_id
      LEFT JOIN suppliers s ON s.id = ie.supplier_id
      LEFT JOIN users u1 ON u1.id = ie.created_by
      LEFT JOIN users u2 ON u2.id = ie.qc_inspected_by
      WHERE ie.id = ? AND ie.deleted_at IS NULL
    `, [id]);
    
    if (rows.length === 0) return null;
    
    const entry = rows[0];
    
    const [items] = await pool.query(`
      SELECT iei.*,
        p.name as product_name,
        poi.design_no
      FROM inward_entry_items iei
      LEFT JOIN products p ON p.id = iei.product_id
      LEFT JOIN purchase_order_items poi ON poi.id = iei.purchase_order_item_id
      WHERE iei.inward_entry_id = ?
      ORDER BY iei.sort_order ASC
    `, [id]);
    
    entry.items = items;
    return entry;
  },

  getPODetails: async (purchaseOrderId) => {
    const [rows] = await pool.query(`
      SELECT 
        poi.id as purchase_order_item_id,
        poi.product_id,
        p.name as product_name,
        poi.description,
        poi.unit,
        poi.qty as ordered_qty,
        IFNULL(
          (SELECT SUM(iei.received_qty) 
           FROM inward_entry_items iei 
           JOIN inward_entries ie ON ie.id = iei.inward_entry_id 
           WHERE iei.purchase_order_item_id = poi.id 
             AND ie.status != 'rejected' 
             AND ie.deleted_at IS NULL), 0
        ) as previously_received_qty
      FROM purchase_order_items poi
      LEFT JOIN products p ON p.id = poi.product_id
      WHERE poi.purchase_order_id = ?
      ORDER BY poi.sort_order ASC
    `, [purchaseOrderId]);
    
    return rows.map(row => ({
      ...row,
      remaining_qty: row.ordered_qty - row.previously_received_qty
    }));
  },
  
  syncItems: async (connection, inwardEntryId, items = []) => {
    // Hard delete items not in the update array
    const itemIds = items.filter(i => i.id).map(i => i.id);
    if (itemIds.length > 0) {
      const placeholders = itemIds.map(() => '?').join(',');
      await connection.query(`
        DELETE FROM inward_entry_items 
        WHERE inward_entry_id = ? AND id NOT IN (${placeholders})
      `, [inwardEntryId, ...itemIds]);
    } else {
      await connection.query(`
        DELETE FROM inward_entry_items 
        WHERE inward_entry_id = ?
      `, [inwardEntryId]);
    }

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.id) {
        await connection.query(`
          UPDATE inward_entry_items SET 
            received_qty = ?,
            remarks = ?,
            sort_order = ?
          WHERE id = ? AND inward_entry_id = ?
        `, [
          item.received_qty || 0,
          item.remarks || null,
          i,
          item.id,
          inwardEntryId
        ]);
      } else {
        await connection.query(`
          INSERT INTO inward_entry_items (
            inward_entry_id, purchase_order_item_id, product_id, sort_order, 
            description, unit, ordered_qty, received_qty, passed_qty, rejected_qty, remarks
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          inwardEntryId,
          item.purchase_order_item_id,
          item.product_id || null,
          i,
          item.description || null,
          item.unit || null,
          item.ordered_qty || 0,
          item.received_qty || 0,
          0, // passed_qty
          0, // rejected_qty
          item.remarks || null
        ]);
      }
    }
  },

  updateItemQC: async (connection, itemId, inwardEntryId, passedQty, rejectedQty, qcRemarks) => {
    await connection.query(`
      UPDATE inward_entry_items 
      SET passed_qty = ?, rejected_qty = ?, qc_remarks = ?
      WHERE id = ? AND inward_entry_id = ?
    `, [passedQty, rejectedQty, qcRemarks, itemId, inwardEntryId]);
  },

  softDelete: async (connection, id) => {
    await connection.query('UPDATE inward_entries SET deleted_at = NOW() WHERE id = ?', [id]);
  }
};
