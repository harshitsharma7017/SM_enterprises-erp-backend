import { pool } from '../../config/database.js';

export const reportRepository = {
  getOutstanding: async (filters, limit, offset) => {
    // Basic outstanding relies on Export Documents vs received payments. 
    // Since there are no payments, outstanding is just the unpaid export docs or POs
    const query = `
      SELECT po.po_num, po.financial_year, po.status,
             s.company_name as supplier_name
      FROM purchase_orders po
      LEFT JOIN suppliers s ON s.id = po.supplier_id
      WHERE po.deleted_at IS NULL AND po.status != 'closed'
      ORDER BY po.id DESC
      LIMIT ? OFFSET ?
    `;
    const [rows] = await pool.query(query, [limit, offset]);
    
    const [countRows] = await pool.query(`SELECT COUNT(*) as total FROM purchase_orders WHERE deleted_at IS NULL AND status != 'closed'`);
    return { data: rows, total: countRows[0].total };
  },

  getIndex: async (filters, limit, offset) => {
    // Generic report might just aggregate orders over time
    const query = `
      SELECT oc.oc_num, oc.financial_year, oc.status,
             b.company_name as buyer_name,
             c.iso_code as currency_code
      FROM order_confirmations oc
      LEFT JOIN buyers b ON b.id = oc.buyer_id
      LEFT JOIN currencies c ON c.id = oc.currency_id
      WHERE oc.deleted_at IS NULL
      ORDER BY oc.id DESC
      LIMIT ? OFFSET ?
    `;
    const [rows] = await pool.query(query, [limit, offset]);
    
    const [countRows] = await pool.query(`SELECT COUNT(*) as total FROM order_confirmations WHERE deleted_at IS NULL`);
    return { data: rows, total: countRows[0].total };
  }
};
