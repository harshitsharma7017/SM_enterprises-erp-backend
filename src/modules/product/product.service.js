import { pool } from '../../config/database.js';
import { productRepository } from './product.repository.js';
import { companyScope } from '../../services/company-scope.service.js';

const SCHEMES = ['drawback', 'rosctl', 'rodtep'];
const TWO_PERCENT_SCHEMES = ['rosctl'];

const isBlank = (v) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '');

// "5%" rather than "5.00%" — mirrors GstRate::label().
const formatGstRateLabel = (rate) => {
  const fixed = Number(rate).toFixed(2);
  const trimmed = fixed.replace(/0+$/, '').replace(/\.$/, '');
  return `${trimmed}%`;
};

export const productService = {

  findAll: async (filters) => {
    return await productRepository.findAll(filters);
  },

  findById: async (id) => {
    return await productRepository.findByIdIncludingRelations(id);
  },

  /**
   * sq_mtr_per_unit = (fabric_length_mtr * fabric_width_inch) / 39.3701.
   * Laravel derives this via a MySQL STORED GENERATED column; the current
   * live schema has a plain writable decimal(15,2) column instead, so the
   * value must be computed here and written explicitly. Null unless both
   * dimensions are present.
   */
  computeSqMtrPerUnit: (fabricLengthMtr, fabricWidthInch) => {
    if (isBlank(fabricLengthMtr) || isBlank(fabricWidthInch)) {
      return null;
    }
    const length = Number(fabricLengthMtr);
    const width = Number(fabricWidthInch);
    if (Number.isNaN(length) || Number.isNaN(width)) {
      return null;
    }
    return (length * width) / 39.3701;
  },

  create: async (data, userId) => {
    let connection;
    try {
      connection = await pool.getConnection();
      await connection.beginTransaction();

      const payload = {
        company_id: Number(data.company_id),
        category_id: data.category_id,
        item_group_code: data.item_group_code,
        name: data.name,
        name_on_export_document: data.name_on_export_document || null,
        barcode: data.barcode || null,
        unit_po: data.unit_po || null,
        unit_export: data.unit_export || null,
        hsn_code: data.hsn_code || null,
        drawback_sr_no: data.drawback_sr_no || null,
        price_band_id: data.price_band_id || null,
        gst_rate_id: data.gst_rate_id || null,
        fabric_length_mtr: isBlank(data.fabric_length_mtr) ? null : data.fabric_length_mtr,
        fabric_width_inch: isBlank(data.fabric_width_inch) ? null : data.fabric_width_inch,
        sq_mtr_per_unit: productService.computeSqMtrPerUnit(data.fabric_length_mtr, data.fabric_width_inch),
        // `comments` is intentionally never read from `data` here — the
        // current locked schema has no products.comments column.
        description: data.description || null,
        status: data.status,
        remarks: data.remarks || null,
        created_by: userId,
        updated_by: userId
      };

      const productId = await productRepository.create(connection, payload);

      await productService.syncIncentives(connection, productId, data.incentives || {});
      await productService.syncBomItems(connection, productId, data.bom || []);

      await connection.commit();

      return await productRepository.findByIdIncludingRelations(productId);
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

      const existing = await productRepository.findById(id);
      if (!existing) {
        throw { status: 404, message: 'Product not found' };
      }

      if (Number(data.company_id) !== existing.company_id) {
        await companyScope.assertChangedOwnerActive(existing.company_id, Number(data.company_id), connection);
        await companyScope.assertMasterReassignable('products', id, Number(data.company_id), 'product', connection);
      }

      const payload = {
        company_id: Number(data.company_id),
        category_id: data.category_id,
        item_group_code: data.item_group_code,
        name: data.name,
        name_on_export_document: data.name_on_export_document || null,
        barcode: data.barcode || null,
        unit_po: data.unit_po || null,
        unit_export: data.unit_export || null,
        hsn_code: data.hsn_code || null,
        drawback_sr_no: data.drawback_sr_no || null,
        price_band_id: data.price_band_id || null,
        gst_rate_id: data.gst_rate_id || null,
        fabric_length_mtr: isBlank(data.fabric_length_mtr) ? null : data.fabric_length_mtr,
        fabric_width_inch: isBlank(data.fabric_width_inch) ? null : data.fabric_width_inch,
        sq_mtr_per_unit: productService.computeSqMtrPerUnit(data.fabric_length_mtr, data.fabric_width_inch),
        description: data.description || null,
        status: data.status,
        remarks: data.remarks || null,
        updated_by: userId
      };

      await productRepository.update(connection, id, payload);

      await productService.syncIncentives(connection, id, data.incentives || {});
      await productService.syncBomItems(connection, id, data.bom || []);

      await connection.commit();

      return await productRepository.findByIdIncludingRelations(id);
    } catch (error) {
      if (connection) await connection.rollback();
      throw error;
    } finally {
      if (connection) connection.release();
    }
  },

  /**
   * Per scheme: a blank percent_1 deletes any existing row for that scheme
   * (a blank row means "not applicable", not "store nulls"); a filled
   * percent_1 upserts by (product_id, scheme). Unlike Order Format's units/
   * columns, this is NOT a delete-all-then-reinsert — matches
   * ProductService::syncIncentives() exactly.
   */
  syncIncentives: async (connection, productId, incentives) => {
    for (const scheme of SCHEMES) {
      const row = incentives[scheme] || {};

      if (isBlank(row.percent_1)) {
        await productRepository.deleteIncentiveByScheme(connection, productId, scheme);
        continue;
      }

      // percent_2 is only meaningful for RoSCTL; validation already rejects
      // it for the other two schemes, but the sync step never persists it
      // for them regardless, as a second line of defence.
      const percent2 = TWO_PERCENT_SCHEMES.includes(scheme) && !isBlank(row.percent_2)
        ? row.percent_2
        : null;

      await productRepository.upsertIncentive(connection, productId, scheme, {
        percent_1: row.percent_1,
        percent_2: percent2,
        cap_value: isBlank(row.cap_value) ? null : row.cap_value,
        calculation_basis_id: isBlank(row.calculation_basis_id) ? null : row.calculation_basis_id
      });
    }
  },

  /**
   * Full delete-and-reinsert, skipping blank component_name rows. sort_order
   * is the row's index in the ORIGINAL submitted array (post array_values in
   * Laravel) — a blank row consumes its index rather than being renumbered
   * out, so surviving rows can have gaps in sort_order. Matches
   * ProductService::syncBomItems() exactly.
   */
  syncBomItems: async (connection, productId, bomItems) => {
    await productRepository.deleteBomItems(connection, productId);

    for (let index = 0; index < bomItems.length; index++) {
      const row = bomItems[index] || {};
      if (isBlank(row.component_name)) continue;

      await productRepository.insertBomItem(connection, productId, {
        sort_order: index,
        component_name: row.component_name,
        qty: isBlank(row.qty) ? 1 : row.qty,
        unit: row.unit || null,
        is_custom: row.is_custom === undefined ? true : !!row.is_custom,
        remarks: row.remarks || null
      });
    }
  },

  /**
   * Stub, matching ProductService::canDelete() exactly: "Nothing references
   * products yet — POs, OCs and quotations arrive in later phases." Do not
   * invent dependency checks here.
   */
  canDelete: async (_id) => {
    return { allowed: true, reason: null };
  },

  delete: async (id) => {
    const existing = await productRepository.findById(id);
    if (!existing) {
      throw { status: 404, message: 'Product not found' };
    }

    const check = await productService.canDelete(id);
    if (!check.allowed) {
      throw { status: 400, message: check.reason };
    }

    // Soft delete only — no transaction needed for a single UPDATE, matching
    // the source (no DB::transaction wraps Product::delete()). Incentives
    // and BOM rows are left in place; they are not cascaded on a soft delete.
    await productRepository.softDelete(id);
  },

  toggleStatus: async (id, userId) => {
    const existing = await productRepository.findById(id);
    if (!existing) {
      throw { status: 404, message: 'Product not found' };
    }

    const newStatus = existing.status === 'active' ? 'inactive' : 'active';
    await productRepository.toggleStatus(id, newStatus, userId);

    return await productRepository.findByIdIncludingRelations(id);
  },

  /**
   * Convenience only — the unique index (via itemGroupCodeExists/nameExists,
   * which include soft-deleted rows) is the real enforcement.
   */
  checkCode: async (field, value, ignoreId) => {
    if (field !== 'item_group_code' && field !== 'name') {
      throw { status: 422, message: 'Unknown field.' };
    }

    const taken = field === 'item_group_code'
      ? await productRepository.itemGroupCodeExists(value, ignoreId)
      : await productRepository.nameExists(value, ignoreId);

    return { available: !taken };
  },

  /**
   * Quick-add for the GST % field. Writes only to gst_rates — never touches
   * a product row. Matches ProductController::storeGstRate() exactly,
   * including the not-obviously-intentional quirk that the digit/dot strip
   * removes a leading "-", so a negative rate can never actually reach the
   * numeric check (an empty post-strip value, like PHP's (float) cast,
   * becomes 0 rather than failing).
   */
  storeGstRate: async (name) => {
    if (!name || typeof name !== 'string' || name.trim() === '' || name.length > 20) {
      throw { status: 422, message: 'The name field is required.' };
    }

    const stripped = name.replace(/[^0-9.]/g, '');
    const parsed = stripped === '' ? 0 : parseFloat(stripped);
    const numericRate = Number.isNaN(parsed) ? 0 : parsed;

    if (numericRate < 0 || numericRate > 100) {
      throw { status: 422, message: 'Enter a GST rate between 0 and 100.' };
    }

    // Normalize to the column's decimal(5,2) precision before comparing/storing.
    const normalizedRate = Number(numericRate.toFixed(2));

    let gstRate = await productRepository.findGstRateByRate(normalizedRate);
    if (!gstRate) {
      const id = await productRepository.createGstRate(normalizedRate);
      gstRate = { id, rate: normalizedRate };
    }

    return { id: gstRate.id, name: formatGstRateLabel(gstRate.rate) };
  },

  /**
   * Dropdown sources for the create/edit forms. Only active rows, plus the
   * record's own current value when editing — so an edit form never
   * silently blanks out a since-deactivated selection. calculation_bases is
   * deliberately NOT unioned this way; Laravel's own formData() never does
   * that for it either (calculation_basis_id lives on each incentive row).
   */
  getFormData: async (product = null) => {
    const [categories, priceBands, gstRates, calculationBases, units] = await Promise.all([
      productRepository.getCategoriesForForm(product ? product.category_id : null),
      productRepository.getPriceBandsForForm(product ? product.price_band_id : null),
      productRepository.getGstRatesForForm(product ? product.gst_rate_id : null),
      productRepository.getActiveCalculationBases(),
      productService.getUnitOptions(product)
    ]);

    return {
      categories,
      units,
      priceBands: priceBands.map((pb) => ({ id: pb.id, label: `${pb.code} — ${pb.name}` })),
      gstRates: gstRates.map((gr) => ({ id: gr.id, label: formatGstRateLabel(gr.rate) })),
      calculationBases
    };
  },

  /**
   * Every distinct unit defined across all Order Formats, unioned with the
   * product's own saved unit_po/unit_export — even if no format carries
   * them any more, matching ProductController::unitOptions().
   */
  getUnitOptions: async (product = null) => {
    const names = await productRepository.getDistinctUnits();
    const set = new Set(names.filter(Boolean));

    if (product) {
      if (product.unit_po) set.add(product.unit_po);
      if (product.unit_export) set.add(product.unit_export);
    }

    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }
};
