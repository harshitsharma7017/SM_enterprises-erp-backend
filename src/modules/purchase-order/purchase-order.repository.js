import { pool } from '../../config/database.js';
import { companyScope } from '../../services/company-scope.service.js';
import { RECEIVED_CONDITION } from '../inward-entry/inward-entry.repository.js';

export const purchaseOrderRepository = {
  findAll: async (filters = {}) => {
    // Shared WHERE clause so the total below counts the same filtered set.
    let where = ' WHERE po.deleted_at IS NULL';
    const params = [];

    if (filters.supplier_id) {
      where += ' AND po.supplier_id = ?';
      params.push(filters.supplier_id);
    }
    if (filters.status) {
      where += ' AND po.status = ?';
      params.push(filters.status);
    }
    if (filters.search) {
      const term = `%${filters.search}%`;
      where += ` AND (po.po_num LIKE ? OR po.remarks LIKE ? OR s.company_name LIKE ? OR s.display_code LIKE ? OR oc.oc_num LIKE ?)`;
      params.push(term, term, term, term, term);
    }
    if (['order_confirmation', 'material_requirement', 'material_plan'].includes(filters.origin)) {
      where += ' AND po.origin = ?';
      params.push(filters.origin);
    }
    const companyFilter = companyScope.filterSql('po.company_id', companyScope.parseFilter(filters.company_id));
    where += companyFilter.sql;
    params.push(...companyFilter.params);

    let sql = `
      SELECT po.*,
             s.company_name as supplier_company_name, s.display_code as supplier_display_code,
             oc.oc_num,
             cmp.code as company_code, COALESCE(cmp.short_name, cmp.name) as company_label,
             mp.plan_no as material_plan_no
      FROM purchase_orders po
      LEFT JOIN suppliers s ON po.supplier_id = s.id
      LEFT JOIN order_confirmations oc ON po.order_confirmation_id = oc.id
      LEFT JOIN companies cmp ON cmp.id = po.company_id
      LEFT JOIN material_plans mp ON mp.id = po.material_plan_id
    ` + where;

    const sortCol = ['id', 'po_num', 'po_date', 'status', 'created_at'].includes(filters.sort) ? filters.sort : 'created_at';
    const direction = String(filters.direction).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    sql += ` ORDER BY po.${sortCol} ${direction}`;

    if (filters.limit) {
      sql += ' LIMIT ? OFFSET ?';
      params.push(Number(filters.limit), Number(filters.offset) || 0);
    }

    const [rows] = await pool.query(sql, params);
    
    const countSql = `
      SELECT COUNT(*) as total 
      FROM purchase_orders po
      LEFT JOIN suppliers s ON po.supplier_id = s.id
      LEFT JOIN order_confirmations oc ON po.order_confirmation_id = oc.id
    ` + where;
    const countParams = [...params];
    if (filters.limit) {
      countParams.splice(-2, 2);
    }
    const [[{ total }]] = await pool.query(countSql, countParams);

    return { rows, total };
  },

  findById: async (id) => {
    const [rows] = await pool.query(`
      SELECT po.*, cmp.code as company_code, COALESCE(cmp.short_name, cmp.name) as company_label,
             s.company_name as supplier_company_name, s.display_code as supplier_display_code,
             oc.oc_num, mp.plan_no as material_plan_no, mp.title as material_plan_title,
             uc.name as confirmer_name, ux.name as canceller_name
      FROM purchase_orders po
      LEFT JOIN companies cmp ON cmp.id = po.company_id
      LEFT JOIN suppliers s ON s.id = po.supplier_id
      LEFT JOIN order_confirmations oc ON oc.id = po.order_confirmation_id
      LEFT JOIN material_plans mp ON mp.id = po.material_plan_id
      LEFT JOIN users uc ON uc.id = po.confirmed_by
      LEFT JOIN users ux ON ux.id = po.cancelled_by
      WHERE po.id = ? AND po.deleted_at IS NULL
    `, [id]);
    
    if (!rows.length) return null;
    const po = rows[0];

    const [items] = await pool.query(`
      SELECT * FROM purchase_order_items 
      WHERE purchase_order_id = ?
      ORDER BY sort_order ASC
    `, [id]);

    for (const item of items) {
      const [colours] = await pool.query(`
        SELECT * FROM purchase_order_item_colours 
        WHERE purchase_order_item_id = ? 
        ORDER BY sort_order ASC
      `, [item.id]);

      for (const colour of colours) {
        const [sizes] = await pool.query(`
          SELECT * FROM purchase_order_item_sizes 
          WHERE purchase_order_item_colour_id = ? 
          ORDER BY sort_order ASC
        `, [colour.id]);
        colour.sizes = sizes;
      }
      item.colours = colours;
    }
    
    // Receiving progress per line: quantity on POSTED goods receipts.
    const [received] = await pool.query(`
      SELECT iei.purchase_order_item_id, SUM(COALESCE(iei.received_quantity, iei.received_qty)) AS received
      FROM inward_entry_items iei
      JOIN inward_entries ie ON ie.id = iei.inward_entry_id
      JOIN purchase_order_items poi ON poi.id = iei.purchase_order_item_id
      WHERE poi.purchase_order_id = ? AND ${RECEIVED_CONDITION}
      GROUP BY iei.purchase_order_item_id
    `, [id]);
    const receivedById = Object.fromEntries(received.map((r) => [r.purchase_order_item_id, Number(r.received)]));
    // Quantity the mill shipped straight to the customer (posted direct dispatches).
    const [direct] = await pool.query(`
      SELECT di.purchase_order_item_id, SUM(di.quantity) AS direct_qty
      FROM dispatch_items di JOIN dispatches d ON d.id = di.dispatch_id
      JOIN purchase_order_items poi ON poi.id = di.purchase_order_item_id
      WHERE poi.purchase_order_id = ? AND d.status = 'posted' AND d.dispatch_type = 'DIRECT_SUPPLIER_DISPATCH'
      GROUP BY di.purchase_order_item_id
    `, [id]);
    const directById = Object.fromEntries(direct.map((r) => [r.purchase_order_item_id, Number(r.direct_qty)]));
    for (const item of items) {
      const ordered = Number(item.ordered_quantity ?? item.qty) || 0;
      item.received_quantity = receivedById[item.id] || 0;
      item.direct_dispatched_quantity = directById[item.id] || 0;
      item.pending_quantity = Math.max(ordered - item.received_quantity - item.direct_dispatched_quantity, 0);
    }

    po.items = items;

    const [receipts] = await pool.query(`
      SELECT ie.id, ie.inward_no, ie.inward_date, ie.entry_type, ie.receipt_status, ie.status AS qc_status,
             (SELECT COUNT(*) FROM lots l WHERE l.inward_entry_id = ie.id) AS lots_count
      FROM inward_entries ie
      WHERE ie.purchase_order_id = ? AND ie.deleted_at IS NULL
      ORDER BY ie.id ASC
    `, [id]);
    po.receipts = receipts;

    const [dispatches] = await pool.query(`
      SELECT d.id, d.dispatch_no, d.dispatch_date, d.status, d.destination_name, b.company_name AS buyer_name
      FROM dispatches d LEFT JOIN buyers b ON b.id = d.buyer_id
      WHERE d.purchase_order_id = ? ORDER BY d.id
    `, [id]);
    po.direct_dispatches = dispatches;

    // Planning-origin lines: trace each back to plan → requirement → projection.
    if (po.origin !== 'order_confirmation') {
      const [trace] = await pool.query(`
        SELECT poi.id AS line_id, poi.material_requirement_id, mr.requirement_no, mr.status AS requirement_status,
               mr.brand_projection_id, bp.projection_no, br.name AS brand_name,
               mpi.material_plan_id, mp.plan_no, p.name AS product_name, p.item_group_code,
               u.code AS uom_code, u.decimal_places AS uom_decimal_places
        FROM purchase_order_items poi
        LEFT JOIN material_requirements mr ON mr.id = poi.material_requirement_id
        LEFT JOIN brand_projections bp ON bp.id = mr.brand_projection_id
        LEFT JOIN brand_projection_items bpi ON bpi.id = mr.brand_projection_item_id
        LEFT JOIN brands br ON br.id = bp.brand_id
        LEFT JOIN material_plan_items mpi ON mpi.id = poi.material_plan_item_id
        LEFT JOIN material_plans mp ON mp.id = mpi.material_plan_id
        LEFT JOIN products p ON p.id = poi.product_id
        LEFT JOIN uoms u ON u.id = bpi.uom_id
        WHERE poi.purchase_order_id = ?
      `, [id]);
      const traceById = Object.fromEntries(trace.map((t) => [t.line_id, t]));
      po.items = items.map((item) => ({ ...item, trace: traceById[item.id] || null }));
    }

    const [timeline] = await pool.query(`
      SELECT * FROM purchase_order_timeline_entries
      WHERE purchase_order_id = ?
      ORDER BY sort_order ASC
    `, [id]);
    
    po.timeline = timeline;

    return po;
  },

  create: async (connection, data) => {
    const timestamp = new Date();
    
    const [result] = await connection.query(`
      INSERT INTO purchase_orders (
        company_id, po_num, financial_year, order_confirmation_id, supplier_id, po_date,
        dispatch_date, delivery_details, packing_details, remarks, status, 
        created_by, updated_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      data.company_id ?? null, data.po_num, data.financial_year, data.order_confirmation_id, data.supplier_id, data.po_date,
      data.dispatch_date || null, data.delivery_details || null, data.packing_details || null, 
      data.remarks || null, data.status || 'draft',
      data.created_by || null, data.updated_by || null, timestamp, timestamp
    ]);

    return result.insertId;
  },

  update: async (connection, id, data) => {
    const timestamp = new Date();
    
    await connection.query(`
      UPDATE purchase_orders SET
        po_date = ?, dispatch_date = ?, delivery_details = ?, packing_details = ?, 
        remarks = ?, status = ?, updated_by = ?, updated_at = ?
      WHERE id = ? AND deleted_at IS NULL
    `, [
      data.po_date, data.dispatch_date || null, data.delivery_details || null, data.packing_details || null,
      data.remarks || null, data.status || 'draft', data.updated_by || null, timestamp, id
    ]);
  },

  delete: async (connection, id) => {
    await connection.query(`UPDATE purchase_orders SET deleted_at = NOW() WHERE id = ?`, [id]);
  },

  syncItems: async (connection, poId, items = []) => {
    await connection.query(`DELETE FROM purchase_order_items WHERE purchase_order_id = ?`, [poId]);

    let sortOrder = 0;

    for (const item of items) {
      let qty = 0;
      let amount = 0;
      const costPrice = parseFloat(item.cost_price) || 0;
      
      if (item.colours && Array.isArray(item.colours)) {
        for (const colour of item.colours) {
          if (colour.sizes && Array.isArray(colour.sizes)) {
            for (const size of colour.sizes) {
              qty += parseInt(size.qty, 10) || 0;
            }
          }
        }
      }
      
      if (qty === 0) {
        qty = parseInt(item.qty, 10) || 0;
      }
      
      amount = qty * costPrice;
      
      const customValuesJson = item.custom_values ? JSON.stringify(item.custom_values) : null;

      const [itemResult] = await connection.query(`
        INSERT INTO purchase_order_items (
          purchase_order_id, order_confirmation_item_id, sort_order, design_no, description, 
          product_id, unit, cost_price, qty, amount, remarks, custom_values
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        poId, item.order_confirmation_item_id || null, sortOrder++, item.design_no || null, item.description || null, 
        item.product_id || null, item.unit || null, item.cost_price || null, qty, amount, 
        item.remarks || null, customValuesJson
      ]);

      const itemId = itemResult.insertId;

      if (item.colours && Array.isArray(item.colours)) {
        let colourSortOrder = 0;
        for (const colour of item.colours) {
          const [colourResult] = await connection.query(`
            INSERT INTO purchase_order_item_colours (purchase_order_item_id, colour, sort_order)
            VALUES (?, ?, ?)
          `, [itemId, colour.colour || null, colourSortOrder++]);

          const colourId = colourResult.insertId;

          if (colour.sizes && Array.isArray(colour.sizes)) {
            let sizeSortOrder = 0;
            for (const size of colour.sizes) {
              if (!size.size && (!size.qty || parseInt(size.qty, 10) === 0)) continue;

              await connection.query(`
                INSERT INTO purchase_order_item_sizes (purchase_order_item_colour_id, size, qty, sort_order)
                VALUES (?, ?, ?, ?)
              `, [colourId, size.size || '', parseInt(size.qty, 10) || 0, sizeSortOrder++]);
            }
          }
        }
      }
    }
  },

  syncTimeline: async (connection, poId, timeline = []) => {
    await connection.query(`DELETE FROM purchase_order_timeline_entries WHERE purchase_order_id = ?`, [poId]);
    
    let sortOrder = 0;
    
    for (const row of timeline) {
      if (!row.date && !row.note) continue;
      
      const entryDate = row.date || new Date().toISOString().split('T')[0];
      const note = row.note || '';
      const qty = (row.qty !== null && row.qty !== undefined && row.qty !== '') ? parseInt(row.qty, 10) : null;
      
      await connection.query(`
        INSERT INTO purchase_order_timeline_entries (
          purchase_order_id, entry_date, note, qty, sort_order
        ) VALUES (?, ?, ?, ?, ?)
      `, [poId, entryDate, note, qty, sortOrder++]);
    }
  }
};
