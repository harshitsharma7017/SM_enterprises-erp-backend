import { supplierRepository } from './supplier.repository.js';
import { AGENT_SIDES } from './supplier.service.js';
import { companyScope } from '../../services/company-scope.service.js';

const isBlank = (v) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '');
const isInteger = (v) => Number.isInteger(Number(v)) && String(v).trim() !== '';
const isNumeric = (v) => v !== '' && v !== null && !Number.isNaN(Number(v));
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/;
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const DISPLAY_CODE_REGEX = /^[A-Z0-9-]+$/;
const PARTY_TYPES = ['supplier', 'jobber', 'both'];
const DELIVERY_MODES = ['direct_to_port', 'to_office', 'to_warehouse'];

const toBool = (v) => v === true || v === 'true' || v === '1' || v === 1 || v === 'on' || v === 'yes';

/**
 * `isJobberScreen` is only used to pick the display-only defaultPartyType
 * fallback upstream in the service/controller — validation rules themselves
 * are identical for both screens (one shared FormRequest in the source).
 */
const validateCommon = async (req, isUpdate = false) => {
  const body = req.body || {};
  const errors = [];
  const ignoreId = isUpdate ? req.params.id : null;

  // -- prepareForValidation()-equivalent normalization, run first --

  let displayCode = typeof body.display_code === 'string' ? body.display_code.trim().toUpperCase() : body.display_code;
  let gstNumber = typeof body.gst_number === 'string' ? body.gst_number.trim().toUpperCase() : body.gst_number;
  let panNumber = typeof body.pan_number === 'string' ? body.pan_number.trim().toUpperCase() : body.pan_number;
  let ifscCode = typeof body.ifsc_code === 'string' ? body.ifsc_code.trim().toUpperCase() : body.ifsc_code;
  let msmeRegNo = typeof body.msme_registration_no === 'string' ? body.msme_registration_no.trim().toUpperCase() : body.msme_registration_no;

  const isMsme = toBool(body.is_msme);
  let weSupplyMaterial = toBool(body.we_supply_material);
  let requiresSampleApproval = toBool(body.requires_sample_approval);
  let buyerIds = body.buyer_ids;
  let clientDetails = body.client_details; // accepted, never persisted — see service

  // Col E — GST only applies to a registered supplier type.
  const registered = await supplierRepository.supplierTypeIsRegistered(body.supplier_type_id);
  if (!registered) {
    gstNumber = null;
  }

  // Col G — the registration number only exists if the answer was yes.
  if (!isMsme) {
    msmeRegNo = null;
  }

  // Jobwork-only flags reset for a trading-only supplier.
  if (!['jobber', 'both'].includes(body.party_type)) {
    weSupplyMaterial = false;
    requiresSampleApproval = false;
    buyerIds = [];
    clientDetails = null;
  }

  // A child with no parent is dropped rather than rejected.
  let stateId = body.state_id;
  let cityId = body.city_id;
  if (isBlank(body.country_id)) {
    stateId = null;
    cityId = null;
  }
  if (isBlank(stateId)) {
    cityId = null;
  }

  const hasCommissionValue = !isBlank(body.agent_commission_value);
  let agentCommissionType = hasCommissionValue ? body.agent_commission_type : null;

  // -- Field rules --

  // display_code — required, max 5, [A-Z0-9-], unique INCLUDING soft-deleted.
  if (isBlank(displayCode) || typeof displayCode !== 'string') {
    errors.push('Display code is required');
  } else if (displayCode.length > 5) {
    errors.push('Display code may not be longer than 5 characters.');
  } else if (!DISPLAY_CODE_REGEX.test(displayCode)) {
    errors.push('Display code may contain letters, numbers and hyphens only.');
  } else {
    const exists = await supplierRepository.displayCodeExists(displayCode, ignoreId);
    if (exists) errors.push('This display code is already used by another supplier.');
  }

  // company_id — optional; blank means shared by both companies
  const companyError = await companyScope.checkField(body.company_id, { required: false, mustBeActive: !isUpdate });
  if (companyError) errors.push(companyError);

  // party_type
  if (!body.party_type || !PARTY_TYPES.includes(body.party_type)) {
    errors.push('Party type must be one of supplier, jobber, both');
  }

  // company_name — no uniqueness rule.
  if (isBlank(body.company_name) || typeof body.company_name !== 'string') {
    errors.push('Company name is required');
  } else if (body.company_name.length > 200) {
    errors.push('Company name cannot exceed 200 characters');
  }

  // name_on_bill
  if (!isBlank(body.name_on_bill)) {
    if (typeof body.name_on_bill !== 'string' || body.name_on_bill.length > 200) {
      errors.push('Name on bill cannot exceed 200 characters');
    }
  }

  // supplier_type_id — active only.
  if (!isBlank(body.supplier_type_id)) {
    if (!isInteger(body.supplier_type_id)) {
      errors.push('Supplier type must be an integer');
    } else {
      const exists = await supplierRepository.supplierTypeExistsActive(Number(body.supplier_type_id));
      if (!exists) errors.push('Selected supplier type does not exist');
    }
  }

  // product_ids — Jobber-only in practice, a no-op array for a Supplier.
  const productIds = body.product_ids;
  if (!isBlank(productIds)) {
    if (typeof productIds !== 'object') {
      errors.push('Products must be an array');
    } else {
      const list = Array.isArray(productIds) ? productIds : Object.values(productIds);
      if (!list.every((pid) => isInteger(pid))) {
        errors.push('Products must contain valid integers');
      } else {
        for (const pid of list) {
          const exists = await supplierRepository.productExists(Number(pid));
          if (!exists) { errors.push('One or more selected products do not exist'); break; }
        }
      }
    }
  }

  // gst_number — required only when the supplier type is registered.
  if (registered && isBlank(gstNumber)) {
    errors.push('A GST number is required for a registered supplier type.');
  } else if (!isBlank(gstNumber)) {
    if (typeof gstNumber !== 'string' || gstNumber.length !== 15) {
      errors.push('A GSTIN is exactly 15 characters.');
    } else if (!GSTIN_REGEX.test(gstNumber)) {
      errors.push('That is not a valid GSTIN — expected 15 characters, e.g. 33ABCDE1234F1Z5.');
    }
  }

  // pan_number
  if (!isBlank(panNumber)) {
    if (typeof panNumber !== 'string' || panNumber.length !== 10) {
      errors.push('A PAN is exactly 10 characters.');
    } else if (!PAN_REGEX.test(panNumber)) {
      errors.push('That is not a valid PAN — expected 10 characters, e.g. ABCDE1234F.');
    }
  }

  // Cross-field: GST chars 3-12 must equal PAN.
  if (!isBlank(gstNumber) && !isBlank(panNumber) && typeof gstNumber === 'string' && gstNumber.length === 15) {
    if (gstNumber.substring(2, 12) !== panNumber) {
      errors.push(`The PAN does not match the one inside the GST number (${gstNumber.substring(2, 12)}).`);
    }
  }

  // is_msme / msme_registration_no
  if (isMsme && isBlank(msmeRegNo)) {
    errors.push('Enter the MSME registration number, or untick MSME registered.');
  } else if (!isBlank(msmeRegNo)) {
    if (typeof msmeRegNo !== 'string' || msmeRegNo.length > 40) {
      errors.push('MSME registration number cannot exceed 40 characters');
    }
  }

  // Primary contact fields (top-level, NOT an array — no reachability rule
  // applies to these, matching the source exactly).
  if (!isBlank(body.contact_name)) {
    if (typeof body.contact_name !== 'string' || body.contact_name.length > 120) {
      errors.push('Contact name cannot exceed 120 characters');
    }
  }
  if (!isBlank(body.contact_designation_id)) {
    if (!isInteger(body.contact_designation_id)) {
      errors.push('Contact designation must be an integer');
    } else {
      const exists = await supplierRepository.designationExistsActive(Number(body.contact_designation_id));
      if (!exists) errors.push('Selected contact designation does not exist or is inactive');
    }
  }
  if (!isBlank(body.contact_email)) {
    if (typeof body.contact_email !== 'string' || body.contact_email.length > 150 || !EMAIL_REGEX.test(body.contact_email)) {
      errors.push('Enter a valid contact email address');
    }
  }
  if (!isBlank(body.contact_mobile)) {
    if (typeof body.contact_mobile !== 'string' || body.contact_mobile.length > 30) {
      errors.push('Contact mobile cannot exceed 30 characters');
    }
  }

  // contacts[] — secondary contacts, no cap, WITH the reachability cross-field rule.
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

        if (!hasName && (hasMobile || hasEmail || hasDesignation)) {
          errors.push(`Enter a name for contact row ${idx + 1}, or clear the row.`);
        } else if (hasName) {
          if (typeof row.name !== 'string' || row.name.length > 120) {
            errors.push(`Contact row ${idx + 1}: name cannot exceed 120 characters`);
          }
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
            const exists = await supplierRepository.designationExistsActive(Number(row.designation_id));
            if (!exists) errors.push(`Contact row ${idx + 1}: selected designation does not exist or is inactive`);
          }
        }
      }
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
      const exists = await supplierRepository.countryExists(Number(body.country_id));
      if (!exists) errors.push('Selected country does not exist');
    }
  }

  // state_id — scoped to the (possibly already-nulled) country_id.
  if (!isBlank(stateId)) {
    if (!isInteger(stateId)) {
      errors.push('State must be an integer');
    } else if (isBlank(body.country_id)) {
      errors.push('That state does not belong to the selected country.');
    } else {
      const exists = await supplierRepository.stateExistsForCountry(Number(stateId), Number(body.country_id));
      if (!exists) errors.push('That state does not belong to the selected country.');
    }
  }

  // city_id — scoped to the (possibly already-nulled) state_id.
  if (!isBlank(cityId)) {
    if (!isInteger(cityId)) {
      errors.push('City must be an integer');
    } else if (isBlank(stateId)) {
      errors.push('That city does not belong to the selected state.');
    } else {
      const exists = await supplierRepository.cityExistsForState(Number(cityId), Number(stateId));
      if (!exists) errors.push('That city does not belong to the selected state.');
    }
  }

  // pincode
  if (!isBlank(body.pincode)) {
    if (typeof body.pincode !== 'string' || body.pincode.length > 20) {
      errors.push('Pincode cannot exceed 20 characters');
    }
  }

  // category_ids
  const categoryIds = body.category_ids;
  if (!isBlank(categoryIds)) {
    if (typeof categoryIds !== 'object') {
      errors.push('Product category must be an array');
    } else {
      const list = Array.isArray(categoryIds) ? categoryIds : Object.values(categoryIds);
      if (!list.every((cid) => isInteger(cid))) {
        errors.push('Product category must contain valid integers');
      } else {
        for (const cid of list) {
          const exists = await supplierRepository.categoryExists(Number(cid));
          if (!exists) { errors.push('One or more selected categories do not exist'); break; }
        }
      }
    }
  }

  // discount_percent — "maximum 2 characters", so 0-99.99.
  if (!isBlank(body.discount_percent)) {
    const v = Number(body.discount_percent);
    if (!isNumeric(body.discount_percent) || v < 0 || v > 99.99) {
      errors.push('The discount may not be more than 99.99% — the sheet allows two characters.');
    }
  }

  // credit_days — "maximum 3 characters", so 0-999.
  if (!isBlank(body.credit_days)) {
    if (!isInteger(body.credit_days) || Number(body.credit_days) < 0 || Number(body.credit_days) > 999) {
      errors.push('Credit terms may not be more than 999 days — the sheet allows three characters.');
    }
  }

  // bank_name / account_number / ifsc_code
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
  if (!isBlank(ifscCode)) {
    if (typeof ifscCode !== 'string' || ifscCode.length !== 11) {
      errors.push('An IFSC code is exactly 11 characters.');
    } else if (!IFSC_REGEX.test(ifscCode)) {
      errors.push('That is not a valid IFSC code — expected 11 characters, e.g. HDFC0001234.');
    }
  }

  // agent_id — side-filtered by party_type, excludes soft-deleted agents.
  if (!isBlank(body.agent_id)) {
    if (!isInteger(body.agent_id)) {
      errors.push('Agent must be an integer');
    } else {
      const sides = AGENT_SIDES[body.party_type] || ['supplier'];
      const exists = await supplierRepository.agentExistsForSides(Number(body.agent_id), sides);
      if (!exists) errors.push('That agent is not available for this party type — check the Agent master.');
    }
  }

  // agent_commission_type / agent_commission_value
  if (hasCommissionValue && isBlank(agentCommissionType)) {
    errors.push('Choose whether the commission is a percentage or an amount.');
  } else if (!isBlank(agentCommissionType)) {
    if (!['percent', 'amount'].includes(agentCommissionType)) {
      errors.push('Commission type must be either percent or amount');
    }
  }
  if (hasCommissionValue) {
    const v = Number(body.agent_commission_value);
    if (!isNumeric(body.agent_commission_value) || v < 0 || v > 99999999.9999) {
      errors.push('Agent commission must be a number between 0 and 99999999.9999');
    }
  }

  // default_delivery_mode — REQUIRED regardless of party_type (not jobwork-gated).
  if (!body.default_delivery_mode || !DELIVERY_MODES.includes(body.default_delivery_mode)) {
    errors.push('Delivery mode is required and must be one of direct_to_port, to_office, to_warehouse');
  }

  // buyer_ids — jobwork-only, already reset to [] above for a trading-only party.
  if (!isBlank(buyerIds)) {
    if (typeof buyerIds !== 'object') {
      errors.push('Buyer must be an array');
    } else {
      const list = Array.isArray(buyerIds) ? buyerIds : Object.values(buyerIds);
      if (!list.every((bid) => isInteger(bid))) {
        errors.push('Buyer must contain valid integers');
      } else {
        for (const bid of list) {
          const exists = await supplierRepository.buyerExists(Number(bid));
          if (!exists) { errors.push('One or more selected buyers do not exist'); break; }
        }
      }
    }
  }

  // client_details — accepted (jobwork-only, already nulled above when not
  // applicable), but the locked schema has no suppliers.client_details
  // column, so it is never persisted. No shape validation needed beyond
  // basic string sanity.
  if (!isBlank(clientDetails)) {
    if (typeof clientDetails !== 'string' || clientDetails.length > 2000) {
      errors.push('Client details cannot exceed 2000 characters');
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

  // comments — accepted for API compatibility, shape-checked, NEVER persisted
  // (no suppliers.comments column on the locked schema).
  if (!isBlank(body.comments)) {
    if (typeof body.comments !== 'string' || body.comments.length > 1000) {
      errors.push('Comments cannot exceed 1000 characters');
    }
  }

  // Write the normalized values back for the controller/service to use.
  req.body.display_code = displayCode;
  req.body.gst_number = gstNumber;
  req.body.pan_number = panNumber;
  req.body.ifsc_code = ifscCode;
  req.body.msme_registration_no = msmeRegNo;
  req.body.is_msme = isMsme;
  req.body.we_supply_material = weSupplyMaterial;
  req.body.requires_sample_approval = requiresSampleApproval;
  req.body.buyer_ids = buyerIds;
  req.body.client_details = clientDetails;
  req.body.state_id = stateId;
  req.body.city_id = cityId;
  req.body.agent_commission_type = agentCommissionType;

  return errors;
};

export const supplierValidator = {
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
