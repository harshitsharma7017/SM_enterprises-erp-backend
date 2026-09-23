import { productRepository } from './product.repository.js';
import { companyScope } from '../../services/company-scope.service.js';

const SCHEMES = ['drawback', 'rosctl', 'rodtep'];
const TWO_PERCENT_SCHEMES = ['rosctl'];

const isBlank = (v) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '');
const isInteger = (v) => Number.isInteger(Number(v)) && String(v).trim() !== '';
const isNumeric = (v) => v !== '' && v !== null && !Number.isNaN(Number(v));

const validateCommon = async (req, isUpdate = false) => {
  const body = req.body || {};
  const errors = [];
  const ignoreId = isUpdate ? req.params.id : null;

  // company_id — required: every product belongs to one company
  const companyError = await companyScope.checkField(body.company_id, { required: true, mustBeActive: !isUpdate });
  if (companyError) errors.push(companyError);

  // Inactive masters are accepted on update only when already assigned to this product.
  const current = isUpdate ? await productRepository.findById(req.params.id) : null;

  // uom_id — required, must exist; active unless unchanged
  if (isBlank(body.uom_id)) {
    errors.push('UOM is required');
  } else {
    const uom = isInteger(body.uom_id) ? await productRepository.findUom(Number(body.uom_id)) : null;
    if (!uom) {
      errors.push('Selected UOM does not exist');
    } else if (uom.status !== 'active' && !(current && current.uom_id === uom.id)) {
      errors.push('Selected UOM is inactive');
    }
  }

  // material_type_id — optional; must exist, belong to the product's company, and be active unless unchanged
  if (!isBlank(body.material_type_id)) {
    const materialType = isInteger(body.material_type_id) ? await productRepository.findMaterialType(Number(body.material_type_id)) : null;
    if (!materialType) {
      errors.push('Selected material type does not exist');
    } else {
      if (!companyError && materialType.company_id !== Number(body.company_id)) {
        errors.push('Selected material type belongs to a different company');
      }
      if (materialType.status !== 'active' && !(current && current.material_type_id === materialType.id)) {
        errors.push('Selected material type is inactive');
      }
    }
  }

  // category_id
  if (isBlank(body.category_id)) {
    errors.push('Category is required');
  } else if (!isInteger(body.category_id)) {
    errors.push('Category must be an integer');
  } else {
    const exists = await productRepository.categoryExists(Number(body.category_id));
    if (!exists) errors.push('Selected category does not exist');
  }

  // item_group_code — trim + uppercase before validation, matching
  // ProductRequest::prepareForValidation().
  let itemGroupCode = typeof body.item_group_code === 'string'
    ? body.item_group_code.trim().toUpperCase()
    : body.item_group_code;

  if (isBlank(itemGroupCode) || typeof itemGroupCode !== 'string') {
    errors.push('Item group code is required');
  } else if (itemGroupCode.length > 5) {
    errors.push('Item group code may not be longer than 5 characters.');
  } else if (!/^[A-Z0-9]+$/.test(itemGroupCode)) {
    errors.push('Item group code may contain letters and numbers only.');
  } else {
    // Uniqueness deliberately includes soft-deleted rows — see repository.
    const exists = await productRepository.itemGroupCodeExists(itemGroupCode, ignoreId);
    if (exists) errors.push('This item group code is already taken.');
  }

  // name
  if (isBlank(body.name) || typeof body.name !== 'string') {
    errors.push('Product name is required');
  } else if (body.name.length > 200) {
    errors.push('Product name cannot exceed 200 characters');
  } else {
    const exists = await productRepository.nameExists(body.name, ignoreId);
    if (exists) errors.push('A product with this name already exists.');
  }

  // name_on_export_document
  if (!isBlank(body.name_on_export_document)) {
    if (typeof body.name_on_export_document !== 'string' || body.name_on_export_document.length > 255) {
      errors.push('Export document name cannot exceed 255 characters');
    }
  }

  // barcode
  if (!isBlank(body.barcode)) {
    if (typeof body.barcode !== 'string' || body.barcode.length > 60) {
      errors.push('Barcode cannot exceed 60 characters');
    }
  }

  // unit_po / unit_export — free text, NOT validated against document_format_units.
  if (!isBlank(body.unit_po)) {
    if (typeof body.unit_po !== 'string' || body.unit_po.length > 20) {
      errors.push('Unit (PO and OC) cannot exceed 20 characters');
    }
  }
  if (!isBlank(body.unit_export)) {
    if (typeof body.unit_export !== 'string' || body.unit_export.length > 20) {
      errors.push('Unit (Export Docs) cannot exceed 20 characters');
    }
  }

  // hsn_code — string, not integer, so leading zeros survive.
  if (!isBlank(body.hsn_code)) {
    if (typeof body.hsn_code !== 'string' || !/^[0-9]{4,12}$/.test(body.hsn_code)) {
      errors.push('HSN code must be 4 to 12 digits.');
    }
  }

  // drawback_sr_no
  if (!isBlank(body.drawback_sr_no)) {
    if (typeof body.drawback_sr_no !== 'string' || body.drawback_sr_no.length > 20) {
      errors.push('Drawback Sr. No. cannot exceed 20 characters');
    }
  }

  // price_band_id
  if (!isBlank(body.price_band_id)) {
    if (!isInteger(body.price_band_id)) {
      errors.push('Price band must be an integer');
    } else {
      const exists = await productRepository.priceBandExists(Number(body.price_band_id));
      if (!exists) errors.push('Selected price band does not exist');
    }
  }

  // gst_rate_id
  if (!isBlank(body.gst_rate_id)) {
    if (!isInteger(body.gst_rate_id)) {
      errors.push('GST % must be an integer');
    } else {
      const exists = await productRepository.gstRateExists(Number(body.gst_rate_id));
      if (!exists) errors.push('Selected GST rate does not exist');
    }
  }

  // fabric_length_mtr / fabric_width_inch
  if (!isBlank(body.fabric_length_mtr)) {
    const v = Number(body.fabric_length_mtr);
    if (!isNumeric(body.fabric_length_mtr) || v < 0 || v > 99999.999) {
      errors.push('Fabric length must be a number between 0 and 99999.999');
    }
  }
  if (!isBlank(body.fabric_width_inch)) {
    const v = Number(body.fabric_width_inch);
    if (!isNumeric(body.fabric_width_inch) || v < 0 || v > 99999.999) {
      errors.push('Fabric width must be a number between 0 and 99999.999');
    }
  }

  // description — exists on the current schema, persisted.
  if (!isBlank(body.description)) {
    if (typeof body.description !== 'string' || body.description.length > 1000) {
      errors.push('Description cannot exceed 1000 characters');
    }
  }

  // remarks — exists on the current schema, persisted.
  if (!isBlank(body.remarks)) {
    if (typeof body.remarks !== 'string' || body.remarks.length > 1000) {
      errors.push('Remarks cannot exceed 1000 characters');
    }
  }

  // comments — intentionally NOT validated or persisted. The Laravel field
  // exists but products.comments does not exist on the current locked
  // schema; accepted (if present) and silently dropped by the service,
  // never echoed back as a persisted value.

  // status
  if (!body.status || !['active', 'inactive'].includes(body.status)) {
    errors.push('Status must be either active or inactive');
  }

  // incentives — nested per-scheme rules, built programmatically since
  // Laravel's own rules() loops over ProductIncentive::SCHEMES the same way.
  const incentives = body.incentives;
  if (!isBlank(incentives)) {
    // Laravel's rule is just ['nullable','array'] — PHP's `array` type does
    // not distinguish a JSON list from a JSON object, so an empty (or
    // non-object) array harmlessly satisfies it there too. Only reject a
    // genuinely wrong type (string/number/boolean), not the array shape.
    if (typeof incentives !== 'object') {
      errors.push('Incentives must be an object keyed by scheme');
    } else {
      for (const scheme of SCHEMES) {
        const row = incentives[scheme];
        if (row === undefined || row === null) continue;
        if (typeof row !== 'object' || Array.isArray(row)) {
          errors.push(`Invalid data for ${scheme} incentive`);
          continue;
        }

        const hasPercent1 = !isBlank(row.percent_1);

        if (hasPercent1) {
          const v = Number(row.percent_1);
          if (!isNumeric(row.percent_1) || v < 0 || v > 100) {
            errors.push(`${scheme} % must be between 0 and 100`);
          }
        }

        if (!isBlank(row.cap_value)) {
          const v = Number(row.cap_value);
          if (!isNumeric(row.cap_value) || v < 0) {
            errors.push(`${scheme} cap value must be 0 or greater`);
          }
        }

        // calculation_basis_id: required exactly when percent_1 is filled;
        // otherwise still validated (integer + exists) if present at all.
        if (hasPercent1 && isBlank(row.calculation_basis_id)) {
          errors.push(`${scheme} calculated-on is required when a rate is given`);
        } else if (!isBlank(row.calculation_basis_id)) {
          if (!isInteger(row.calculation_basis_id)) {
            errors.push(`${scheme} calculated-on must be an integer`);
          } else {
            const exists = await productRepository.calculationBasisExists(Number(row.calculation_basis_id));
            if (!exists) errors.push(`${scheme} calculated-on does not exist`);
          }
        }

        // percent_2 — only meaningful for RoSCTL; PROHIBITED for the others.
        if (TWO_PERCENT_SCHEMES.includes(scheme)) {
          if (!isBlank(row.percent_2)) {
            const v = Number(row.percent_2);
            if (!isNumeric(row.percent_2) || v < 0 || v > 100) {
              errors.push(`${scheme} % 2 must be between 0 and 100`);
            }
          }
        } else if (!isBlank(row.percent_2)) {
          errors.push(`${scheme} % 2 is not applicable for this scheme`);
        }
      }
    }
  }

  // bom
  const bom = body.bom;
  if (!isBlank(bom)) {
    if (!Array.isArray(bom)) {
      errors.push('BOM must be an array');
    } else if (bom.length > 100) {
      errors.push('BOM cannot exceed a maximum of 100 rows');
    } else {
      bom.forEach((rawRow, idx) => {
        const row = rawRow || {};

        if (!isBlank(row.component_name)) {
          if (typeof row.component_name !== 'string' || row.component_name.length > 200) {
            errors.push(`BOM row ${idx + 1}: component name cannot exceed 200 characters`);
          }
        }

        if (!isBlank(row.qty)) {
          const v = Number(row.qty);
          if (!isNumeric(row.qty) || v < 0 || v > 99999999.9999) {
            errors.push(`BOM row ${idx + 1}: qty must be between 0 and 99999999.9999`);
          }
        }

        if (!isBlank(row.unit)) {
          if (typeof row.unit !== 'string' || row.unit.length > 20) {
            errors.push(`BOM row ${idx + 1}: unit cannot exceed 20 characters`);
          }
        }

        if (!isBlank(row.remarks)) {
          if (typeof row.remarks !== 'string' || row.remarks.length > 500) {
            errors.push(`BOM row ${idx + 1}: remarks cannot exceed 500 characters`);
          }
        }
      });
    }
  }

  // Write the normalized code back for the controller/service to use.
  req.body.item_group_code = itemGroupCode;

  return errors;
};

export const productValidator = {
  validateStore: async (req, res, next) => {
    try {
      const errors = await validateCommon(req, false);
      if (errors.length > 0) {
        return res.status(400).json({ success: false, message: 'Validation failed', errors });
      }
      next();
    } catch (error) {
      next(error);
    }
  },

  validateUpdate: async (req, res, next) => {
    try {
      const errors = await validateCommon(req, true);
      if (errors.length > 0) {
        return res.status(400).json({ success: false, message: 'Validation failed', errors });
      }
      next();
    } catch (error) {
      next(error);
    }
  }
};
