import { pool } from '../../config/database.js';
import { orderConfirmationRepository } from './order-confirmation.repository.js';
import { purchaseOrderRepository } from '../purchase-order/purchase-order.repository.js';
import { numberSeriesService } from '../../services/number-series.service.js';
import { inquiryRepository } from '../inquiry/inquiry.repository.js';
import { buyerRepository } from '../buyer/buyer.repository.js';
import { companyScope } from '../../services/company-scope.service.js';

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

export const orderConfirmationService = {
  create: async (data, userId) => {
    let connection;
    try {
      connection = await pool.getConnection();
      await connection.beginTransaction();

      const financialYear = financialYearFor();
      await ensureNumberSeries(connection, 'oc', 'GT/', financialYear);
      const number = await numberSeriesService.nextNumber(connection, 'oc', financialYear);
      
      let buyerCode = 'NA';
      if (data.buyer_id) {
        const buyer = await buyerRepository.findById(data.buyer_id);
        if (buyer && buyer.display_code) buyerCode = buyer.display_code;
      }
      
      const oc_num = `GT/${buyerCode}/${number}/${financialYear}`;

      // Company comes from the source inquiry when there is one, else from the form.
      let companyId = null;
      if (data.source_inquiry_id) {
        const inquiry = await inquiryRepository.findById(data.source_inquiry_id);
        companyId = inquiry ? inquiry.company_id : null;
        if (companyId !== null && data.company_id && Number(data.company_id) !== companyId) {
          throw companyScope.error('Company must match the source inquiry.');
        }
      }
      if (companyId === null) {
        companyId = await companyScope.assertActiveCompany(data.company_id, connection);
      }
      await orderConfirmationService.assertCompanyLinks(connection, companyId, data);

      const payload = {
        ...data,
        company_id: companyId,
        oc_num,
        financial_year: financialYear,
        created_by: userId,
        updated_by: userId
      };

      const ocId = await orderConfirmationRepository.create(connection, payload);
      
      if (data.items && Array.isArray(data.items)) {
        await orderConfirmationRepository.syncItems(connection, ocId, data.items);
      }

      await connection.commit();
      return await orderConfirmationRepository.findById(ocId);
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

      const existing = await orderConfirmationRepository.findById(id);
      if (!existing) {
        const err = new Error('Order Confirmation not found');
        err.status = 404;
        throw err;
      }

      // Company is assigned once (legacy rows may still be unassigned) and never changed.
      const companyId = await companyScope.resolveOwnership(existing.company_id, data.company_id, connection);
      await orderConfirmationService.assertCompanyLinks(connection, companyId, data);
      if (existing.company_id === null && companyId !== null) {
        await orderConfirmationService.assignLegacyChain(connection, existing, companyId);
      }

      const payload = {
        ...data,
        company_id: companyId,
        updated_by: userId
      };

      await orderConfirmationRepository.update(connection, id, payload);
      
      if (data.items && Array.isArray(data.items)) {
        await orderConfirmationRepository.syncItems(connection, id, data.items);
      }

      await connection.commit();
      return await orderConfirmationRepository.findById(id);
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

      await orderConfirmationRepository.delete(connection, id);

      await connection.commit();
    } catch (error) {
      if (connection) await connection.rollback();
      throw error;
    } finally {
      if (connection) connection.release();
    }
  },

  /** Buyer and item products/suppliers may not belong to a different company. */
  assertCompanyLinks: async (connection, companyId, data) => {
    const items = data.items || [];
    await companyScope.assertLinks(companyId, {
      buyerIds: [data.buyer_id],
      productIds: items.map((item) => item && item.product_id),
      supplierIds: items.map((item) => item && item.supplier_id),
    }, connection);
  },

  /**
   * First-time company assignment on a legacy OC: the source inquiry must not
   * belong to another company, and the OC's still-unassigned downstream
   * records (POs, their inward entries, export documents) inherit the same
   * company — deterministic, because they can only have come from this OC.
   */
  assignLegacyChain: async (connection, oc, companyId) => {
    if (oc.source_inquiry_id) {
      await companyScope.assertCompatible('inquiries', [oc.source_inquiry_id], companyId, 'The source inquiry', connection);
    }

    const [pos] = await connection.query('SELECT id, supplier_id FROM purchase_orders WHERE order_confirmation_id = ?', [oc.id]);
    const poIds = pos.map((p) => p.id);
    await companyScope.assertCompatible('purchase_orders', poIds, companyId, 'A purchase order raised from this OC', connection);
    await companyScope.assertCompatible('suppliers', pos.map((p) => p.supplier_id), companyId, "A purchase order's supplier", connection);
    const [eds] = await connection.query('SELECT id FROM export_documents WHERE order_confirmation_id = ?', [oc.id]);
    await companyScope.assertCompatible('export_documents', eds.map((e) => e.id), companyId, 'An export document raised from this OC', connection);

    if (poIds.length > 0) {
      await connection.query('UPDATE purchase_orders SET company_id = ? WHERE id IN (?) AND company_id IS NULL', [companyId, poIds]);
      await connection.query('UPDATE inward_entries SET company_id = ? WHERE purchase_order_id IN (?) AND company_id IS NULL', [companyId, poIds]);
    }
    await connection.query('UPDATE export_documents SET company_id = ? WHERE order_confirmation_id = ? AND company_id IS NULL', [companyId, oc.id]);
  },

  convertFromInquiry: async (inquiryId, userId) => {
    let connection;
    try {
      connection = await pool.getConnection();
      await connection.beginTransaction();

      const inquiry = await inquiryRepository.findByIdIncludingRelations(inquiryId);
      if (!inquiry) {
        const err = new Error('Inquiry not found.');
        err.status = 404;
        throw err;
      }

      const confirmedItems = (inquiry.items || []).filter(item => item.status === 'confirmed');
      if (confirmedItems.length === 0) {
        const err = new Error('No items are at Confirmed status yet — nothing to convert.');
        err.status = 400;
        throw err;
      }

      const financialYear = financialYearFor();
      await ensureNumberSeries(connection, 'oc', 'GT/', financialYear);
      const number = await numberSeriesService.nextNumber(connection, 'oc', financialYear);
      
      let buyerCode = 'NA';
      if (inquiry.buyer_id) {
        const buyer = await buyerRepository.findById(inquiry.buyer_id);
        if (buyer && buyer.display_code) buyerCode = buyer.display_code;
      }
      
      const oc_num = `GT/${buyerCode}/${number}/${financialYear}`;
      const today = new Date().toISOString().split('T')[0];

      const headerPayload = {
        oc_num,
        financial_year: financialYear,
        mode: 'oc',
        oc_date: today,
        buyer_ref: inquiry.buyer_ref,
        source_inquiry_id: inquiry.id,
        // Inherited; NULL only when converting a legacy, unassigned inquiry.
        company_id: inquiry.company_id,
        buyer_id: inquiry.buyer_id,
        category_id: inquiry.category_id,
        document_format_id: inquiry.document_format_id,
        agent_id: inquiry.agent_id,
        agent_commission_type: inquiry.agent_commission_type,
        agent_commission_value: inquiry.agent_commission_value,
        currency_id: inquiry.currency_id,
        delivery_details: inquiry.delivery_details,
        packing_details: inquiry.packing_details,
        status: 'draft',
        created_by: userId,
        updated_by: userId
      };

      const ocId = await orderConfirmationRepository.create(connection, headerPayload);

      await orderConfirmationRepository.syncItems(connection, ocId, confirmedItems);

      for (const item of confirmedItems) {
        await connection.query(`
          UPDATE inquiry_items SET status = 'converted_to_oc' WHERE id = ?
        `, [item.id]);
      }

      const [[{ stillOpen }]] = await connection.query(`
        SELECT EXISTS(
          SELECT 1 FROM inquiry_items 
          WHERE inquiry_id = ? AND status NOT IN ('converted_to_oc', 'lost')
        ) as stillOpen
      `, [inquiry.id]);

      if (!stillOpen) {
        await connection.query(`
          UPDATE inquiries 
          SET status = 'converted_to_oc', converted_at = NOW(), updated_by = ? 
          WHERE id = ?
        `, [userId, inquiry.id]);
      }

      await connection.commit();
      return await orderConfirmationRepository.findById(ocId);
    } catch (error) {
      if (connection) await connection.rollback();
      throw error;
    } finally {
      if (connection) connection.release();
    }
  },

  raisePurchaseOrders: async (ocId, itemIds, userId) => {
    let connection;
    try {
      connection = await pool.getConnection();
      await connection.beginTransaction();

      const oc = await orderConfirmationRepository.findById(ocId);
      if (!oc) {
        const err = new Error('Order Confirmation not found.');
        err.status = 404;
        throw err;
      }
      
      if (oc.status !== 'confirmed') {
        const err = new Error('The buyer has not confirmed this OC yet — mark it Confirmed before raising a PO.');
        err.status = 400;
        throw err;
      }

      if (!itemIds || itemIds.length === 0) {
        const err = new Error('Select at least one item to raise a PO.');
        err.status = 400;
        throw err;
      }

      const items = await orderConfirmationRepository.getUnraisedItems(connection, ocId, itemIds);
      if (items.length === 0) {
        const err = new Error('Nothing to raise — the selected items have no supplier set, or are already on a PO.');
        err.status = 400;
        throw err;
      }

      const groupedBySupplier = {};
      for (const item of items) {
        if (!groupedBySupplier[item.supplier_id]) {
          groupedBySupplier[item.supplier_id] = [];
        }
        groupedBySupplier[item.supplier_id].push(item);
      }

      const financialYear = financialYearFor();
      const today = new Date().toISOString().split('T')[0];
      const purchaseOrders = [];

      for (const supplierId in groupedBySupplier) {
        const supplierItems = groupedBySupplier[supplierId];
        
        await ensureNumberSeries(connection, 'po', 'GT/PO/', financialYear);
        const number = await numberSeriesService.nextNumber(connection, 'po', financialYear);
        const po_num = `GT/PO/${number}/${financialYear}`;

        const poHeader = {
          po_num,
          financial_year: financialYear,
          order_confirmation_id: oc.id,
          company_id: oc.company_id,
          supplier_id: supplierId,
          po_date: today,
          delivery_details: oc.delivery_details,
          packing_details: oc.packing_details,
          status: 'draft',
          created_by: userId,
          updated_by: userId
        };

        const poId = await purchaseOrderRepository.create(connection, poHeader);
        
        const formattedItems = supplierItems.map(item => {
           return {
             ...item,
             order_confirmation_item_id: item.id
           };
        });

        await purchaseOrderRepository.syncItems(connection, poId, formattedItems);


        purchaseOrders.push({ id: poId, po_num });
      }

      await connection.commit();
      return purchaseOrders;
    } catch (error) {
      if (connection) await connection.rollback();
      throw error;
    } finally {
      if (connection) connection.release();
    }
  }
};
