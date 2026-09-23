import { pool } from '../config/database.js';

/**
 * Shared company-scoping rules (multi-company foundation).
 *
 * Company-owned tables (products, inquiries, order_confirmations,
 * purchase_orders, inward_entries, export_documents) carry a `company_id`
 * that is NULL only for legacy rows created before multi-company support
 * ("unassigned"). Optionally-owned tables (buyers, suppliers) use NULL to
 * mean "shared by both companies".
 */

// Where each master is referenced by company-owned transactions:
// [child table, FK column, header table, header FK in child (null = FK is on the header itself)]
const MASTER_USAGE = {
  products: [
    ['inquiry_items', 'product_id', 'inquiries', 'inquiry_id'],
    ['order_confirmation_items', 'product_id', 'order_confirmations', 'order_confirmation_id'],
    ['purchase_order_items', 'product_id', 'purchase_orders', 'purchase_order_id'],
    ['inward_entry_items', 'product_id', 'inward_entries', 'inward_entry_id'],
    ['export_document_items', 'product_id', 'export_documents', 'export_document_id'],
    ['brand_projection_items', 'product_id', 'brand_projections', 'brand_projection_id'],
  ],
  suppliers: [
    ['inquiry_items', 'supplier_id', 'inquiries', 'inquiry_id'],
    ['order_confirmation_items', 'supplier_id', 'order_confirmations', 'order_confirmation_id'],
    ['purchase_orders', 'supplier_id', 'purchase_orders', null],
    ['inward_entries', 'supplier_id', 'inward_entries', null],
  ],
  buyers: [
    ['inquiries', 'buyer_id', 'inquiries', null],
    ['order_confirmations', 'buyer_id', 'order_confirmations', null],
    ['export_documents', 'buyer_id', 'export_documents', null],
  ],
};

const companyError = (message) => {
  const err = new Error(message);
  err.status = 422;
  return err;
};

export const companyScope = {
  /**
   * Normalises a `company_id` list filter.
   * Returns null (all companies), 'unassigned', or a positive integer id.
   */
  parseFilter: (value) => {
    if (value === undefined || value === null || value === '' || value === 'all') return null;
    if (value === 'unassigned' || value === 'shared') return 'unassigned';
    const id = Number(value);
    return Number.isInteger(id) && id > 0 ? id : null;
  },

  /**
   * SQL fragment for a list filter.
   * `includeShared` — for optionally-owned masters, a company filter also
   * returns shared (NULL) rows, since those are usable by every company.
   */
  filterSql: (column, filter, { includeShared = false } = {}) => {
    if (filter === null) return { sql: '', params: [] };
    if (filter === 'unassigned') return { sql: ` AND ${column} IS NULL`, params: [] };
    if (includeShared) return { sql: ` AND (${column} = ? OR ${column} IS NULL)`, params: [filter] };
    return { sql: ` AND ${column} = ?`, params: [filter] };
  },

  /** Throws 422 unless the company exists, is not deleted, and is active. */
  assertActiveCompany: async (companyId, executor = pool) => {
    const id = Number(companyId);
    if (!Number.isInteger(id) || id <= 0) throw companyError('A valid company is required.');
    const [rows] = await executor.query(
      'SELECT id, is_active FROM companies WHERE id = ? AND deleted_at IS NULL',
      [id]
    );
    if (rows.length === 0) throw companyError('The selected company does not exist.');
    if (!rows[0].is_active) throw companyError('The selected company is inactive.');
    return id;
  },

  /**
   * Throws 422 if any referenced row belongs to a different company.
   * Rows with NULL company_id (shared masters / unassigned legacy rows) are
   * compatible with every company. No-op when companyId is NULL (legacy
   * transaction with no owner to compare against).
   */
  assertCompatible: async (table, ids, companyId, label, executor = pool) => {
    if (companyId === null || companyId === undefined) return;
    const unique = [...new Set((ids || []).filter((v) => v !== null && v !== undefined && v !== '').map(Number))];
    if (unique.length === 0) return;
    const [rows] = await executor.query(
      `SELECT id FROM \`${table}\` WHERE id IN (?) AND company_id IS NOT NULL AND company_id <> ?`,
      [unique, companyId]
    );
    if (rows.length > 0) {
      throw companyError(`${label} belongs to a different company than this record.`);
    }
  },

  /**
   * Resolves a company_id change on an existing company-owned record:
   * ownership may be assigned once (NULL -> company) but never changed.
   * Returns the company id to persist.
   */
  resolveOwnership: async (currentCompanyId, requestedCompanyId, executor = pool) => {
    const requested = requestedCompanyId === undefined || requestedCompanyId === null || requestedCompanyId === ''
      ? null
      : Number(requestedCompanyId);

    if (currentCompanyId !== null && currentCompanyId !== undefined) {
      if (requested !== null && requested !== Number(currentCompanyId)) {
        throw companyError('Company cannot be changed once assigned.');
      }
      return Number(currentCompanyId);
    }

    if (requested === null) return null;
    return companyScope.assertActiveCompany(requested, executor);
  },

  /** Cross-company guard for a transaction's buyer / item products / item suppliers. */
  assertLinks: async (companyId, { buyerIds = [], productIds = [], supplierIds = [] }, executor = pool) => {
    await companyScope.assertCompatible('buyers', buyerIds, companyId, 'The selected buyer', executor);
    await companyScope.assertCompatible('products', productIds, companyId, 'A selected product', executor);
    await companyScope.assertCompatible('suppliers', supplierIds, companyId, 'A selected supplier', executor);
  },

  /**
   * Validator helper for a `company_id` body field. Returns an error message
   * or null. `required: false` lets blank mean "shared by both companies".
   */
  checkField: async (value, { required, mustBeActive = true }) => {
    if (value === undefined || value === null || value === '') {
      return required ? 'Company is required' : null;
    }
    const id = Number(value);
    if (!Number.isInteger(id) || id <= 0) return 'A valid company is required.';
    const [rows] = await pool.query('SELECT is_active FROM companies WHERE id = ? AND deleted_at IS NULL', [id]);
    if (rows.length === 0) return 'The selected company does not exist.';
    // On updates an existing owner may since have been deactivated; the
    // service enforces "active" only when ownership actually changes.
    if (mustBeActive && !rows[0].is_active) return 'The selected company is inactive.';
    return null;
  },

  /** For master updates: a changed, non-shared owner must be an active company. */
  assertChangedOwnerActive: async (previousCompanyId, newCompanyId, executor = pool) => {
    if (newCompanyId === null || newCompanyId === undefined) return;
    if (Number(newCompanyId) === previousCompanyId) return;
    await companyScope.assertActiveCompany(newCompanyId, executor);
  },

  /**
   * Throws 422 if moving a master (products | suppliers | buyers) to
   * `newCompanyId` would leave transactions of another company pointing at
   * it. Moving to NULL (shared) is always allowed for buyers/suppliers.
   */
  assertMasterReassignable: async (masterTable, id, newCompanyId, label, executor = pool) => {
    if (newCompanyId === null || newCompanyId === undefined) return;
    for (const [table, fk, header, headerFk] of MASTER_USAGE[masterTable]) {
      const sql = headerFk
        ? `SELECT COUNT(*) as cnt FROM \`${table}\` t JOIN \`${header}\` h ON h.id = t.\`${headerFk}\`
           WHERE t.\`${fk}\` = ? AND h.company_id IS NOT NULL AND h.company_id <> ?`
        : `SELECT COUNT(*) as cnt FROM \`${table}\` h WHERE h.\`${fk}\` = ? AND h.company_id IS NOT NULL AND h.company_id <> ?`;
      const [rows] = await executor.query(sql, [id, newCompanyId]);
      if (rows[0].cnt > 0) {
        throw companyError(`This ${label} is already used by another company's transactions, so it cannot be moved to this company.`);
      }
    }
  },

  error: companyError,
};
