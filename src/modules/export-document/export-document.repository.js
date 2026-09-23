import { pool } from '../../config/database.js';
import { companyScope } from '../../services/company-scope.service.js';

export const exportDocumentRepository = {
  findAll: async (filters = {}) => {
    let query = `
      SELECT ed.*,
        oc.oc_num as order_confirmation_num,
        b.company_name as buyer_name,
        c.iso_code as currency_code,
        u1.name as creator_name,
        cmp.code as company_code, COALESCE(cmp.short_name, cmp.name) as company_label
      FROM export_documents ed
      LEFT JOIN order_confirmations oc ON oc.id = ed.order_confirmation_id
      LEFT JOIN buyers b ON b.id = ed.buyer_id
      LEFT JOIN currencies c ON c.id = ed.currency_id
      LEFT JOIN users u1 ON u1.id = ed.created_by
      LEFT JOIN companies cmp ON cmp.id = ed.company_id
      WHERE ed.deleted_at IS NULL
    `;
    const params = [];

    if (filters.status) {
      query += ` AND ed.status = ?`;
      params.push(filters.status);
    }

    if (filters.buyer_id) {
      query += ` AND ed.buyer_id = ?`;
      params.push(filters.buyer_id);
    }

    const companyFilter = companyScope.filterSql('ed.company_id', companyScope.parseFilter(filters.company_id));
    query += companyFilter.sql;
    params.push(...companyFilter.params);

    query += ` ORDER BY ed.id DESC`;

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
      SELECT ed.*,
        oc.oc_num as order_confirmation_num,
        b.company_name as buyer_name,
        c.iso_code as currency_code,
        i.name as incoterm_name,
        pol.name as port_of_loading_name,
        pod.name as port_of_discharge_name,
        sm.name as shipment_method_name,
        cmp.code as company_code, COALESCE(cmp.short_name, cmp.name) as company_label
      FROM export_documents ed
      LEFT JOIN companies cmp ON cmp.id = ed.company_id
      LEFT JOIN order_confirmations oc ON oc.id = ed.order_confirmation_id
      LEFT JOIN buyers b ON b.id = ed.buyer_id
      LEFT JOIN currencies c ON c.id = ed.currency_id
      LEFT JOIN incoterms i ON i.id = ed.incoterm_id
      LEFT JOIN ports pol ON pol.id = ed.port_of_loading_id
      LEFT JOIN ports pod ON pod.id = ed.port_of_discharge_id
      LEFT JOIN shipment_methods sm ON sm.id = ed.shipment_method_id
      WHERE ed.id = ? AND ed.deleted_at IS NULL
    `, [id]);

    if (rows.length === 0) return null;
    const entry = rows[0];

    const [items] = await pool.query(`
      SELECT edi.*, p.name as product_name
      FROM export_document_items edi
      LEFT JOIN products p ON p.id = edi.product_id
      WHERE edi.export_document_id = ?
      ORDER BY edi.sort_order ASC
    `, [id]);

    // We should theoretically fetch colours and sizes here, but for standard CRUD, items might be enough.
    // If needed, we fetch colours and sizes.
    for (const item of items) {
      const [colours] = await pool.query(`
        SELECT edic.* FROM export_document_item_colours edic
        WHERE edic.export_document_item_id = ?
        ORDER BY edic.sort_order ASC
      `, [item.id]);

      for (const colour of colours) {
        const [sizes] = await pool.query(`
          SELECT edis.* FROM export_document_item_sizes edis
          WHERE edis.export_document_item_colour_id = ?
          ORDER BY edis.sort_order ASC
        `, [colour.id]);
        colour.sizes = sizes;
      }
      item.colours = colours;
    }

    entry.items = items;

    const [checklists] = await pool.query(`
      SELECT edc.*, dct.name as checklist_type_name, dct.code as checklist_type_code,
        dct.category as checklist_type_category, dct.variant_labels as checklist_type_variant_labels,
        dct.closes_shipment as checklist_type_closes_shipment
      FROM export_document_checklists edc
      LEFT JOIN document_checklist_types dct ON dct.id = edc.document_checklist_type_id
      WHERE edc.export_document_id = ?
      ORDER BY dct.sort_order ASC
    `, [id]);

    entry.checklists = checklists;

    const [cartons] = await pool.query(`
      SELECT * FROM export_document_cartons
      WHERE export_document_id = ?
      ORDER BY sort_order ASC
    `, [id]);

    for (const carton of cartons) {
      const [lines] = await pool.query(`
        SELECT * FROM export_document_carton_lines
        WHERE export_document_carton_id = ?
        ORDER BY sort_order ASC
      `, [carton.id]);
      carton.lines = lines;
    }

    entry.cartons = cartons;

    return entry;
  },

  syncCartons: async (connection, exportDocId, cartons = []) => {
    const cartonIds = cartons.filter(c => c.id).map(c => c.id);
    if (cartonIds.length > 0) {
      const placeholders = cartonIds.map(() => '?').join(',');
      await connection.query(`
        DELETE FROM export_document_cartons
        WHERE export_document_id = ? AND id NOT IN (${placeholders})
      `, [exportDocId, ...cartonIds]);
    } else {
      await connection.query(`
        DELETE FROM export_document_cartons
        WHERE export_document_id = ?
      `, [exportDocId]);
    }

    for (let i = 0; i < cartons.length; i++) {
      const carton = cartons[i];
      let cartonId = carton.id;

      if (cartonId) {
        await connection.query(`
          UPDATE export_document_cartons SET
            carton_no = ?, net_weight = ?, gross_weight = ?, dimensions = ?, sort_order = ?
          WHERE id = ? AND export_document_id = ?
        `, [carton.carton_no, carton.net_weight || null, carton.gross_weight || null, carton.dimensions || null, i, cartonId, exportDocId]);
      } else {
        const [res] = await connection.query(`
          INSERT INTO export_document_cartons (
            export_document_id, carton_no, net_weight, gross_weight, dimensions, sort_order
          ) VALUES (?, ?, ?, ?, ?, ?)
        `, [exportDocId, carton.carton_no, carton.net_weight || null, carton.gross_weight || null, carton.dimensions || null, i]);
        cartonId = res.insertId;
      }

      if (carton.lines && Array.isArray(carton.lines)) {
        const lineIds = carton.lines.filter(l => l.id).map(l => l.id);
        if (lineIds.length > 0) {
          const lPlaceholders = lineIds.map(() => '?').join(',');
          await connection.query(`
            DELETE FROM export_document_carton_lines
            WHERE export_document_carton_id = ? AND id NOT IN (${lPlaceholders})
          `, [cartonId, ...lineIds]);
        } else {
          await connection.query(`
            DELETE FROM export_document_carton_lines
            WHERE export_document_carton_id = ?
          `, [cartonId]);
        }

        for (let j = 0; j < carton.lines.length; j++) {
          const line = carton.lines[j];
          if (line.id) {
            await connection.query(`
              UPDATE export_document_carton_lines SET description = ?, unit = ?, qty = ?, sort_order = ? WHERE id = ?
            `, [line.description, line.unit || 'PCS', line.qty, j, line.id]);
          } else {
            await connection.query(`
              INSERT INTO export_document_carton_lines (export_document_carton_id, description, unit, qty, sort_order)
              VALUES (?, ?, ?, ?, ?)
            `, [cartonId, line.description, line.unit || 'PCS', line.qty, j]);
          }
        }
      }
    }
  },

  syncItems: async (connection, exportDocId, items = []) => {
    // Basic item sync for PUT operations
    const itemIds = items.filter(i => i.id).map(i => i.id);
    if (itemIds.length > 0) {
      const placeholders = itemIds.map(() => '?').join(',');
      await connection.query(`
        DELETE FROM export_document_items
        WHERE export_document_id = ? AND id NOT IN (${placeholders})
      `, [exportDocId, ...itemIds]);
    } else {
      await connection.query(`
        DELETE FROM export_document_items
        WHERE export_document_id = ?
      `, [exportDocId]);
    }

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      let ediId = item.id;
      const amount = item.qty * item.price;

      if (ediId) {
        await connection.query(`
          UPDATE export_document_items SET
            design_no = ?, description = ?, unit = ?, price = ?, qty = ?, amount = ?, remarks = ?, custom_values = ?, sort_order = ?
          WHERE id = ? AND export_document_id = ?
        `, [
          item.design_no || null,
          item.description || null,
          item.unit || null,
          item.price || 0,
          item.qty || 0,
          amount,
          item.remarks || null,
          item.custom_values ? JSON.stringify(item.custom_values) : null,
          i,
          ediId,
          exportDocId
        ]);
      } else {
        const [res] = await connection.query(`
          INSERT INTO export_document_items (
            export_document_id, order_confirmation_item_id, sort_order, design_no, description,
            product_id, unit, price, qty, amount, remarks, custom_values
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          exportDocId,
          item.order_confirmation_item_id || null,
          i,
          item.design_no || null,
          item.description || null,
          item.product_id || null,
          item.unit || null,
          item.price || 0,
          item.qty || 0,
          amount,
          item.remarks || null,
          item.custom_values ? JSON.stringify(item.custom_values) : null
        ]);
        ediId = res.insertId;
      }

      // Sync Colours and Sizes
      if (item.colours && Array.isArray(item.colours)) {
        const colourIds = item.colours.filter(c => c.id).map(c => c.id);
        if (colourIds.length > 0) {
          const cPlaceholders = colourIds.map(() => '?').join(',');
          await connection.query(`
            DELETE FROM export_document_item_colours
            WHERE export_document_item_id = ? AND id NOT IN (${cPlaceholders})
          `, [ediId, ...colourIds]);
        } else {
          await connection.query(`
            DELETE FROM export_document_item_colours
            WHERE export_document_item_id = ?
          `, [ediId]);
        }

        for (let j = 0; j < item.colours.length; j++) {
          const colour = item.colours[j];
          let edicId = colour.id;

          if (edicId) {
            await connection.query(`
              UPDATE export_document_item_colours SET colour = ?, sort_order = ? WHERE id = ?
            `, [colour.colour, j, edicId]);
          } else {
            const [cRes] = await connection.query(`
              INSERT INTO export_document_item_colours (export_document_item_id, colour, sort_order)
              VALUES (?, ?, ?)
            `, [ediId, colour.colour, j]);
            edicId = cRes.insertId;
          }

          if (colour.sizes && Array.isArray(colour.sizes)) {
            const sizeIds = colour.sizes.filter(s => s.id).map(s => s.id);
            if (sizeIds.length > 0) {
              const sPlaceholders = sizeIds.map(() => '?').join(',');
              await connection.query(`
                DELETE FROM export_document_item_sizes
                WHERE export_document_item_colour_id = ? AND id NOT IN (${sPlaceholders})
              `, [edicId, ...sizeIds]);
            } else {
              await connection.query(`
                DELETE FROM export_document_item_sizes
                WHERE export_document_item_colour_id = ?
              `, [edicId]);
            }

            for (let k = 0; k < colour.sizes.length; k++) {
              const size = colour.sizes[k];
              if (size.id) {
                await connection.query(`
                  UPDATE export_document_item_sizes SET size = ?, qty = ?, sort_order = ? WHERE id = ?
                `, [size.size, size.qty, k, size.id]);
              } else {
                await connection.query(`
                  INSERT INTO export_document_item_sizes (export_document_item_colour_id, size, qty, sort_order)
                  VALUES (?, ?, ?, ?)
                `, [edicId, size.size, size.qty, k]);
              }
            }
          }
        }
      }
    }
  },

  softDelete: async (connection, id) => {
    await connection.query('UPDATE export_documents SET deleted_at = NOW() WHERE id = ?', [id]);
  },

  updateChecklist: async (connection, id, checklistId, filePath, originalName) => {
    // If the checklist is pre-existing (like a generated checklist row)
    const [rows] = await connection.query(`SELECT id FROM export_document_checklists WHERE id = ? AND export_document_id = ?`, [checklistId, id]);
    if (rows.length === 0) {
      throw new Error('Checklist entry not found on this export document.');
    }
    await connection.query(`
      UPDATE export_document_checklists
      SET file_path = ?, original_name = ?, uploaded_at = NOW(), status = 'uploaded'
      WHERE id = ?
    `, [filePath, originalName, checklistId]);
  },

  resetChecklist: async (connection, id, checklistId) => {
    const [rows] = await connection.query(`SELECT id FROM export_document_checklists WHERE id = ? AND export_document_id = ?`, [checklistId, id]);
    if (rows.length === 0) {
      throw new Error('Checklist entry not found on this export document.');
    }
    await connection.query(`
      UPDATE export_document_checklists
      SET file_path = NULL, original_name = NULL, uploaded_at = NULL, generated_at = NULL, status = 'pending'
      WHERE id = ?
    `, [checklistId]);
  }
};
