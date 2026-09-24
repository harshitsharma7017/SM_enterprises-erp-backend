import { pool } from '../../config/database.js';

// Every table carrying companies.id — used by the delete guard.
const OWNED_TABLES = [
  { table: 'products', label: 'product' },
  { table: 'buyers', label: 'buyer' },
  { table: 'suppliers', label: 'supplier/jobber' },
  { table: 'inquiries', label: 'inquiry' },
  { table: 'order_confirmations', label: 'order confirmation' },
  { table: 'purchase_orders', label: 'purchase order' },
  { table: 'inward_entries', label: 'goods receipt' },
  { table: 'lots', label: 'lot' },
  { table: 'quality_inspections', label: 'quality inspection' },
  { table: 'supplier_returns', label: 'supplier return' },
  { table: 'debit_notes', label: 'debit note' },
  { table: 'stock_locations', label: 'stock location' },
  { table: 'stock_movements', label: 'stock movement' },
  { table: 'material_issues', label: 'material issue' },
  { table: 'processing_records', label: 'processing record' },
  { table: 'order_item_production_allocations', label: 'production allocation' },
  { table: 'dispatches', label: 'dispatch' },
  { table: 'proforma_invoices', label: 'proforma invoice' },
  { table: 'invoices', label: 'invoice' },
  { table: 'export_documents', label: 'export document' },
];

export const companyRepository = {
  findAll: async ({ search, status, offset = 0, limit = 10 }) => {
    let query = `
      SELECT c.id, c.code, c.name, c.short_name, c.address, c.phone, c.email, c.gstin,
             c.is_active, c.created_at, c.updated_at,
             u1.name as creator_name, u2.name as updater_name
      FROM companies c
      LEFT JOIN users u1 ON c.created_by = u1.id
      LEFT JOIN users u2 ON c.updated_by = u2.id
      WHERE c.deleted_at IS NULL
    `;
    const params = [];

    if (search) {
      query += ' AND (c.name LIKE ? OR c.code LIKE ? OR c.short_name LIKE ? OR c.gstin LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }

    if (status === 'active') query += ' AND c.is_active = 1';
    if (status === 'inactive') query += ' AND c.is_active = 0';

    query += ' ORDER BY c.id ASC';

    const [countRows] = await pool.query(`SELECT COUNT(*) as total FROM (${query}) as sub`, params);

    query += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    const [rows] = await pool.query(query, params);

    return { data: rows, total: countRows[0].total, limit: parseInt(limit), offset: parseInt(offset) };
  },

  // Lightweight list for company filters/selectors on other screens.
  options: async () => {
    const [rows] = await pool.query(`
      SELECT id, code, name, short_name, is_active
      FROM companies
      WHERE deleted_at IS NULL
      ORDER BY id ASC
    `);
    return rows;
  },

  findById: async (id) => {
    const [rows] = await pool.query(`
      SELECT c.*, u1.name as creator_name, u2.name as updater_name
      FROM companies c
      LEFT JOIN users u1 ON c.created_by = u1.id
      LEFT JOIN users u2 ON c.updated_by = u2.id
      WHERE c.id = ? AND c.deleted_at IS NULL
    `, [id]);
    return rows[0] || null;
  },

  /** Deliberately includes soft-deleted rows, like the other masters' uniqueness checks. */
  fieldExists: async (field, value, ignoreId = null) => {
    let query = `SELECT 1 FROM companies WHERE ${field} = ?`;
    const params = [value];
    if (ignoreId) {
      query += ' AND id != ?';
      params.push(ignoreId);
    }
    const [rows] = await pool.query(query, params);
    return rows.length > 0;
  },

  create: async (data) => {
    const [result] = await pool.query(`
      INSERT INTO companies (code, name, short_name, address, phone, email, gstin, is_active, created_by, updated_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `, [data.code, data.name, data.short_name, data.address, data.phone, data.email, data.gstin, data.is_active, data.created_by, data.updated_by]);
    return result.insertId;
  },

  update: async (id, data) => {
    await pool.query(`
      UPDATE companies
      SET code = ?, name = ?, short_name = ?, address = ?, phone = ?, email = ?, gstin = ?,
          is_active = ?, updated_by = ?, updated_at = NOW()
      WHERE id = ?
    `, [data.code, data.name, data.short_name, data.address, data.phone, data.email, data.gstin, data.is_active, data.updated_by, id]);
  },

  setActive: async (id, isActive, userId) => {
    await pool.query(
      'UPDATE companies SET is_active = ?, updated_by = ?, updated_at = NOW() WHERE id = ?',
      [isActive, userId, id]
    );
  },

  softDelete: async (id) => {
    await pool.query('UPDATE companies SET deleted_at = NOW() WHERE id = ?', [id]);
  },

  /** Returns [{ label, count }] for every table still referencing the company. */
  usage: async (id) => {
    const usage = [];
    for (const { table, label } of OWNED_TABLES) {
      const [rows] = await pool.query(`SELECT COUNT(*) as cnt FROM \`${table}\` WHERE company_id = ?`, [id]);
      if (rows[0].cnt > 0) usage.push({ label, count: rows[0].cnt });
    }
    return usage;
  },
};
