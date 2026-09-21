import { pool } from '../../config/database.js';
import { exportDocumentRepository } from './export-document.repository.js';
import { orderConfirmationRepository } from '../order-confirmation/order-confirmation.repository.js';

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

export const exportDocumentService = {
  raiseFromOrderConfirmation: async (orderConfirmationId, userId) => {
    let connection;
    try {
      connection = await pool.getConnection();
      await connection.beginTransaction();

      const oc = await orderConfirmationRepository.findById(orderConfirmationId);
      if (!oc) {
        throw new Error('Order Confirmation not found');
      }
      if (oc.status !== 'confirmed') {
        throw new Error('Only confirmed Order Confirmations can be converted to Export Documents');
      }

      // Generate doc_num
      const financialYear = financialYearFor();
      await ensureNumberSeries(connection, 'export', 'GT/EXP/', financialYear);
      const number = await nextNumber(connection, 'export', financialYear);
      const docNum = `GT/EXP/${number}/${financialYear}`;

      const [headerResult] = await connection.query(`
        INSERT INTO export_documents (
          doc_num, financial_year, order_confirmation_id, buyer_id, currency_id,
          incoterm_id, port_of_loading_id, port_of_discharge_id, shipment_method_id,
          status, created_by, updated_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, NOW(), NOW())
      `, [
        docNum,
        financialYear,
        oc.id,
        oc.buyer_id,
        oc.currency_id,
        oc.incoterm_id || null,
        oc.port_of_loading_id || null,
        oc.port_of_discharge_id || null,
        oc.shipment_method_id || null,
        userId,
        userId
      ]);

      const exportDocId = headerResult.insertId;

      // Copy Items, Colours, and Sizes from OC
      for (let i = 0; i < oc.items.length; i++) {
        const item = oc.items[i];
        const [itemResult] = await connection.query(`
          INSERT INTO export_document_items (
            export_document_id, order_confirmation_item_id, sort_order, design_no, description,
            product_id, unit, price, qty, amount, remarks, custom_values
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          exportDocId,
          item.id,
          i,
          item.design_no || null,
          item.description || null,
          item.product_id || null,
          item.unit || null,
          item.price || 0,
          item.qty || 0,
          item.amount || 0,
          item.remarks || null,
          item.custom_values ? JSON.stringify(item.custom_values) : null
        ]);

        const exportItemId = itemResult.insertId;

        if (item.colours && Array.isArray(item.colours)) {
          for (let j = 0; j < item.colours.length; j++) {
            const colour = item.colours[j];
            const [colourResult] = await connection.query(`
              INSERT INTO export_document_item_colours (export_document_item_id, colour, sort_order)
              VALUES (?, ?, ?)
            `, [exportItemId, colour.colour, j]);

            const exportColourId = colourResult.insertId;

            if (colour.sizes && Array.isArray(colour.sizes)) {
              for (let k = 0; k < colour.sizes.length; k++) {
                const size = colour.sizes[k];
                await connection.query(`
                  INSERT INTO export_document_item_sizes (export_document_item_colour_id, size, qty, sort_order)
                  VALUES (?, ?, ?, ?)
                `, [exportColourId, size.size, size.qty, k]);
              }
            }
          }
        }
      }

      // Initialize Checklists
      const [checklistTypes] = await connection.query('SELECT id FROM document_checklist_types WHERE status = "active"');
      for (const type of checklistTypes) {
        await connection.query(`
          INSERT INTO export_document_checklists (export_document_id, document_checklist_type_id, status)
          VALUES (?, ?, 'pending')
        `, [exportDocId, type.id]);
      }

      await connection.commit();
      return exportDocId;
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

      const existing = await exportDocumentRepository.findById(id);
      if (!existing) throw new Error('Export Document not found');

      if (existing.status === 'closed') {
        throw new Error('Cannot update a closed Export Document.');
      }

      await connection.query(`
        UPDATE export_documents SET
          buyer_id = ?, currency_id = ?, incoterm_id = ?, port_of_loading_id = ?,
          port_of_discharge_id = ?, shipment_method_id = ?, shipment_date = ?,
          invoice_no = ?, invoice_date = ?, exporter_ref = ?, buyer_ref_no = ?,
          buyer_ref_date = ?, other_reference = ?, consignee_name = ?, consignee_address = ?,
          pre_carriage_by = ?, place_of_receipt = ?, vessel_flight_no = ?, country_of_origin = ?,
          forwarder_name = ?, forwarder_address = ?, vehicle_no = ?, driver_cell = ?,
          final_destination = ?, marks_and_numbers = ?, total_cartons = ?, package_kind = ?,
          freight_amount = ?, insurance_amount = ?, gross_weight = ?, net_weight = ?,
          carton_dimensions = ?, booking_no = ?, bl_no = ?, voyage_no = ?,
          transshipment_port = ?, notify_party_name = ?, notify_party_address = ?, goods_description = ?,
          total_measurement = ?, ex_rate = ?, freight_terms = ?, freight_prepaid_at = ?,
          freight_payable_at = ?, total_prepaid_in = ?, no_of_original_bls = ?, bl_place_of_issue = ?,
          bl_date_of_issue = ?,
          status = ?, remarks = ?, updated_by = ?, updated_at = NOW()
        WHERE id = ?
      `, [
        data.buyer_id,
        data.currency_id,
        data.incoterm_id || null,
        data.port_of_loading_id || null,
        data.port_of_discharge_id || null,
        data.shipment_method_id || null,
        data.shipment_date || null,
        data.invoice_no || null,
        data.invoice_date || null,
        data.exporter_ref || null,
        data.buyer_ref_no || null,
        data.buyer_ref_date || null,
        data.other_reference || null,
        data.consignee_name || null,
        data.consignee_address || null,
        data.pre_carriage_by || null,
        data.place_of_receipt || null,
        data.vessel_flight_no || null,
        data.country_of_origin || null,
        data.forwarder_name || null,
        data.forwarder_address || null,
        data.vehicle_no || null,
        data.driver_cell || null,
        data.final_destination || null,
        data.marks_and_numbers || null,
        data.total_cartons || null,
        data.package_kind || null,
        data.freight_amount || null,
        data.insurance_amount || null,
        data.gross_weight || null,
        data.net_weight || null,
        data.carton_dimensions || null,
        data.booking_no || null,
        data.bl_no || null,
        data.voyage_no || null,
        data.transshipment_port || null,
        data.notify_party_name || null,
        data.notify_party_address || null,
        data.goods_description || null,
        data.total_measurement || null,
        data.ex_rate || null,
        data.freight_terms || null,
        data.freight_prepaid_at || null,
        data.freight_payable_at || null,
        data.total_prepaid_in || null,
        data.no_of_original_bls || null,
        data.bl_place_of_issue || null,
        data.bl_date_of_issue || null,
        data.status || existing.status,
        data.remarks || null,
        userId,
        id
      ]);

      if (data.items) {
        await exportDocumentRepository.syncItems(connection, id, data.items);
      }

      if (data.cartons) {
        await exportDocumentRepository.syncCartons(connection, id, data.cartons);
      }

      await connection.commit();
    } catch (error) {
      if (connection) await connection.rollback();
      throw error;
    } finally {
      if (connection) connection.release();
    }
  },

  delete: async (id) => {
    let connection;
    try {
      connection = await pool.getConnection();
      await connection.beginTransaction();

      const existing = await exportDocumentRepository.findById(id);
      if (!existing) throw new Error('Export Document not found');
      if (existing.status === 'closed') {
        throw new Error('Cannot delete a closed Export Document.');
      }

      await exportDocumentRepository.softDelete(connection, id);

      await connection.commit();
    } catch (error) {
      if (connection) await connection.rollback();
      throw error;
    } finally {
      if (connection) connection.release();
    }
  },

  updateChecklist: async (id, checklistId, file) => {
    let connection;
    try {
      connection = await pool.getConnection();
      await connection.beginTransaction();

      const existing = await exportDocumentRepository.findById(id);
      if (!existing) throw new Error('Export Document not found');
      if (existing.status === 'closed') {
        throw new Error('Cannot edit checklists on a closed Export Document.');
      }

      await exportDocumentRepository.updateChecklist(connection, id, checklistId, file.path, file.originalname);

      await connection.commit();
    } catch (error) {
      if (connection) await connection.rollback();
      throw error;
    } finally {
      if (connection) connection.release();
    }
  },

  resetChecklist: async (id, checklistId) => {
    let connection;
    try {
      connection = await pool.getConnection();
      await connection.beginTransaction();

      const existing = await exportDocumentRepository.findById(id);
      if (!existing) throw new Error('Export Document not found');
      if (existing.status === 'closed') {
        throw new Error('Cannot edit checklists on a closed Export Document.');
      }

      await exportDocumentRepository.resetChecklist(connection, id, checklistId);

      await connection.commit();
    } catch (error) {
      if (connection) await connection.rollback();
      throw error;
    } finally {
      if (connection) connection.release();
    }
  }
};
