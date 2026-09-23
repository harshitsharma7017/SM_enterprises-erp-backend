import { pool } from '../../config/database.js';

export const financeRepository = {
  getPurchaseBills: async (filters, limit, offset) => {
    // Original ERP: FinanceController::purchaseBills() filters checklist
    // rows to type code 'purchase_bills' only (whereHas('type', ...)).
    const query = `
      SELECT edc.*,
             dct.name as checklist_type,
             dct.code as checklist_type_code,
             dct.variant_labels as checklist_type_variant_labels,
             ed.doc_num as export_document_num,
             b.company_name as buyer_name
      FROM export_document_checklists edc
      INNER JOIN document_checklist_types dct ON dct.id = edc.document_checklist_type_id
      INNER JOIN export_documents ed ON ed.id = edc.export_document_id
      LEFT JOIN buyers b ON b.id = ed.buyer_id
      WHERE ed.deleted_at IS NULL AND dct.code = 'purchase_bills'
      ORDER BY edc.id DESC LIMIT ? OFFSET ?
    `;
    const [rows] = await pool.query(query, [limit, offset]);

    const [countRows] = await pool.query(`
      SELECT COUNT(*) as total
      FROM export_document_checklists edc
      INNER JOIN document_checklist_types dct ON dct.id = edc.document_checklist_type_id
      INNER JOIN export_documents ed ON ed.id = edc.export_document_id
      WHERE ed.deleted_at IS NULL AND dct.code = 'purchase_bills'
    `);

    return { data: rows, total: countRows[0].total };
  },

  getSupplierPayments: async (filters, limit, offset) => {
    // Original ERP: PurchaseOrder::totalAmount() — sum of line-item amounts.
    const query = `
      SELECT po.id, po.po_num, po.financial_year, po.status,
             s.company_name as supplier_name,
             COALESCE(SUM(poi.amount), 0) as total_amount
      FROM purchase_orders po
      LEFT JOIN suppliers s ON s.id = po.supplier_id
      LEFT JOIN purchase_order_items poi ON poi.purchase_order_id = po.id
      WHERE po.deleted_at IS NULL
      GROUP BY po.id
      ORDER BY po.id DESC
      LIMIT ? OFFSET ?
    `;
    const [rows] = await pool.query(query, [limit, offset]);

    const [countRows] = await pool.query(`SELECT COUNT(*) as total FROM purchase_orders WHERE deleted_at IS NULL`);
    return { data: rows, total: countRows[0].total };
  },

  getBuyerReceipts: async (filters, limit, offset) => {
    // Original ERP: ExportDocument::totalAmount() (sum of item amounts) plus
    // the Payment Received (Swift Copy) and eBRC checklist rows' status.
    // Node's own checklist-type seed (migration 018) uses 'payment_received_swift'
    // for the type the original calls 'payment_received' — same document, seeded
    // under a different code slug — so that's the code used here.
    const query = `
      SELECT ed.id, ed.doc_num, ed.financial_year, ed.status,
             b.company_name as buyer_name,
             c.iso_code as currency_code,
             COALESCE(item_totals.total_amount, 0) as total_amount,
             pay.status as payment_status,
             ebrc.status as ebrc_status
      FROM export_documents ed
      LEFT JOIN buyers b ON b.id = ed.buyer_id
      LEFT JOIN currencies c ON c.id = ed.currency_id
      LEFT JOIN (
        SELECT export_document_id, SUM(amount) as total_amount
        FROM export_document_items
        GROUP BY export_document_id
      ) item_totals ON item_totals.export_document_id = ed.id
      LEFT JOIN export_document_checklists pay
        ON pay.export_document_id = ed.id
        AND pay.document_checklist_type_id = (SELECT id FROM document_checklist_types WHERE code = 'payment_received_swift' LIMIT 1)
      LEFT JOIN export_document_checklists ebrc
        ON ebrc.export_document_id = ed.id
        AND ebrc.document_checklist_type_id = (SELECT id FROM document_checklist_types WHERE code = 'ebrc' LIMIT 1)
      WHERE ed.deleted_at IS NULL
      ORDER BY ed.id DESC
      LIMIT ? OFFSET ?
    `;
    const [rows] = await pool.query(query, [limit, offset]);

    const [countRows] = await pool.query(`SELECT COUNT(*) as total FROM export_documents WHERE deleted_at IS NULL`);
    return { data: rows, total: countRows[0].total };
  },

  getAgentCommission: async (filters, limit, offset) => {
    // Original ERP: PurchaseOrder::agentCommissionAmountLabel() — computed
    // from the Purchase Order's own Supplier -> Agent mapping (supplier's
    // agent_commission_type/value), NOT the buyer's. Both suppliers and
    // buyers have their own independent agent_id/commission columns; the
    // commission screen must read the supplier's.
    const query = `
      SELECT po.id, po.po_num, po.financial_year, po.status,
             s.company_name as supplier_name,
             a.name as agent_name,
             s.agent_commission_type, s.agent_commission_value,
             COALESCE(SUM(poi.amount), 0) as total_amount,
             COALESCE(SUM(COALESCE(poi.ordered_quantity, poi.qty)), 0) as total_qty
      FROM purchase_orders po
      LEFT JOIN suppliers s ON s.id = po.supplier_id
      LEFT JOIN agents a ON a.id = s.agent_id
      LEFT JOIN purchase_order_items poi ON poi.purchase_order_id = po.id
      WHERE po.deleted_at IS NULL AND s.agent_id IS NOT NULL
      GROUP BY po.id
      ORDER BY po.id DESC
      LIMIT ? OFFSET ?
    `;
    const [rows] = await pool.query(query, [limit, offset]);

    const [countRows] = await pool.query(`
      SELECT COUNT(*) as total
      FROM purchase_orders po
      LEFT JOIN suppliers s ON s.id = po.supplier_id
      WHERE po.deleted_at IS NULL AND s.agent_id IS NOT NULL
    `);
    return { data: rows, total: countRows[0].total };
  }
};
