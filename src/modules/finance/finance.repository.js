import { pool } from '../../config/database.js';

export const financeRepository = {
  getPurchaseBills: async (filters, limit, offset) => {
    // Purchase bills are often checklists of type "Purchase Bill" uploaded against Export Docs
    let query = `
      SELECT edc.*, 
             dct.name as checklist_type,
             ed.doc_num as export_document_num,
             b.company_name as buyer_name
      FROM export_document_checklists edc
      INNER JOIN document_checklist_types dct ON dct.id = edc.document_checklist_type_id
      INNER JOIN export_documents ed ON ed.id = edc.export_document_id
      LEFT JOIN buyers b ON b.id = ed.buyer_id
      WHERE ed.deleted_at IS NULL
    `;
    const params = [];
    
    // Add logic to filter specifically for purchase bill checklist types if needed, 
    // or just let the front-end filter, or check by type name
    query += ` ORDER BY edc.id DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const [rows] = await pool.query(query, params);
    
    const [countRows] = await pool.query(`
      SELECT COUNT(*) as total 
      FROM export_document_checklists edc
      INNER JOIN document_checklist_types dct ON dct.id = edc.document_checklist_type_id
      INNER JOIN export_documents ed ON ed.id = edc.export_document_id
      WHERE ed.deleted_at IS NULL
    `);
    
    return { data: rows, total: countRows[0].total };
  },

  getDebitNotes: async (filters, limit, offset) => {
    // Debit notes usually rely on Purchase Orders and Inward discrepancies
    const query = `
      SELECT po.po_num, po.financial_year, po.status,
             s.company_name as supplier_name
      FROM purchase_orders po
      LEFT JOIN suppliers s ON s.id = po.supplier_id
      WHERE po.deleted_at IS NULL
      ORDER BY po.id DESC
      LIMIT ? OFFSET ?
    `;
    const [rows] = await pool.query(query, [limit, offset]);
    
    const [countRows] = await pool.query(`SELECT COUNT(*) as total FROM purchase_orders WHERE deleted_at IS NULL`);
    return { data: rows, total: countRows[0].total };
  },

  getSupplierPayments: async (filters, limit, offset) => {
    const query = `
      SELECT po.po_num, po.financial_year, po.status,
             s.company_name as supplier_name
      FROM purchase_orders po
      LEFT JOIN suppliers s ON s.id = po.supplier_id
      WHERE po.deleted_at IS NULL
      ORDER BY po.id DESC
      LIMIT ? OFFSET ?
    `;
    const [rows] = await pool.query(query, [limit, offset]);
    
    const [countRows] = await pool.query(`SELECT COUNT(*) as total FROM purchase_orders WHERE deleted_at IS NULL`);
    return { data: rows, total: countRows[0].total };
  },

  getBuyerReceipts: async (filters, limit, offset) => {
    // Rely on Export Document totals
    const query = `
      SELECT ed.doc_num, ed.financial_year, ed.status,
             b.company_name as buyer_name,
             c.iso_code as currency_code
      FROM export_documents ed
      LEFT JOIN buyers b ON b.id = ed.buyer_id
      LEFT JOIN currencies c ON c.id = ed.currency_id
      WHERE ed.deleted_at IS NULL
      ORDER BY ed.id DESC
      LIMIT ? OFFSET ?
    `;
    const [rows] = await pool.query(query, [limit, offset]);
    
    const [countRows] = await pool.query(`SELECT COUNT(*) as total FROM export_documents WHERE deleted_at IS NULL`);
    return { data: rows, total: countRows[0].total };
  },

  getAgentCommission: async (filters, limit, offset) => {
    // Can rely on Orders that have agent attached
    const query = `
      SELECT ed.doc_num, ed.financial_year, ed.status,
             b.company_name as buyer_name,
             a.name as agent_name,
             b.agent_commission_type, b.agent_commission_value
      FROM export_documents ed
      LEFT JOIN buyers b ON b.id = ed.buyer_id
      LEFT JOIN agents a ON a.id = b.agent_id
      WHERE ed.deleted_at IS NULL AND b.agent_id IS NOT NULL
      ORDER BY ed.id DESC
      LIMIT ? OFFSET ?
    `;
    const [rows] = await pool.query(query, [limit, offset]);
    
    const [countRows] = await pool.query(`
      SELECT COUNT(*) as total 
      FROM export_documents ed
      LEFT JOIN buyers b ON b.id = ed.buyer_id
      WHERE ed.deleted_at IS NULL AND b.agent_id IS NOT NULL
    `);
    return { data: rows, total: countRows[0].total };
  }
};
