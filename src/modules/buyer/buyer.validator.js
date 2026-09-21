import { buyerRepository } from './buyer.repository.js';

const isBlank = (v) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '');
const isInteger = (v) => Number.isInteger(Number(v)) && String(v).trim() !== '';
const isNumeric = (v) => v !== '' && v !== null && !Number.isNaN(Number(v));
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/;

const validateCommon = async (req) => {
  const body = req.body || {};
  const errors = [];

  // company_name — required, no uniqueness rule (Laravel has none either).
  if (isBlank(body.company_name) || typeof body.company_name !== 'string') {
    errors.push('Company name is required');
  } else if (body.company_name.length > 200) {
    errors.push('Company name cannot exceed 200 characters');
  }

  // name_on_export_invoice
  if (!isBlank(body.name_on_export_invoice)) {
    if (typeof body.name_on_export_invoice !== 'string' || body.name_on_export_invoice.length > 200) {
      errors.push('Company name on export invoice cannot exceed 200 characters');
    }
  }

  // category_ids
  const categoryIds = body.category_ids;
  if (!isBlank(categoryIds)) {
    if (typeof categoryIds !== 'object') {
      errors.push('Category of items must be an array');
    } else {
      const list = Array.isArray(categoryIds) ? categoryIds : Object.values(categoryIds);
      const allIntegers = list.every((cid) => isInteger(cid));

      if (!allIntegers) {
        errors.push('Category of items must contain valid integers');
      } else {
        for (const cid of list) {
          const exists = await buyerRepository.categoryExists(Number(cid));
          if (!exists) {
            errors.push('One or more selected categories do not exist');
            break;
          }
        }
      }
    }
  }

  // contact_person
  if (!isBlank(body.contact_person)) {
    if (typeof body.contact_person !== 'string' || body.contact_person.length > 120) {
      errors.push('Contact person cannot exceed 120 characters');
    }
  }

  // email
  if (!isBlank(body.email)) {
    if (typeof body.email !== 'string' || body.email.length > 150 || !EMAIL_REGEX.test(body.email)) {
      errors.push('Enter a valid email address');
    }
  }

  // mobile
  if (!isBlank(body.mobile)) {
    if (typeof body.mobile !== 'string' || body.mobile.length > 30) {
      errors.push('Mobile cannot exceed 30 characters');
    }
  }

  // gst_vat_no — trim + uppercase before validation, matching
  // BuyerRequest::prepareForValidation().
  let gstVatNo = typeof body.gst_vat_no === 'string' ? body.gst_vat_no.trim().toUpperCase() : body.gst_vat_no;
  if (!isBlank(gstVatNo)) {
    if (typeof gstVatNo !== 'string' || gstVatNo.length !== 15) {
      errors.push('A GSTIN is exactly 15 characters.');
    } else if (!GSTIN_REGEX.test(gstVatNo)) {
      errors.push('That is not a valid GSTIN — expected 15 characters, e.g. 33ABCDE1234F1Z5.');
    }
  }

  // address
  if (!isBlank(body.address)) {
    if (typeof body.address !== 'string' || body.address.length > 255) {
      errors.push('Address cannot exceed 255 characters');
    }
  }

  // country_id
  if (!isBlank(body.country_id)) {
    if (!isInteger(body.country_id)) {
      errors.push('Country must be an integer');
    } else {
      const exists = await buyerRepository.countryExists(Number(body.country_id));
      if (!exists) errors.push('Selected country does not exist');
    }
  }

  // pincode
  if (!isBlank(body.pincode)) {
    if (typeof body.pincode !== 'string' || body.pincode.length > 20) {
      errors.push('Pincode cannot exceed 20 characters');
    }
  }

  // port_id
  if (!isBlank(body.port_id)) {
    if (!isInteger(body.port_id)) {
      errors.push('Port must be an integer');
    } else {
      const exists = await buyerRepository.portExists(Number(body.port_id));
      if (!exists) errors.push('Selected port does not exist');
    }
  }

  // agent_id — buyer-side only, excludes soft-deleted agents.
  if (!isBlank(body.agent_id)) {
    if (!isInteger(body.agent_id)) {
      errors.push('Agent must be an integer');
    } else {
      const exists = await buyerRepository.agentExistsAsBuyerType(Number(body.agent_id));
      if (!exists) errors.push('That agent is not marked as a buyer-side agent.');
    }
  }

  // agent_commission_type / agent_commission_value
  const hasCommissionValue = !isBlank(body.agent_commission_value);
  if (hasCommissionValue && isBlank(body.agent_commission_type)) {
    errors.push('Choose whether the commission is a percentage or an amount.');
  } else if (!isBlank(body.agent_commission_type)) {
    if (!['percent', 'amount'].includes(body.agent_commission_type)) {
      errors.push('Commission type must be either percent or amount');
    }
  }
  if (hasCommissionValue) {
    const v = Number(body.agent_commission_value);
    if (!isNumeric(body.agent_commission_value) || v < 0 || v > 99999999.9999) {
      errors.push('Agent commission must be a number between 0 and 99999999.9999');
    }
  }

  // payment_term_id
  if (!isBlank(body.payment_term_id)) {
    if (!isInteger(body.payment_term_id)) {
      errors.push('Payment terms must be an integer');
    } else {
      const exists = await buyerRepository.paymentTermExists(Number(body.payment_term_id));
      if (!exists) errors.push('Selected payment term does not exist');
    }
  }

  // incoterm_id
  if (!isBlank(body.incoterm_id)) {
    if (!isInteger(body.incoterm_id)) {
      errors.push('Inco terms must be an integer');
    } else {
      const exists = await buyerRepository.incotermExists(Number(body.incoterm_id));
      if (!exists) errors.push('Selected incoterm does not exist');
    }
  }

  // currency_id
  if (!isBlank(body.currency_id)) {
    if (!isInteger(body.currency_id)) {
      errors.push('Currency of payment must be an integer');
    } else {
      const exists = await buyerRepository.currencyExists(Number(body.currency_id));
      if (!exists) errors.push('Selected currency does not exist');
    }
  }

  // shipment_method_id — the locked schema represents this as an FK (the
  // old intermediate Laravel design), not the current free-text
  // `shipment_method` string — see the Phase 10 report for the rationale.
  if (!isBlank(body.shipment_method_id)) {
    if (!isInteger(body.shipment_method_id)) {
      errors.push('Shipment method must be an integer');
    } else {
      const exists = await buyerRepository.shipmentMethodExists(Number(body.shipment_method_id));
      if (!exists) errors.push('Selected shipment method does not exist');
    }
  }

  // bank_name / account_number / swift_code
  if (!isBlank(body.bank_name)) {
    if (typeof body.bank_name !== 'string' || body.bank_name.length > 120) {
      errors.push('Bank name cannot exceed 120 characters');
    }
  }
  if (!isBlank(body.account_number)) {
    if (typeof body.account_number !== 'string' || body.account_number.length > 40) {
      errors.push('Account number cannot exceed 40 characters');
    }
  }
  if (!isBlank(body.swift_code)) {
    if (typeof body.swift_code !== 'string' || body.swift_code.length > 20) {
      errors.push('Swift code cannot exceed 20 characters');
    }
  }

  // carton_markings
  const cartonMarkings = body.carton_markings;
  if (!isBlank(cartonMarkings)) {
    if (!Array.isArray(cartonMarkings)) {
      errors.push('Carton markings must be an array');
    } else if (cartonMarkings.length > 20) {
      errors.push('Carton markings cannot exceed 20 rows');
    } else {
      cartonMarkings.forEach((rawRow, idx) => {
        const row = rawRow || {};
        const hasValue = !isBlank(row.value);

        if (hasValue && isBlank(row.label)) {
          errors.push(`Carton marking row ${idx + 1}: label is required when a value is given`);
        } else if (!isBlank(row.label)) {
          if (typeof row.label !== 'string' || row.label.length > 60) {
            errors.push(`Carton marking row ${idx + 1}: label cannot exceed 60 characters`);
          }
        }

        if (hasValue) {
          if (typeof row.value !== 'string' || row.value.length > 120) {
            errors.push(`Carton marking row ${idx + 1}: value cannot exceed 120 characters`);
          }
        }
      });
    }
  }

  // contacts — no max cap, matching "CEO approved no limit".
  const contacts = body.contacts;
  if (!isBlank(contacts)) {
    if (!Array.isArray(contacts)) {
      errors.push('Contacts must be an array');
    } else {
      for (let idx = 0; idx < contacts.length; idx++) {
        const row = contacts[idx] || {};
        const hasName = !isBlank(row.name);
        const hasMobile = !isBlank(row.mobile);
        const hasEmail = !isBlank(row.email);
        const hasDesignation = !isBlank(row.designation_id);

        // required_with:contacts.*.mobile,contacts.*.email,contacts.*.designation_id
        if (!hasName && (hasMobile || hasEmail || hasDesignation)) {
          errors.push(`Enter a name for contact row ${idx + 1}, or clear the row.`);
        } else if (hasName) {
          if (typeof row.name !== 'string' || row.name.length > 120) {
            errors.push(`Contact row ${idx + 1}: name cannot exceed 120 characters`);
          }

          // Cross-field reachability check (BuyerRequest::validateContactsReachable):
          // a named contact needs a mobile or an email.
          if (!hasMobile && !hasEmail) {
            errors.push(`Add a mobile number or email so contact row ${idx + 1} can be reached.`);
          }
        }

        if (hasMobile) {
          if (typeof row.mobile !== 'string' || row.mobile.length > 30) {
            errors.push(`Contact row ${idx + 1}: mobile cannot exceed 30 characters`);
          }
        }

        if (hasEmail) {
          if (typeof row.email !== 'string' || row.email.length > 150 || !EMAIL_REGEX.test(row.email)) {
            errors.push(`Contact row ${idx + 1}: enter a valid email address`);
          }
        }

        if (hasDesignation) {
          if (!isInteger(row.designation_id)) {
            errors.push(`Contact row ${idx + 1}: designation must be an integer`);
          } else {
            const exists = await buyerRepository.designationExistsActive(Number(row.designation_id));
            if (!exists) errors.push(`Contact row ${idx + 1}: selected designation does not exist or is inactive`);
          }
        }
      }
    }
  }

  // status
  if (!body.status || !['active', 'inactive'].includes(body.status)) {
    errors.push('Status must be either active or inactive');
  }

  // remarks — persisted.
  if (!isBlank(body.remarks)) {
    if (typeof body.remarks !== 'string' || body.remarks.length > 1000) {
      errors.push('Remarks cannot exceed 1000 characters');
    }
  }

  // comments — accepted for API compatibility, validated for shape only,
  // but NEVER persisted (no buyers.comments column on the locked schema).
  if (!isBlank(body.comments)) {
    if (typeof body.comments !== 'string' || body.comments.length > 1000) {
      errors.push('Comments cannot exceed 1000 characters');
    }
  }

  // Write the normalized GSTIN back for the controller/service to use.
  req.body.gst_vat_no = gstVatNo;

  return errors;
};

export const buyerValidator = {
  validateStore: async (req, res, next) => {
    try {
      const errors = await validateCommon(req);
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
      const errors = await validateCommon(req);
      if (errors.length > 0) {
        return res.status(400).json({ success: false, message: 'Validation failed', errors });
      }
      next();
    } catch (error) {
      next(error);
    }
  }
};
