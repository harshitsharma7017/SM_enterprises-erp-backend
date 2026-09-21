import { pool } from '../../config/database.js';
import { buyerRepository } from './buyer.repository.js';
import { numberSeriesService } from '../../services/number-series.service.js';

const isBlank = (v) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '');

export const buyerService = {

  findAll: async (filters) => {
    return await buyerRepository.findAll(filters);
  },

  /**
   * Only the relationships representable by the locked schema are attached:
   * categories, carton markings, contacts, country, port, agent, payment
   * term, incoterm, currency, shipment method (FK — see syncBuyerPayload's
   * comment), creator/updater. State, city, accepted currencies/incoterms
   * and primary contact designation are never attached because the schema
   * cannot persist them (see the Phase 10 report for the full rationale).
   */
  findById: async (id) => {
    const buyer = await buyerRepository.findByIdIncludingRelations(id);
    if (!buyer) return null;

    const [categories, cartonMarkings, contacts] = await Promise.all([
      buyerRepository.getCategories(id),
      buyerRepository.getCartonMarkings(id),
      buyerRepository.getContacts(id)
    ]);

    return { ...buyer, categories, carton_markings: cartonMarkings, contacts };
  },

  /**
   * Builds the buyers-table payload from validated input. `comments` is
   * deliberately never read here — the locked schema has no
   * buyers.comments column. State/city/advance_percent/sight_percent/
   * contact_designation_id/accepted-currency-incoterm-sets are likewise
   * never read — the locked schema cannot persist them.
   */
  buildPayload: (data) => ({
    company_name: data.company_name,
    name_on_export_invoice: data.name_on_export_invoice || null,
    contact_person: data.contact_person || null,
    email: data.email || null,
    mobile: data.mobile || null,
    gst_vat_no: data.gst_vat_no || null,
    address: data.address || null,
    country_id: data.country_id || null,
    pincode: data.pincode || null,
    port_id: data.port_id || null,
    agent_id: data.agent_id || null,
    // An empty commission value with a type selected is not a commission —
    // mirrors BuyerRequest::prepareForValidation()'s defensive nulling.
    agent_commission_type: isBlank(data.agent_commission_value) ? null : (data.agent_commission_type || null),
    agent_commission_value: isBlank(data.agent_commission_value) ? null : data.agent_commission_value,
    payment_term_id: data.payment_term_id || null,
    incoterm_id: data.incoterm_id || null,
    currency_id: data.currency_id || null,
    shipment_method_id: data.shipment_method_id || null,
    bank_name: data.bank_name || null,
    account_number: data.account_number || null,
    swift_code: data.swift_code || null,
    status: data.status,
    remarks: data.remarks || null
  }),

  create: async (data, userId) => {
    let connection;
    try {
      connection = await pool.getConnection();
      await connection.beginTransaction();

      // display_code is server-assigned inside the same transaction as the
      // insert: next() holds a row lock on the counter until this commits,
      // so two concurrent creates cannot both be handed the same code.
      const displayCode = await numberSeriesService.next(connection, 'buyer');

      const payload = {
        display_code: displayCode,
        ...buyerService.buildPayload(data),
        created_by: userId,
        updated_by: userId
      };

      const buyerId = await buyerRepository.create(connection, payload);

      await buyerRepository.syncCategories(connection, buyerId, data.category_ids || []);
      await buyerService.syncCartonMarkings(connection, buyerId, data.carton_markings || []);
      await buyerService.syncContacts(connection, buyerId, data.contacts || []);

      await connection.commit();

      return await buyerService.findById(buyerId);
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

      const existing = await buyerRepository.findById(id);
      if (!existing) {
        throw { status: 404, message: 'Buyer not found' };
      }

      const payload = {
        ...buyerService.buildPayload(data),
        updated_by: userId
      };

      await buyerRepository.update(connection, id, payload);

      await buyerRepository.syncCategories(connection, id, data.category_ids || []);
      await buyerService.syncCartonMarkings(connection, id, data.carton_markings || []);
      await buyerService.syncContacts(connection, id, data.contacts || []);

      await connection.commit();

      return await buyerService.findById(id);
    } catch (error) {
      if (connection) await connection.rollback();
      throw error;
    } finally {
      if (connection) connection.release();
    }
  },

  /**
   * Full delete-and-reinsert. Rows where BOTH label and value are blank are
   * dropped. line_no is CONTIGUOUS over the surviving rows (1, 2, 3, ...),
   * not the original array index — unlike Product's BOM sort_order, which
   * preserves gaps. is_required is derived (line_no <= 3), never accepted
   * from the client. Matches BuyerService::syncCartonMarkings() exactly.
   */
  syncCartonMarkings: async (connection, buyerId, rows) => {
    await buyerRepository.deleteCartonMarkings(connection, buyerId);

    let lineNo = 0;
    for (const raw of rows) {
      const row = raw || {};
      const label = typeof row.label === 'string' ? row.label.trim() : '';
      const value = typeof row.value === 'string' ? row.value.trim() : '';

      if (label === '' && value === '') continue;

      lineNo++;
      await buyerRepository.insertCartonMarking(connection, buyerId, {
        line_no: lineNo,
        label: label !== '' ? label : `LINE ${lineNo}`,
        value: value !== '' ? value : null,
        is_required: lineNo <= 3
      });
    }
  },

  /**
   * Full delete-and-reinsert. A row with a blank name is dropped silently
   * (not reported as an error — validation only rejects the opposite case).
   * No cap enforced here (none in Laravel's service either — the ceiling,
   * if any, is entirely the validator's job, and there isn't one).
   */
  syncContacts: async (connection, buyerId, rows) => {
    await buyerRepository.deleteContacts(connection, buyerId);

    for (const raw of rows) {
      const row = raw || {};
      const name = typeof row.name === 'string' ? row.name.trim() : '';
      if (name === '') continue;

      await buyerRepository.insertContact(connection, buyerId, {
        name,
        designation_id: isBlank(row.designation_id) ? null : row.designation_id,
        mobile: row.mobile || null,
        email: row.email || null
      });
    }
  },

  /**
   * Stub, matching BuyerService::canDelete() exactly: "Nothing points at a
   * buyer yet — orders, quotations and shipments come in later phases."
   * Do not invent dependency checks here.
   */
  canDelete: async (_id) => {
    return { allowed: true, reason: null };
  },

  delete: async (id) => {
    const existing = await buyerRepository.findById(id);
    if (!existing) {
      throw { status: 404, message: 'Buyer not found' };
    }

    const check = await buyerService.canDelete(id);
    if (!check.allowed) {
      throw { status: 400, message: check.reason };
    }

    // Soft delete only — no transaction needed for a single UPDATE, matching
    // the source (no DB::transaction wraps Buyer::delete()). Categories,
    // carton markings and contacts are left in place; nothing cascades on a
    // soft delete.
    await buyerRepository.softDelete(id);
  },

  toggleStatus: async (id, userId) => {
    const existing = await buyerRepository.findById(id);
    if (!existing) {
      throw { status: 404, message: 'Buyer not found' };
    }

    const newStatus = existing.status === 'active' ? 'inactive' : 'active';
    await buyerRepository.toggleStatus(id, newStatus, userId);

    return await buyerService.findById(id);
  },

  /**
   * Quick-add for the Payment Terms field. Writes only to payment_terms —
   * never touches a buyer row. Matches BuyerController::storePaymentTerm()
   * exactly: no case transform (unlike item_group_code/gst_vat_no), just
   * trim, and applies_to is hard-coded to 'buyer' for a newly created row.
   */
  storePaymentTerm: async (name) => {
    if (isBlank(name) || typeof name !== 'string' || name.length > 80) {
      throw { status: 422, message: 'The name field is required.' };
    }

    const trimmed = name.trim();
    let term = await buyerRepository.findPaymentTermByName(trimmed);
    if (!term) {
      const id = await buyerRepository.createPaymentTerm(trimmed);
      term = { id, name: trimmed };
    }

    return { id: term.id, name: term.name };
  },

  /**
   * Quick-add for the contact Designation field. Writes only to
   * designations. Matches BuyerController::storeDesignation() exactly.
   */
  storeDesignation: async (name) => {
    if (isBlank(name) || typeof name !== 'string' || name.length > 80) {
      throw { status: 422, message: 'The name field is required.' };
    }

    const trimmed = name.trim();
    let designation = await buyerRepository.findDesignationByName(trimmed);
    if (!designation) {
      const id = await buyerRepository.createDesignation(trimmed);
      designation = { id, name: trimmed };
    }

    return { id: designation.id, name: designation.name };
  },

  /**
   * Dropdown sources for the create/edit forms. Active-only, with NO
   * current-value union — unlike Product's asymmetric lookups, Laravel's
   * own Buyer formData() never unions in the record's current (possibly
   * inactive) value for any field, so this must not copy that pattern.
   */
  getFormData: async () => {
    const [categories, agents, countries, ports, designations, paymentTerms, incoterms, currencies, shipmentMethods] =
      await Promise.all([
        buyerRepository.getActiveCategories(),
        buyerRepository.getActiveAgentsByType('buyer'),
        buyerRepository.getActiveCountries(),
        buyerRepository.getActivePorts(),
        buyerRepository.getActiveDesignations(),
        buyerRepository.getPaymentTermsForSide('buyer'),
        buyerRepository.getActiveIncoterms(),
        buyerRepository.getActiveCurrencies(),
        buyerRepository.getActiveShipmentMethods()
      ]);

    return { categories, agents, countries, ports, designations, paymentTerms, incoterms, currencies, shipmentMethods };
  }
};
