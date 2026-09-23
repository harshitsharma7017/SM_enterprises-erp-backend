import { pool } from '../../config/database.js';
import { supplierRepository } from './supplier.repository.js';
import { companyScope } from '../../services/company-scope.service.js';

const isBlank = (v) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '');

// "Who Pays This Commission?" — DATABASE_SCHEMA.md §5.
export const AGENT_SIDES = {
  supplier: ['supplier'],
  jobber: ['jobber'],
  both: ['supplier', 'jobber']
};

export const PARTY_TYPES = {
  supplier: 'Supplier (trading — finished goods)',
  jobber: 'Jobber (jobwork — we supply the material)',
  both: 'Both'
};

export const DELIVERY_MODES = {
  to_office: 'To office (repacked here)',
  direct_to_port: 'Direct to port',
  to_warehouse: 'To warehouse'
};

const slugify = (str, separator = '_') => {
  return String(str)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, separator)
    .replace(new RegExp(`^${separator}+|${separator}+$`, 'g'), '');
};

export const supplierService = {

  findAll: async (filters) => {
    return await supplierRepository.findAll(filters);
  },

  /**
   * `includeJobwork` attaches products/buyers — Laravel's SupplierController
   * show()/edit() never load these, only JobberController's do, even though
   * both hit the same underlying row. The Jobber controller passes true.
   */
  findById: async (id, { includeJobwork = false } = {}) => {
    const supplier = await supplierRepository.findByIdIncludingRelations(id);
    if (!supplier) return null;

    const [categories, contacts] = await Promise.all([
      supplierRepository.getCategories(id),
      supplierRepository.getContacts(id)
    ]);

    const result = { ...supplier, categories, contacts };

    if (includeJobwork) {
      const [products, buyers] = await Promise.all([
        supplierRepository.getProducts(id),
        supplierRepository.getBuyers(id)
      ]);
      result.products = products;
      result.buyers = buyers;
    }

    return result;
  },

  /**
   * Builds the suppliers-table payload from validated input. `client_details`
   * and `comments` are deliberately never read here — the locked schema has
   * no such columns on `suppliers`.
   */
  buildPayload: (data) => ({
    // Blank company = shared by both companies.
    company_id: isBlank(data.company_id) ? null : Number(data.company_id),
    display_code: data.display_code,
    party_type: data.party_type,
    company_name: data.company_name,
    name_on_bill: data.name_on_bill || null,
    supplier_type_id: data.supplier_type_id || null,
    gst_number: data.gst_number || null,
    pan_number: data.pan_number || null,
    is_msme: !!data.is_msme,
    msme_registration_no: data.msme_registration_no || null,
    address: data.address || null,
    country_id: data.country_id || null,
    state_id: data.state_id || null,
    city_id: data.city_id || null,
    pincode: data.pincode || null,
    discount_percent: isBlank(data.discount_percent) ? null : data.discount_percent,
    credit_days: isBlank(data.credit_days) ? null : data.credit_days,
    bank_name: data.bank_name || null,
    account_number: data.account_number || null,
    ifsc_code: data.ifsc_code || null,
    agent_id: data.agent_id || null,
    agent_commission_type: isBlank(data.agent_commission_value) ? null : (data.agent_commission_type || null),
    agent_commission_value: isBlank(data.agent_commission_value) ? null : data.agent_commission_value,
    we_supply_material: !!data.we_supply_material,
    requires_sample_approval: !!data.requires_sample_approval,
    default_delivery_mode: data.default_delivery_mode,
    status: data.status,
    remarks: data.remarks || null
  }),

  /** Linked products/buyers may not belong to a different company than the supplier. */
  assertLinksMatchCompany: async (connection, companyId, data) => {
    await companyScope.assertCompatible('products', data.product_ids, companyId, 'A linked product', connection);
    await companyScope.assertCompatible('buyers', data.buyer_ids, companyId, 'A linked buyer', connection);
  },

  /**
   * `defaultPartyType` replicates JobberController::store()'s defensive
   * fallback ("if empty($data['party_type'])... = 'jobber'") — in practice
   * unreachable once validation requires party_type, but preserved for
   * source parity. The Supplier screen passes no default (party_type must
   * be supplied), matching SupplierController::store() exactly.
   */
  create: async (data, userId, { defaultPartyType = null } = {}) => {
    let connection;
    try {
      connection = await pool.getConnection();
      await connection.beginTransaction();

      const payload = {
        ...supplierService.buildPayload(data),
        party_type: data.party_type || defaultPartyType,
        created_by: userId,
        updated_by: userId
      };

      await supplierService.assertLinksMatchCompany(connection, payload.company_id, data);

      const supplierId = await supplierRepository.create(connection, payload);

      await supplierRepository.syncCategories(connection, supplierId, data.category_ids || []);
      await supplierRepository.syncProducts(connection, supplierId, data.product_ids || []);
      await supplierRepository.syncBuyers(connection, supplierId, data.buyer_ids || []);
      await supplierService.syncContacts(connection, supplierId, data);

      await connection.commit();

      return await supplierService.findById(supplierId, { includeJobwork: true });
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

      const existing = await supplierRepository.findById(id);
      if (!existing) {
        throw { status: 404, message: 'Supplier not found' };
      }

      const payload = {
        ...supplierService.buildPayload(data),
        updated_by: userId
      };

      // A client that does not send company_id (e.g. an older screen) keeps the current owner.
      if (data.company_id === undefined) payload.company_id = existing.company_id;

      if (payload.company_id !== existing.company_id) {
        await companyScope.assertChangedOwnerActive(existing.company_id, payload.company_id, connection);
        await companyScope.assertMasterReassignable('suppliers', id, payload.company_id, 'supplier', connection);
      }
      await supplierService.assertLinksMatchCompany(connection, payload.company_id, data);

      await supplierRepository.update(connection, id, payload);

      await supplierRepository.syncCategories(connection, id, data.category_ids || []);
      await supplierRepository.syncProducts(connection, id, data.product_ids || []);
      await supplierRepository.syncBuyers(connection, id, data.buyer_ids || []);
      await supplierService.syncContacts(connection, id, data);

      await connection.commit();

      return await supplierService.findById(id, { includeJobwork: true });
    } catch (error) {
      if (connection) await connection.rollback();
      throw error;
    } finally {
      if (connection) connection.release();
    }
  },

  /**
   * Primary-first contact sync, matching SupplierService::syncContacts()
   * exactly: the top-level contact_name/contact_designation_id/
   * contact_email/contact_mobile fields become the FIRST supplier_contacts
   * row (is_primary=true) when contact_name is filled; the contacts[] array
   * follows as non-primary rows, UNLESS the primary fields were blank, in
   * which case the first surviving array row becomes primary instead.
   */
  syncContacts: async (connection, supplierId, data) => {
    await supplierRepository.deleteContacts(connection, supplierId);

    const rows = [];

    if (!isBlank(data.contact_name)) {
      rows.push({
        name: data.contact_name.trim(),
        designation_id: isBlank(data.contact_designation_id) ? null : data.contact_designation_id,
        mobile: data.contact_mobile || null,
        email: data.contact_email || null,
        is_primary: true
      });
    }

    for (const raw of (data.contacts || [])) {
      const row = raw || {};
      const name = typeof row.name === 'string' ? row.name.trim() : '';
      if (name === '') continue;

      rows.push({
        name,
        designation_id: isBlank(row.designation_id) ? null : row.designation_id,
        mobile: row.mobile || null,
        email: row.email || null,
        is_primary: rows.length === 0
      });
    }

    for (const row of rows) {
      await supplierRepository.insertContact(connection, supplierId, row);
    }
  },

  /**
   * Stub, matching SupplierService::canDelete() exactly: "Nothing points at
   * a supplier yet — purchase orders, bills and payments come in later
   * phases." Do not invent dependency checks here.
   */
  canDelete: async (_id) => {
    return { allowed: true, reason: null };
  },

  delete: async (id) => {
    const existing = await supplierRepository.findById(id);
    if (!existing) {
      throw { status: 404, message: 'Supplier not found' };
    }

    const check = await supplierService.canDelete(id);
    if (!check.allowed) {
      throw { status: 400, message: check.reason };
    }

    // Soft delete only — no transaction needed for a single UPDATE, matching
    // the source. Categories/products/buyers/contacts are left in place.
    await supplierRepository.softDelete(id);
  },

  toggleStatus: async (id, userId) => {
    const existing = await supplierRepository.findById(id);
    if (!existing) {
      throw { status: 404, message: 'Supplier not found' };
    }

    const newStatus = existing.status === 'active' ? 'inactive' : 'active';
    await supplierRepository.toggleStatus(id, newStatus, userId);

    return await supplierService.findById(id, { includeJobwork: true });
  },

  /**
   * Convenience only — the unique index (via displayCodeExists, which
   * includes soft-deleted rows) is the real enforcement. No case transform
   * applied here deliberately — collation handles case-insensitivity, same
   * as the value stored (already uppercased by the validator).
   */
  checkCode: async (value, ignoreId) => {
    const taken = await supplierRepository.displayCodeExists(String(value || '').trim().toUpperCase(), ignoreId);
    return { available: !taken };
  },

  /**
   * Active agents on the sides this party type is allowed to use.
   * `fallbackSides` differs by screen: the Supplier screen falls back to
   * ['supplier'] for an unrecognized party_type, the Jobber screen to
   * ['jobber'] — matching each controller's own `?? [...]` fallback exactly.
   */
  agentsForPartyType: async (partyType, fallbackSides) => {
    const sides = AGENT_SIDES[partyType] || fallbackSides;
    return await supplierRepository.getAgentsForSides(sides);
  },

  /**
   * `code` is generated only for a genuinely new row — found-by-name reuses
   * the existing row's own code untouched. Matches
   * SupplierController::storeSupplierType()/uniqueSupplierTypeCode() exactly.
   */
  storeSupplierType: async (name) => {
    if (isBlank(name) || typeof name !== 'string' || name.length > 80) {
      throw { status: 422, message: 'The name field is required.' };
    }

    const trimmed = name.trim();
    let type = await supplierRepository.findSupplierTypeByName(trimmed);
    if (!type) {
      const code = await supplierService.generateUniqueSupplierTypeCode(trimmed);
      const id = await supplierRepository.createSupplierType(code, trimmed);
      type = { id, name: trimmed };
    }

    return { id: type.id, name: type.name };
  },

  generateUniqueSupplierTypeCode: async (name) => {
    const base = slugify(name) || 'type';
    let code = base.slice(0, 30);
    let suffix = 1;

    while (await supplierRepository.supplierTypeCodeExists(code)) {
      const suffixStr = String(suffix);
      code = `${base.slice(0, 30 - suffixStr.length - 1)}_${suffixStr}`;
      suffix++;
    }

    return code;
  },

  /**
   * Dropdown sources for the create/edit forms. Active-only, no
   * current-value union — matches Laravel's formData() exactly (same as
   * Buyer). `includeJobwork` adds products/buyers, only requested by the
   * Jobber screen.
   */
  // `countryId === undefined` means "nothing chosen yet" and defaults to
  // India, matching create()'s `old('country_id') ? ... : indiaCountryId()`.
  // `edit()` always passes the record's own country_id explicitly (even
  // when null), so it must NOT fall back to India — pass `null` explicitly
  // to suppress the default.
  getFormData: async (partyType, countryId, stateId, { includeJobwork = false, agentFallback = ['supplier'] } = {}) => {
    const [supplierTypes, designations, categories, agents, countries, indiaCountryId] =
      await Promise.all([
        supplierRepository.getActiveSupplierTypes(),
        supplierRepository.getActiveDesignations(),
        supplierRepository.getActiveCategories(),
        supplierService.agentsForPartyType(partyType, agentFallback),
        supplierRepository.getActiveCountries(),
        supplierRepository.getIndiaCountryId()
      ]);

    const effectiveCountryId = countryId !== undefined ? countryId : indiaCountryId;
    const [states, cities] = await Promise.all([
      effectiveCountryId ? supplierRepository.getStatesForCountry(effectiveCountryId) : Promise.resolve([]),
      stateId ? supplierRepository.getCitiesForState(stateId) : Promise.resolve([])
    ]);

    const formData = {
      partyTypes: PARTY_TYPES,
      deliveryModes: DELIVERY_MODES,
      supplierTypes,
      designations,
      categories,
      agents,
      countries,
      indiaCountryId,
      states,
      cities
    };

    if (includeJobwork) {
      const [products, buyers] = await Promise.all([
        supplierRepository.getActiveProducts(),
        supplierRepository.getActiveBuyersForDropdown()
      ]);
      formData.products = products;
      formData.buyers = buyers;
    }

    return formData;
  }
};
