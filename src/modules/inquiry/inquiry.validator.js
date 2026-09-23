import { inquiryRepository } from './inquiry.repository.js';
import { companyScope } from '../../services/company-scope.service.js';
import { STATUSES } from './inquiry.service.js';

const isBlank = (v) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '');
const isInteger = (v) => Number.isInteger(Number(v)) && String(v).trim() !== '';
const isNumeric = (v) => v !== '' && v !== null && v !== undefined && !Number.isNaN(Number(v));
const isValidDate = (v) => typeof v === 'string' && !Number.isNaN(Date.parse(v));

/**
 * Mirrors InquiryRequest::validateItemUnits() — a posted item unit must
 * match either the order format's own unit chips, the selected product's
 * unit_po/unit_export, or (update only) a unit already saved on this
 * inquiry. Skipped entirely when no format is selected or the allowed set
 * ends up empty, same as the source (an empty $allowed short-circuits the
 * in_array check to "anything goes").
 */
const validateItemUnits = async (items, documentFormatId, inquiryId, errors) => {
  if (isBlank(documentFormatId)) return;

  const formatUnits = await inquiryRepository.getFormatUnitNames(Number(documentFormatId));

  const productIds = [...new Set(
    items.map((item) => item && item.product_id).filter((id) => !isBlank(id)).map(Number)
  )];
  const productsById = await inquiryRepository.getProductUnitsByIds(productIds);

  const legacyUnits = inquiryId ? await inquiryRepository.getLegacyUnitsForInquiry(inquiryId) : [];

  items.forEach((item, index) => {
    const row = item || {};
    if (isBlank(row.unit)) return;

    let allowed = [...formatUnits];
    const product = !isBlank(row.product_id) ? productsById[Number(row.product_id)] : null;
    if (product) {
      allowed = [...new Set([...allowed, product.unit_export, product.unit_po].filter(Boolean))];
    }
    if (legacyUnits.length > 0) {
      allowed = [...new Set([...allowed, ...legacyUnits])];
    }

    if (allowed.length > 0 && !allowed.includes(row.unit)) {
      errors.push(`Item ${index + 1}: the selected unit must match the order format or the product's unit.`);
    }
  });
};

const validateCommon = async (req, isUpdate = false) => {
  const body = req.body || {};
  const errors = [];
  const inquiryId = isUpdate ? Number(req.params.id) : null;

  // mode
  const mode = body.mode;
  if (isBlank(mode) || !['draft', 'submit'].includes(mode)) {
    errors.push('Mode is required and must be either draft or submit.');
  }
  const requiredUnlessDraft = mode !== 'draft';

  // company_id — required on create; on update a legacy (unassigned)
  // inquiry may be assigned once, and an assigned one keeps its company.
  const companyError = await companyScope.checkField(body.company_id, { required: !isUpdate, mustBeActive: !isUpdate });
  if (companyError) errors.push(companyError);

  // inquiry_date
  if (isBlank(body.inquiry_date)) {
    errors.push('Inquiry date is required.');
  } else if (!isValidDate(body.inquiry_date)) {
    errors.push('Inquiry date must be a valid date.');
  }

  // buyer_ref
  if (!isBlank(body.buyer_ref)) {
    if (typeof body.buyer_ref !== 'string' || body.buyer_ref.length > 100) {
      errors.push('Buyer reference cannot exceed 100 characters.');
    }
  }

  // source_id
  if (isBlank(body.source_id)) {
    if (requiredUnlessDraft) errors.push('Source is required.');
  } else if (!isInteger(body.source_id)) {
    errors.push('Source must be a valid selection.');
  } else if (!(await inquiryRepository.sourceExists(Number(body.source_id)))) {
    errors.push('Selected source does not exist.');
  }

  // buyer_id
  if (isBlank(body.buyer_id)) {
    if (requiredUnlessDraft) errors.push('Buyer is required.');
  } else if (!isInteger(body.buyer_id)) {
    errors.push('Buyer must be a valid selection.');
  } else if (!(await inquiryRepository.buyerExists(Number(body.buyer_id)))) {
    errors.push('Selected buyer does not exist.');
  }

  // category_id
  if (isBlank(body.category_id)) {
    if (requiredUnlessDraft) errors.push('Category is required.');
  } else if (!isInteger(body.category_id)) {
    errors.push('Category must be a valid selection.');
  } else if (!(await inquiryRepository.categoryExists(Number(body.category_id)))) {
    errors.push('Selected category does not exist.');
  }

  // document_format_id
  if (isBlank(body.document_format_id)) {
    if (requiredUnlessDraft) errors.push('Order format is required.');
  } else if (!isInteger(body.document_format_id)) {
    errors.push('Order format must be a valid selection.');
  } else if (!(await inquiryRepository.documentFormatExists(Number(body.document_format_id)))) {
    errors.push('Selected order format does not exist.');
  }

  // agent_id
  if (!isBlank(body.agent_id)) {
    if (!isInteger(body.agent_id)) {
      errors.push('Agent must be a valid selection.');
    } else if (!(await inquiryRepository.agentExists(Number(body.agent_id)))) {
      errors.push('Selected agent does not exist.');
    }
  }

  // agent_commission_type / value
  if (!isBlank(body.agent_commission_value) && isBlank(body.agent_commission_type)) {
    errors.push('Agent commission type is required when a commission value is given.');
  }
  if (!isBlank(body.agent_commission_type) && !['percent', 'flat'].includes(body.agent_commission_type)) {
    errors.push('Agent commission type must be either percent or flat.');
  }
  if (!isBlank(body.agent_commission_value)) {
    const v = Number(body.agent_commission_value);
    if (!isNumeric(body.agent_commission_value) || v < 0 || v > 99999999.9999) {
      errors.push('Agent commission value must be between 0 and 99999999.9999.');
    }
  }

  // currency_id
  if (isBlank(body.currency_id)) {
    if (requiredUnlessDraft) errors.push('Currency is required.');
  } else if (!isInteger(body.currency_id)) {
    errors.push('Currency must be a valid selection.');
  } else if (!(await inquiryRepository.currencyExists(Number(body.currency_id)))) {
    errors.push('Selected currency does not exist.');
  }

  // exchange_rate
  if (!isBlank(body.exchange_rate)) {
    const v = Number(body.exchange_rate);
    if (!isNumeric(body.exchange_rate) || v < 0 || v > 99999999.9999) {
      errors.push('Exchange rate must be between 0 and 99999999.9999.');
    }
  }

  // expected_shipment_date
  if (!isBlank(body.expected_shipment_date) && !isValidDate(body.expected_shipment_date)) {
    errors.push('Expected shipment date must be a valid date.');
  }

  // delivery_details / packing_details
  if (isBlank(body.delivery_details)) {
    if (requiredUnlessDraft) errors.push('Delivery details are required.');
  } else if (typeof body.delivery_details !== 'string') {
    errors.push('Delivery details must be text.');
  }
  if (isBlank(body.packing_details)) {
    if (requiredUnlessDraft) errors.push('Packing details are required.');
  } else if (typeof body.packing_details !== 'string') {
    errors.push('Packing details must be text.');
  }

  // remarks
  if (!isBlank(body.remarks)) {
    if (typeof body.remarks !== 'string' || body.remarks.length > 2000) {
      errors.push('Remarks cannot exceed 2000 characters.');
    }
  }

  // status
  if (isBlank(body.status) || !STATUSES.includes(body.status)) {
    errors.push(`Status is required and must be one of: ${STATUSES.join(', ')}.`);
  }

  // items
  const items = Array.isArray(body.items) ? body.items : (isBlank(body.items) ? [] : null);
  if (items === null) {
    errors.push('Items must be an array.');
  } else if (items.length > 200) {
    errors.push('Items cannot exceed 200 rows.');
  } else {
    for (let i = 0; i < items.length; i++) {
      const row = items[i] || {};
      const label = `Item ${i + 1}`;

      if (!isBlank(row.design_no) && (typeof row.design_no !== 'string' || row.design_no.length > 150)) {
        errors.push(`${label}: design no cannot exceed 150 characters.`);
      }
      if (!isBlank(row.description) && (typeof row.description !== 'string' || row.description.length > 2000)) {
        errors.push(`${label}: description cannot exceed 2000 characters.`);
      }
      if (!isBlank(row.product_id)) {
        if (!isInteger(row.product_id)) {
          errors.push(`${label}: product must be a valid selection.`);
        } else if (!(await inquiryRepository.productExists(Number(row.product_id)))) {
          errors.push(`${label}: selected product does not exist.`);
        }
      }
      if (!isBlank(row.supplier_id)) {
        if (!isInteger(row.supplier_id)) {
          errors.push(`${label}: supplier must be a valid selection.`);
        } else if (!(await inquiryRepository.supplierExists(Number(row.supplier_id)))) {
          errors.push(`${label}: selected supplier does not exist.`);
        }
      }
      if (!isBlank(row.unit) && (typeof row.unit !== 'string' || row.unit.length > 20)) {
        errors.push(`${label}: unit cannot exceed 20 characters.`);
      }
      if (!isBlank(row.fob_value_id)) {
        if (!isInteger(row.fob_value_id)) {
          errors.push(`${label}: FOB value must be a valid selection.`);
        } else if (!(await inquiryRepository.fobValueExists(Number(row.fob_value_id)))) {
          errors.push(`${label}: selected FOB value does not exist.`);
        }
      }
      if (!isBlank(row.price)) {
        const v = Number(row.price);
        if (!isNumeric(row.price) || v < 0 || v > 9999999999.99) {
          errors.push(`${label}: price must be between 0 and 9999999999.99.`);
        }
      }
      if (!isBlank(row.cost_price)) {
        const v = Number(row.cost_price);
        if (!isNumeric(row.cost_price) || v < 0 || v > 9999999999.99) {
          errors.push(`${label}: cost price must be between 0 and 9999999999.99.`);
        }
      }
      if (!isBlank(row.status) && !STATUSES.includes(row.status)) {
        errors.push(`${label}: status must be one of: ${STATUSES.join(', ')}.`);
      }
      if (!isBlank(row.remarks) && (typeof row.remarks !== 'string' || row.remarks.length > 1000)) {
        errors.push(`${label}: remarks cannot exceed 1000 characters.`);
      }

      // colours / sizes
      if (!isBlank(row.colours)) {
        if (!Array.isArray(row.colours)) {
          errors.push(`${label}: colours must be an array.`);
        } else if (row.colours.length > 50) {
          errors.push(`${label}: colours cannot exceed 50 rows.`);
        } else {
          row.colours.forEach((colourRow, ci) => {
            const colour = colourRow || {};
            const clabel = `${label}, Colour ${ci + 1}`;

            if (!isBlank(colour.colour) && (typeof colour.colour !== 'string' || colour.colour.length > 60)) {
              errors.push(`${clabel}: colour name cannot exceed 60 characters.`);
            }

            if (!isBlank(colour.sizes)) {
              if (!Array.isArray(colour.sizes)) {
                errors.push(`${clabel}: sizes must be an array.`);
              } else if (colour.sizes.length > 50) {
                errors.push(`${clabel}: sizes cannot exceed 50 rows.`);
              } else {
                colour.sizes.forEach((sizeRow, si) => {
                  const size = sizeRow || {};
                  const slabel = `${clabel}, Size ${si + 1}`;
                  if (!isBlank(size.size) && (typeof size.size !== 'string' || size.size.length > 20)) {
                    errors.push(`${slabel}: size cannot exceed 20 characters.`);
                  }
                  if (!isBlank(size.qty)) {
                    const v = Number(size.qty);
                    if (!isInteger(size.qty) || v < 0 || v > 999999) {
                      errors.push(`${slabel}: qty must be between 0 and 999999.`);
                    }
                  }
                });
              }
            }
          });
        }
      }

      // custom (Order Format custom columns — key/value bag)
      if (!isBlank(row.custom)) {
        if (typeof row.custom !== 'object' || Array.isArray(row.custom)) {
          errors.push(`${label}: custom values must be an object.`);
        } else if (Object.keys(row.custom).length > 20) {
          errors.push(`${label}: custom values cannot exceed 20 entries.`);
        } else {
          for (const value of Object.values(row.custom)) {
            if (!isBlank(value) && (typeof value !== 'string' || value.length > 255)) {
              errors.push(`${label}: custom values cannot exceed 255 characters each.`);
              break;
            }
          }
        }
      }

      // bom
      if (!isBlank(row.bom)) {
        if (!Array.isArray(row.bom)) {
          errors.push(`${label}: BOM must be an array.`);
        } else if (row.bom.length > 100) {
          errors.push(`${label}: BOM cannot exceed 100 rows.`);
        } else {
          row.bom.forEach((bomRow, bi) => {
            const bom = bomRow || {};
            const blabel = `${label}, BOM ${bi + 1}`;

            if (!isBlank(bom.component_name) && (typeof bom.component_name !== 'string' || bom.component_name.length > 200)) {
              errors.push(`${blabel}: component name cannot exceed 200 characters.`);
            }
            if (!isBlank(bom.qty)) {
              const v = Number(bom.qty);
              if (!isNumeric(bom.qty) || v < 0 || v > 99999999.9999) {
                errors.push(`${blabel}: qty must be between 0 and 99999999.9999.`);
              }
            }
            if (!isBlank(bom.unit) && (typeof bom.unit !== 'string' || bom.unit.length > 20)) {
              errors.push(`${blabel}: unit cannot exceed 20 characters.`);
            }
            if (!isBlank(bom.remarks) && (typeof bom.remarks !== 'string' || bom.remarks.length > 500)) {
              errors.push(`${blabel}: remarks cannot exceed 500 characters.`);
            }
          });
        }
      }
    }
  }

  // Submit requires at least one item ROW present — matches
  // blank(array_filter($items)) in the Laravel source, which (since every
  // posted item is a non-empty PHP array) really just means "items is
  // non-empty", not "at least one item has meaningful data".
  if (mode === 'submit' && (!Array.isArray(items) || items.length === 0)) {
    errors.push('Add at least one item before submitting the inquiry.');
  }

  if (Array.isArray(items) && items.length > 0) {
    await validateItemUnits(items, body.document_format_id, inquiryId, errors);
  }

  // followups
  const followups = body.followups;
  if (!isBlank(followups)) {
    if (!Array.isArray(followups)) {
      errors.push('Follow-ups must be an array.');
    } else if (followups.length > 100) {
      errors.push('Follow-ups cannot exceed 100 rows.');
    } else {
      followups.forEach((rawRow, fi) => {
        const row = rawRow || {};
        const flabel = `Follow-up ${fi + 1}`;

        if (!isBlank(row.id) && !isInteger(row.id)) {
          errors.push(`${flabel}: id must be an integer.`);
        }
        if (!isBlank(row.comment) && isBlank(row.date)) {
          errors.push(`${flabel}: date is required when a comment is given.`);
        }
        if (!isBlank(row.date) && !isValidDate(row.date)) {
          errors.push(`${flabel}: date must be a valid date.`);
        }
        if (!isBlank(row.comment) && (typeof row.comment !== 'string' || row.comment.length > 2000)) {
          errors.push(`${flabel}: comment cannot exceed 2000 characters.`);
        }
      });
    }
  }

  return errors;
};

export const inquiryValidator = {
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
  },

  validateSource: (req, res, next) => {
    const body = req.body || {};
    if (isBlank(body.name) || typeof body.name !== 'string') {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: ['Name is required.'] });
    }
    if (body.name.trim().length > 80) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: ['Name cannot exceed 80 characters.'] });
    }
    next();
  }
};
