import { pool } from '../../config/database.js';
import { inquiryRepository } from './inquiry.repository.js';
import { companyScope } from '../../services/company-scope.service.js';
import { numberSeriesService } from '../../services/number-series.service.js';
import { orderFormatRepository } from '../order-format/order-format.repository.js';

export const STATUSES = ['draft', 'price_working', 'quote_sent', 'confirmed', 'converted_to_oc', 'lost'];

const isBlank = (v) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '');

/**
 * "2026-27" for any date from 2026-04-01 to 2027-03-31 — mirrors
 * App\Support\FinancialYear::forDate() exactly. Always computed from the
 * server's current date (FinancialYear::current()), never from inquiry_date.
 */
const financialYearFor = (date = new Date()) => {
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  const startYear = month >= 4 ? year : year - 1;
  return `${startYear}-${String(startYear + 1).slice(-2)}`;
};

export const inquiryService = {
  financialYearFor,

  findAll: async (filters) => {
    const result = await inquiryRepository.findAll(filters);
    const stats = await inquiryRepository.getStatusStats(filters.company_id);
    return { ...result, stats };
  },

  findById: async (id) => {
    return await inquiryRepository.findByIdIncludingRelations(id);
  },

  /**
   * Inquiry is the first financial-year-scoped number series — nothing
   * seeds a row for it ahead of time (NumberSeriesSeeder only seeds
   * `category`/`buyer`, neither FY-scoped), so one is provisioned here on
   * first use per year, matching NumberSeries::firstOrCreate() in the
   * Laravel source.
   */
  ensureNumberSeries: async (connection, financialYear) => {
    const [existing] = await connection.query(
      'SELECT id FROM number_series WHERE module = ? AND financial_year = ?',
      ['inquiry', financialYear]
    );
    if (existing.length === 0) {
      await connection.query(
        `INSERT INTO number_series (module, prefix, financial_year, current_number, padding, reset_yearly, created_at, updated_at)
         VALUES ('inquiry', 'INQ/', ?, 0, 3, 1, NOW(), NOW())`,
        [financialYear]
      );
    }
  },

  /**
   * Non-mutating preview of the next inquiry number, for the create form.
   * Falls back to "INQ/{FY}/001" when no series row exists yet for this
   * year — matches `$this->numbers->preview(...) ?? "INQ/{$FY}/001"`.
   */
  getNumberPreview: async (financialYear) => {
    const [rows] = await pool.query(
      'SELECT prefix, current_number, padding FROM number_series WHERE module = ? AND financial_year = ?',
      ['inquiry', financialYear]
    );
    if (rows.length === 0) return `INQ/${financialYear}/001`;
    const row = rows[0];
    const nextNum = row.current_number + 1;
    return `${row.prefix}${financialYear}/${String(nextNum).padStart(row.padding, '0')}`;
  },

  headerPayload: (data) => ({
    inquiry_date: data.inquiry_date,
    buyer_ref: data.buyer_ref || null,
    source_id: isBlank(data.source_id) ? null : data.source_id,
    buyer_id: isBlank(data.buyer_id) ? null : data.buyer_id,
    category_id: isBlank(data.category_id) ? null : data.category_id,
    document_format_id: isBlank(data.document_format_id) ? null : data.document_format_id,
    agent_id: isBlank(data.agent_id) ? null : data.agent_id,
    agent_commission_type: data.agent_commission_type || null,
    agent_commission_value: isBlank(data.agent_commission_value) ? null : data.agent_commission_value,
    currency_id: isBlank(data.currency_id) ? null : data.currency_id,
    exchange_rate: isBlank(data.exchange_rate) ? null : data.exchange_rate,
    expected_shipment_date: data.expected_shipment_date || null,
    delivery_details: data.delivery_details || null,
    packing_details: data.packing_details || null,
    remarks: data.remarks || null,
    status: data.status
  }),

  create: async (data, userId) => {
    let connection;
    try {
      connection = await pool.getConnection();
      await connection.beginTransaction();

      const financialYear = financialYearFor();
      await inquiryService.ensureNumberSeries(connection, financialYear);
      const inquiryNo = await numberSeriesService.next(connection, 'inquiry', financialYear);

      const companyId = await companyScope.assertActiveCompany(data.company_id, connection);
      await inquiryService.assertCompanyLinks(connection, companyId, data);

      const payload = {
        ...inquiryService.headerPayload(data),
        company_id: companyId,
        inquiry_no: inquiryNo,
        financial_year: financialYear,
        created_by: userId,
        updated_by: userId
      };

      const id = await inquiryRepository.create(connection, payload);

      await inquiryService.syncItems(connection, id, data.items || []);
      await inquiryService.syncFollowUps(connection, id, data.followups || [], userId);

      await connection.commit();

      return await inquiryRepository.findByIdIncludingRelations(id);
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

      const existing = await inquiryRepository.findById(id);
      if (!existing) {
        throw { status: 404, message: 'Inquiry not found' };
      }

      // Company is assigned once (legacy rows may still be unassigned) and never changed.
      const companyId = await companyScope.resolveOwnership(existing.company_id, data.company_id, connection);
      if (existing.company_id === null && companyId !== null) {
        const [ocs] = await connection.query('SELECT id FROM order_confirmations WHERE source_inquiry_id = ?', [id]);
        await companyScope.assertCompatible('order_confirmations', ocs.map((o) => o.id), companyId, 'An order confirmation raised from this inquiry', connection);
      }
      await inquiryService.assertCompanyLinks(connection, companyId, data);

      const payload = { ...inquiryService.headerPayload(data), company_id: companyId, updated_by: userId };

      await inquiryRepository.update(connection, id, payload);

      await inquiryService.syncItems(connection, id, data.items || []);
      await inquiryService.syncFollowUps(connection, id, data.followups || [], userId);

      await connection.commit();

      return await inquiryRepository.findByIdIncludingRelations(id);
    } catch (error) {
      if (connection) await connection.rollback();
      throw error;
    } finally {
      if (connection) connection.release();
    }
  },

  /**
   * Delete-then-recreate at the item level (cascades to colours/sizes/BOM
   * lines via ON DELETE CASCADE) — matches InquiryService::syncItems()
   * exactly, including that every posted item row is created regardless of
   * how blank it is; only the "at least one row" check lives in validation.
   */
  syncItems: async (connection, inquiryId, items) => {
    await inquiryRepository.deleteItems(connection, inquiryId);

    const itemsArray = Array.isArray(items) ? items : [];

    for (let index = 0; index < itemsArray.length; index++) {
      const itemData = itemsArray[index] || {};

      const customFiltered = {};
      if (itemData.custom && typeof itemData.custom === 'object' && !Array.isArray(itemData.custom)) {
        for (const [key, value] of Object.entries(itemData.custom)) {
          if (!isBlank(value)) customFiltered[key] = value;
        }
      }
      const customValues = Object.keys(customFiltered).length > 0 ? customFiltered : null;

      const itemId = await inquiryRepository.insertItem(connection, inquiryId, {
        sort_order: index,
        design_no: itemData.design_no || null,
        description: itemData.description || null,
        product_id: isBlank(itemData.product_id) ? null : itemData.product_id,
        supplier_id: isBlank(itemData.supplier_id) ? null : itemData.supplier_id,
        unit: itemData.unit || null,
        fob_value_id: isBlank(itemData.fob_value_id) ? null : itemData.fob_value_id,
        price: isBlank(itemData.price) ? null : itemData.price,
        cost_price: isBlank(itemData.cost_price) ? null : itemData.cost_price,
        status: itemData.status || 'draft',
        remarks: itemData.remarks || null,
        custom_values: customValues
      });

      let qty = 0;
      const colours = Array.isArray(itemData.colours) && itemData.colours.length > 0
        ? itemData.colours
        : [{ colour: null, sizes: [] }];

      for (let colourIndex = 0; colourIndex < colours.length; colourIndex++) {
        const colourData = colours[colourIndex] || {};
        const colourId = await inquiryRepository.insertColour(connection, itemId, {
          colour: colourData.colour || null,
          sort_order: colourIndex
        });

        const sizes = Array.isArray(colourData.sizes) ? colourData.sizes : [];
        for (let sizeIndex = 0; sizeIndex < sizes.length; sizeIndex++) {
          const sizeData = sizes[sizeIndex] || {};
          const sizeQty = isBlank(sizeData.qty) ? 0 : (parseInt(sizeData.qty, 10) || 0);

          // Server-computed: a size row with no label and zero qty is a
          // blank grid cell, not data — skipped rather than stored.
          if (isBlank(sizeData.size) && sizeQty === 0) continue;

          await inquiryRepository.insertSize(connection, colourId, {
            size: sizeData.size || '',
            qty: sizeQty,
            sort_order: sizeIndex
          });

          qty += sizeQty;
        }
      }

      // Never trust client qty/amount — always the sum of valid size rows
      // and price * qty, matching Item::update(['qty'=>.., 'amount'=>..]).
      const price = isBlank(itemData.price) ? 0 : Number(itemData.price);
      const amount = Math.round(qty * price * 100) / 100;
      await inquiryRepository.updateItemTotals(connection, itemId, qty, amount);

      const bomRows = Array.isArray(itemData.bom) ? itemData.bom : [];
      for (let bomIndex = 0; bomIndex < bomRows.length; bomIndex++) {
        const bomRow = bomRows[bomIndex] || {};
        if (isBlank(bomRow.component_name)) continue;

        await inquiryRepository.insertBomLine(connection, itemId, {
          sort_order: bomIndex,
          component_name: bomRow.component_name,
          qty: isBlank(bomRow.qty) ? 1 : bomRow.qty,
          unit: bomRow.unit || null,
          is_custom: bomRow.is_custom === undefined ? true : !!bomRow.is_custom,
          remarks: bomRow.remarks || null
        });
      }
    }
  },

  /**
   * Genuine diff, not delete-and-reinsert — existing follow-ups (posted
   * with an id) are left completely untouched, only removed ids are
   * deleted and id-less rows are created. Matches
   * InquiryService::syncFollowUps() exactly; there is no update path for
   * an existing follow-up.
   */
  syncFollowUps: async (connection, inquiryId, followups, userId) => {
    const followupsArray = Array.isArray(followups) ? followups : [];
    const posted = followupsArray.filter((row) => row && !isBlank(row.comment));

    const keepIds = posted
      .map((row) => row.id)
      .filter((id) => !isBlank(id))
      .map((id) => Number(id));

    await inquiryRepository.deleteFollowUpsNotIn(connection, inquiryId, keepIds);

    for (const row of posted) {
      if (!isBlank(row.id)) continue;

      await inquiryRepository.insertFollowUp(connection, inquiryId, {
        date: row.date || new Date().toISOString().slice(0, 10),
        comment: row.comment
      }, userId);
    }
  },

  /**
   * Unconditional — InquiryController::destroy() calls $inquiry->delete()
   * directly with no dependency check of any kind. Do not add one.
   */
  delete: async (id) => {
    const existing = await inquiryRepository.findById(id);
    if (!existing) {
      throw { status: 404, message: 'Inquiry not found' };
    }
    await inquiryRepository.softDelete(id);
  },

  // -- Lookups (create/edit form data) --

  getFormData: async () => {
    const financialYear = financialYearFor();

    const [buyers, categories, formats, agents, fobValues, currencies, sources, numberPreview] = await Promise.all([
      inquiryRepository.getActiveBuyersForForm(),
      inquiryRepository.getActiveCategoriesForForm(),
      inquiryService.getFormatsWithRelations(),
      inquiryRepository.getActiveAgentsBuyerType(),
      inquiryRepository.getActiveFobValuesForForm(),
      inquiryRepository.getActiveCurrenciesForForm(),
      inquiryRepository.getActiveSourcesForForm(),
      inquiryService.getNumberPreview(financialYear)
    ]);

    return { buyers, categories, formats, agents, fobValues, currencies, sources, statuses: STATUSES, financialYear, numberPreview };
  },

  /**
   * Full Order Format objects (units/columns/categories), not just id/name
   * — matches InquiryController::formData()'s `formats` payload, reusing
   * the existing Order Format repository rather than re-querying its
   * tables here.
   */
  getFormatsWithRelations: async () => {
    const [rows] = await pool.query("SELECT id FROM document_formats WHERE status = 'active' ORDER BY name ASC");
    const formats = [];
    for (const row of rows) {
      formats.push(await orderFormatRepository.findByIdIncludingRequiredRelations(row.id));
    }
    return formats;
  },

  products: async (categoryId, companyId) => {
    return await inquiryRepository.getProductsForCascade(categoryId, companyId);
  },

  suppliers: async (categoryId, companyId) => {
    return await inquiryRepository.getSuppliersForCascade(categoryId, companyId);
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
   * Quick-add for the Source field — firstOrCreate by trimmed name, same
   * shape as BuyerController::storeDesignation().
   */
  storeSource: async (name) => {
    const trimmed = name.trim();
    let source = await inquiryRepository.findSourceByName(trimmed);
    if (!source) {
      const id = await inquiryRepository.createSource(trimmed);
      source = { id, name: trimmed };
    }
    return source;
  }
};
