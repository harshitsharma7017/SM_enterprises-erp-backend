import { pool } from '../../config/database.js';
import { companyScope } from '../../services/company-scope.service.js';

export const orderConfirmationRepository = {
  findAll: async (filters = {}) => {
    // Shared WHERE clause so the total below counts the same filtered set.
    let where = ' WHERE oc.deleted_at IS NULL';
    const params = [];

    if (filters.buyer_id) {
      where += ' AND oc.buyer_id = ?';
      params.push(filters.buyer_id);
    }
    if (filters.status) {
      where += ' AND oc.status = ?';
      params.push(filters.status);
    }
    if (filters.brand_id) {
      where += ' AND oc.brand_id = ?';
      params.push(Number(filters.brand_id));
    }
    if (filters.date_from) {
      where += ' AND oc.oc_date >= ?';
      params.push(filters.date_from);
    }
    if (filters.date_to) {
      where += ' AND oc.oc_date <= ?';
      params.push(filters.date_to);
    }
    if (filters.search) {
      const term = `%${filters.search}%`;
      where += ` AND (oc.oc_num LIKE ? OR oc.buyer_ref LIKE ? OR oc.remarks LIKE ? OR b.company_name LIKE ? OR b.display_code LIKE ?)`;
      params.push(term, term, term, term, term);
    }
    const companyFilter = companyScope.filterSql('oc.company_id', companyScope.parseFilter(filters.company_id));
    where += companyFilter.sql;
    params.push(...companyFilter.params);

    let sql = `
      SELECT oc.*,
             b.company_name as buyer_company_name, b.display_code as buyer_display_code,
             c.name as category_name, br.name as brand_name,
             cmp.code as company_code, COALESCE(cmp.short_name, cmp.name) as company_label
      FROM order_confirmations oc
      LEFT JOIN buyers b ON oc.buyer_id = b.id
      LEFT JOIN categories c ON oc.category_id = c.id
      LEFT JOIN brands br ON br.id = oc.brand_id
      LEFT JOIN companies cmp ON cmp.id = oc.company_id
    ` + where;

    const sortCol = ['id', 'oc_num', 'oc_date', 'status', 'created_at'].includes(filters.sort) ? filters.sort : 'created_at';
    const direction = String(filters.direction).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    sql += ` ORDER BY oc.${sortCol} ${direction}`;

    if (filters.limit) {
      sql += ' LIMIT ? OFFSET ?';
      params.push(Number(filters.limit), Number(filters.offset) || 0);
    }

    const [rows] = await pool.query(sql, params);
    
    const countSql = `
      SELECT COUNT(*) as total 
      FROM order_confirmations oc
      LEFT JOIN buyers b ON oc.buyer_id = b.id
    ` + where;
    const countParams = [...params];
    if (filters.limit) {
      countParams.splice(-2, 2); // remove limit and offset
    }
    const [[{ total }]] = await pool.query(countSql, countParams);

    return { rows, total };
  },

  /** Active brands of a company (brands are company-owned), for the order form. */
  findFormBrands: async (companyId) => {
    const id = Number(companyId);
    if (!Number.isInteger(id) || id <= 0) return [];
    const [rows] = await pool.query(
      "SELECT id, code, name FROM brands WHERE company_id = ? AND status = 'active' AND deleted_at IS NULL ORDER BY name",
      [id]
    );
    return rows;
  },

  findById: async (id) => {
    const [rows] = await pool.query(`
      SELECT oc.*, cmp.code as company_code, COALESCE(cmp.short_name, cmp.name) as company_label,
             br.name as brand_name, uc.name as canceller_name
      FROM order_confirmations oc
      LEFT JOIN companies cmp ON cmp.id = oc.company_id
      LEFT JOIN brands br ON br.id = oc.brand_id
      LEFT JOIN users uc ON uc.id = oc.cancelled_by
      WHERE oc.id = ? AND oc.deleted_at IS NULL
    `, [id]);
    
    if (!rows.length) return null;
    const oc = rows[0];

    const [items] = await pool.query(`
      SELECT * FROM order_confirmation_items 
      WHERE order_confirmation_id = ?
      ORDER BY sort_order ASC
    `, [id]);

    for (const item of items) {
      const [colours] = await pool.query(`
        SELECT * FROM order_confirmation_item_colours 
        WHERE order_confirmation_item_id = ? 
        ORDER BY sort_order ASC
      `, [item.id]);

      for (const colour of colours) {
        const [sizes] = await pool.query(`
          SELECT * FROM order_confirmation_item_sizes 
          WHERE order_confirmation_item_colour_id = ? 
          ORDER BY sort_order ASC
        `, [colour.id]);
        colour.sizes = sizes;
      }
      item.colours = colours;
    }
    
    oc.items = items;
    return oc;
  },

  create: async (connection, data) => {
    const { items, ...header } = data;
    const timestamp = new Date();
    
    const [result] = await connection.query(`
      INSERT INTO order_confirmations (
        company_id, oc_num, financial_year, mode, oc_date, buyer_ref, source_inquiry_id, buyer_id, brand_id, category_id,
        document_format_id, agent_id, agent_commission_type, agent_commission_value, currency_id,
        incoterm, ship_method, shipment_date, pol, pod, payment_terms, delivery_details, packing_details,
        remarks, status, created_by, updated_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      header.company_id ?? null, header.oc_num, header.financial_year, header.mode || 'oc', header.oc_date, header.buyer_ref || null,
      header.source_inquiry_id || null, header.buyer_id, header.brand_id || null, header.category_id, header.document_format_id,
      header.agent_id || null, header.agent_commission_type || null, header.agent_commission_value || null,
      header.currency_id, header.incoterm || null, header.ship_method || null, header.shipment_date || null,
      header.pol || null, header.pod || null, header.payment_terms || null, header.delivery_details || null,
      header.packing_details || null, header.remarks || null, header.status || 'draft',
      header.created_by || null, header.updated_by || null, timestamp, timestamp
    ]);

    return result.insertId;
  },

  update: async (connection, id, data) => {
    const timestamp = new Date();
    
    await connection.query(`
      UPDATE order_confirmations SET
        company_id = ?, mode = ?, oc_date = ?, buyer_ref = ?, buyer_id = ?, brand_id = ?, category_id = ?,
        document_format_id = ?, agent_id = ?, agent_commission_type = ?, agent_commission_value = ?,
        currency_id = ?, incoterm = ?, ship_method = ?, shipment_date = ?, pol = ?, pod = ?,
        payment_terms = ?, delivery_details = ?, packing_details = ?, remarks = ?, status = ?,
        updated_by = ?, updated_at = ?
      WHERE id = ? AND deleted_at IS NULL
    `, [
      data.company_id ?? null, data.mode || 'oc', data.oc_date, data.buyer_ref || null, data.buyer_id, data.brand_id || null, data.category_id,
      data.document_format_id, data.agent_id || null, data.agent_commission_type || null, data.agent_commission_value || null,
      data.currency_id, data.incoterm || null, data.ship_method || null, data.shipment_date || null,
      data.pol || null, data.pod || null, data.payment_terms || null, data.delivery_details || null,
      data.packing_details || null, data.remarks || null, data.status || 'draft',
      data.updated_by || null, timestamp, id
    ]);
  },

  delete: async (connection, id) => {
    await connection.query(`UPDATE order_confirmations SET deleted_at = NOW() WHERE id = ?`, [id]);
  },

  syncItems: async (connection, ocId, items = []) => {
    // Only delete items that have NOT been raised to a PO
    await connection.query(`
      DELETE FROM order_confirmation_items 
      WHERE order_confirmation_id = ? 
      AND id NOT IN (
        SELECT order_confirmation_item_id 
        FROM purchase_order_items 
        WHERE order_confirmation_item_id IS NOT NULL
      )
    `, [ocId]);

    const [[{ maxSort }]] = await connection.query(`
      SELECT IFNULL(MAX(sort_order), -1) as maxSort 
      FROM order_confirmation_items 
      WHERE order_confirmation_id = ?
    `, [ocId]);
    
    let sortOrder = parseInt(maxSort, 10) + 1;

    for (const item of items) {
      let qty = 0;
      let amount = 0;
      const price = parseFloat(item.price) || 0;
      
      // Calculate qty first from sizes if present
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

      amount = qty * price;
      
      const customValuesJson = item.custom_values ? JSON.stringify(item.custom_values) : null;

      const [itemResult] = await connection.query(`
        INSERT INTO order_confirmation_items (
          order_confirmation_id, sort_order, design_no, description, product_id, supplier_id,
          unit, fob_value_id, price, cost_price, qty, amount, remarks, custom_values
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        ocId, sortOrder++, item.design_no || null, item.description || null, item.product_id || null,
        item.supplier_id || null, item.unit || null, item.fob_value_id || null, item.price || null,
        item.cost_price || null, qty, amount, item.remarks || null, customValuesJson
      ]);

      const itemId = itemResult.insertId;

      if (item.colours && Array.isArray(item.colours)) {
        let colourSortOrder = 0;
        for (const colour of item.colours) {
          const [colourResult] = await connection.query(`
            INSERT INTO order_confirmation_item_colours (order_confirmation_item_id, colour, sort_order)
            VALUES (?, ?, ?)
          `, [itemId, colour.colour || null, colourSortOrder++]);

          const colourId = colourResult.insertId;

          if (colour.sizes && Array.isArray(colour.sizes)) {
            let sizeSortOrder = 0;
            for (const size of colour.sizes) {
              // Ignore completely empty size rows
              if (!size.size && (!size.qty || parseInt(size.qty, 10) === 0)) continue;

              await connection.query(`
                INSERT INTO order_confirmation_item_sizes (order_confirmation_item_colour_id, size, qty, sort_order)
                VALUES (?, ?, ?, ?)
              `, [colourId, size.size || '', parseInt(size.qty, 10) || 0, sizeSortOrder++]);
            }
          }
        }
      }
    }
  },
  
  markItemAsRaised: async (connection, itemId, poId) => {
    // Note: the schema doesn't have a raised_at column on order_confirmation_items, 
    // the Laravel code mentions it but it's likely part of purchase_orders or it was added in a later migration.
    // Let's just update purchase_order_id. I will check schema... Wait, I didn't see raised_at on the DESCRIBE output for order_confirmation_items!
    // The DESCRIBE for order_confirmation_items didn't have raised_at.
    await connection.query(`
      UPDATE order_confirmation_items 
      SET purchase_order_id = ? 
      WHERE id = ?
    `, [poId, itemId]);
  },

  getUnraisedItems: async (connection, ocId, itemIds) => {
    if (!itemIds || itemIds.length === 0) return [];
    
    const placeholders = itemIds.map(() => '?').join(',');
    
    const [items] = await connection.query(`
      SELECT * FROM order_confirmation_items 
      WHERE order_confirmation_id = ? 
        AND id IN (${placeholders}) 
        AND id NOT IN (
          SELECT order_confirmation_item_id 
          FROM purchase_order_items 
          WHERE order_confirmation_item_id IS NOT NULL
        )
        AND supplier_id IS NOT NULL
      ORDER BY supplier_id, sort_order ASC
    `, [ocId, ...itemIds]);

    for (const item of items) {
      const [colours] = await connection.query(`
        SELECT * FROM order_confirmation_item_colours 
        WHERE order_confirmation_item_id = ? 
        ORDER BY sort_order ASC
      `, [item.id]);

      for (const colour of colours) {
        const [sizes] = await connection.query(`
          SELECT * FROM order_confirmation_item_sizes 
          WHERE order_confirmation_item_colour_id = ? 
          ORDER BY sort_order ASC
        `, [colour.id]);
        colour.sizes = sizes;
      }
      item.colours = colours;
    }

    return items;
  }
};
