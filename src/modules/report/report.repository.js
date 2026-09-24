import { pool } from '../../config/database.js';
import { companyCondition } from './report-runner.js';

// Phase 14: both legacy reports now run for an explicit company scope
// (`scope` from parseCompany: all / one company / unassigned), applied here
// on the server. Response shapes are unchanged apart from each row carrying
// its company code.
export const reportRepository = {
  // Original ERP: ReportsController::outstanding() — ALL Purchase Orders
  // (not just open ones) and ALL Export Documents, each with its own
  // totalAmount() (sum of line-item amounts), unpaginated, plus the two
  // headline sums.
  getOutstanding: async (scope) => {
    const poCompany = companyCondition('po.company_id', scope);
    const [purchaseOrders] = await pool.query(`
      SELECT po.id, po.po_num, s.company_name as supplier_name, po.company_id, cmp.code AS company_code,
             COALESCE(SUM(poi.amount), 0) as total_amount
      FROM purchase_orders po
      LEFT JOIN suppliers s ON s.id = po.supplier_id
      LEFT JOIN companies cmp ON cmp.id = po.company_id
      LEFT JOIN purchase_order_items poi ON poi.purchase_order_id = po.id
      WHERE po.deleted_at IS NULL${poCompany.sql}
      GROUP BY po.id
      ORDER BY po.id DESC
    `, poCompany.params);

    const edCompany = companyCondition('ed.company_id', scope);
    const [exportDocuments] = await pool.query(`
      SELECT ed.id, ed.doc_num, b.company_name as buyer_name, ed.company_id, cmp.code AS company_code,
             COALESCE(SUM(edi.amount), 0) as total_amount
      FROM export_documents ed
      LEFT JOIN buyers b ON b.id = ed.buyer_id
      LEFT JOIN companies cmp ON cmp.id = ed.company_id
      LEFT JOIN export_document_items edi ON edi.export_document_id = ed.id
      WHERE ed.deleted_at IS NULL${edCompany.sql}
      GROUP BY ed.id
      ORDER BY ed.id DESC
    `, edCompany.params);

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
  getIndex: async (scope) => {
    const po = companyCondition('company_id', scope);
    const ed = companyCondition('company_id', scope);
    const [[poCount]] = await pool.query(`SELECT COUNT(*) as count FROM purchase_orders WHERE deleted_at IS NULL${po.sql}`, po.params);
    const [[edCount]] = await pool.query(`SELECT COUNT(*) as count FROM export_documents WHERE deleted_at IS NULL${ed.sql}`, ed.params);
    const [[openCount]] = await pool.query(`SELECT COUNT(*) as count FROM export_documents WHERE deleted_at IS NULL AND status != 'closed'${ed.sql}`, ed.params);
    const [[closedCount]] = await pool.query(`SELECT COUNT(*) as count FROM export_documents WHERE deleted_at IS NULL AND status = 'closed'${ed.sql}`, ed.params);

    return {
      purchase_orders: poCount.count,
      export_documents: edCount.count,
      open_shipments: openCount.count,
      closed_shipments: closedCount.count,
    };
  },

  /** Filter choices for a report, limited to the chosen company (shared suppliers / buyers included). */
  findOptions: async (kinds, scope) => {
    const owned = (column) => companyCondition(column, scope);
    const shared = (column) => (scope.id ? { sql: ` AND (${column} = ? OR ${column} IS NULL)`, params: [scope.id] } : companyCondition(column, scope));
    const queries = {
      suppliers: ['SELECT id, company_name AS name FROM suppliers WHERE deleted_at IS NULL', shared('company_id'), 'company_name'],
      buyers: ['SELECT id, company_name AS name FROM buyers WHERE deleted_at IS NULL', shared('company_id'), 'company_name'],
      brands: ['SELECT id, name FROM brands WHERE deleted_at IS NULL', owned('company_id'), 'name'],
      products: ['SELECT id, name FROM products WHERE deleted_at IS NULL', owned('company_id'), 'name'],
      material_types: ['SELECT id, name FROM material_types WHERE deleted_at IS NULL', owned('company_id'), 'name'],
      locations: ["SELECT id, CONCAT(code, ' · ', name) AS name FROM stock_locations WHERE 1 = 1", owned('company_id'), 'code'],
    };
    const out = {};
    for (const kind of kinds) {
      const [base, cond, order] = queries[kind];
      const [rows] = await pool.query(`${base}${cond.sql} ORDER BY ${order} LIMIT 2000`, cond.params);
      out[kind] = rows;
    }
    return out;
  },
};
