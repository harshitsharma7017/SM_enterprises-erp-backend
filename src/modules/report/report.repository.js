import { pool } from '../../config/database.js';

export const reportRepository = {
  // Original ERP: ReportsController::outstanding() — ALL Purchase Orders
  // (not just open ones) and ALL Export Documents, each with its own
  // totalAmount() (sum of line-item amounts), unpaginated, plus the two
  // headline sums.
  getOutstanding: async () => {
    const [purchaseOrders] = await pool.query(`
      SELECT po.id, po.po_num, s.company_name as supplier_name,
             COALESCE(SUM(poi.amount), 0) as total_amount
      FROM purchase_orders po
      LEFT JOIN suppliers s ON s.id = po.supplier_id
      LEFT JOIN purchase_order_items poi ON poi.purchase_order_id = po.id
      WHERE po.deleted_at IS NULL
      GROUP BY po.id
      ORDER BY po.id DESC
    `);

    const [exportDocuments] = await pool.query(`
      SELECT ed.id, ed.doc_num, b.company_name as buyer_name,
             COALESCE(SUM(edi.amount), 0) as total_amount
      FROM export_documents ed
      LEFT JOIN buyers b ON b.id = ed.buyer_id
      LEFT JOIN export_document_items edi ON edi.export_document_id = ed.id
      WHERE ed.deleted_at IS NULL
      GROUP BY ed.id
      ORDER BY ed.id DESC
    `);

    const supplierOutstanding = purchaseOrders.reduce((sum, po) => sum + Number(po.total_amount), 0);
    const buyerOutstanding = exportDocuments.reduce((sum, doc) => sum + Number(doc.total_amount), 0);

    return {
      purchase_orders: purchaseOrders,
      export_documents: exportDocuments,
      supplier_outstanding: supplierOutstanding,
      buyer_outstanding: buyerOutstanding,
    };
  },

  // Original ERP: ReportsController::index() — dashboard stat counts, not a list.
  getIndex: async () => {
    const [[poCount]] = await pool.query(`SELECT COUNT(*) as count FROM purchase_orders WHERE deleted_at IS NULL`);
    const [[edCount]] = await pool.query(`SELECT COUNT(*) as count FROM export_documents WHERE deleted_at IS NULL`);
    const [[openCount]] = await pool.query(`SELECT COUNT(*) as count FROM export_documents WHERE deleted_at IS NULL AND status != 'closed'`);
    const [[closedCount]] = await pool.query(`SELECT COUNT(*) as count FROM export_documents WHERE deleted_at IS NULL AND status = 'closed'`);

    return {
      purchase_orders: poCount.count,
      export_documents: edCount.count,
      open_shipments: openCount.count,
      closed_shipments: closedCount.count,
    };
  }
};
