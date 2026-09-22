import { pool } from '../../config/database.js';

export const markupRepository = {
  findAll: async ({ search, status, sort, direction, page = 1, limit = 10 }) => {
    let query = `
      SELECT
        m.id, m.supplier_id, m.buyer_id, m.record_date, m.markup_percent,
        m.status, m.remarks, m.created_at, m.updated_at,
        s.display_code  AS supplier_display_code,
        s.company_name  AS supplier_name,
        s.discount_percent AS supplier_discount_percent,
        b.display_code  AS buyer_display_code,
        b.company_name  AS buyer_name
      FROM markups m
      LEFT JOIN suppliers s ON s.id = m.supplier_id
      LEFT JOIN buyers    b ON b.id = m.buyer_id
      WHERE m.deleted_at IS NULL
    `;
    const params = [];

    if (search) {
      query += ` AND (
        s.company_name  LIKE ? OR s.display_code LIKE ?
        OR b.company_name LIKE ? OR b.display_code LIKE ?
        OR m.remarks    LIKE ?
      )`;
      const term = `%${search}%`;
      params.push(term, term, term, term, term);
    }

    if (status === 'active' || status === 'inactive') {
      query += ` AND m.status = ?`;
      params.push(status);
    }

    const allowedSortFields = {
      'id':             'm.id',
      'markup_percent': 'm.markup_percent',
      'record_date':    'm.record_date',
      'status':         'm.status',
      'created_at':     'm.created_at',
    };
    const sortColumn = allowedSortFields[sort];
    const sortField  = sortColumn || 'm.id';
    const sortDir    = sortColumn
      ? (String(direction).toUpperCase() === 'DESC' ? 'DESC' : 'ASC')
      : 'DESC';
    query += ` ORDER BY ${sortField} ${sortDir}`;

    const [countRows] = await pool.query(`SELECT COUNT(*) as total FROM (${query}) as t`, params);
    const total = countRows[0].total;
    const safeLimit  = Number(limit) > 0 ? Number(limit) : 10;
    const safePage   = Number(page)  > 0 ? Number(page)  : 1;
    const offset     = (safePage - 1) * safeLimit;
    query += ` LIMIT ? OFFSET ?`;
    params.push(safeLimit, offset);
    const [rows] = await pool.query(query, params);
    return { data: rows, total, page: safePage, limit: safeLimit };
  },

  findById: async (id) => {
    const [rows] = await pool.query(
      'SELECT * FROM markups WHERE id = ? AND deleted_at IS NULL', [id]
    );
    return rows[0] || null;
  },

  findByIdWithRelations: async (id) => {
    const [rows] = await pool.query(`
      SELECT
        m.id, m.supplier_id, m.buyer_id, m.record_date, m.markup_percent,
        m.status, m.remarks, m.created_by, m.updated_by, m.created_at, m.updated_at,
        s.display_code  AS supplier_display_code,
        s.company_name  AS supplier_name,
        s.discount_percent AS supplier_discount_percent,
        s.agent_commission_type  AS supplier_agent_commission_type,
        s.agent_commission_value AS supplier_agent_commission_value,
        sa.name         AS supplier_agent_name,
        sa.display_code AS supplier_agent_display_code,
        b.display_code  AS buyer_display_code,
        b.company_name  AS buyer_name,
        b.agent_commission_type  AS buyer_agent_commission_type,
        b.agent_commission_value AS buyer_agent_commission_value,
        ba.name         AS buyer_agent_name,
        ba.display_code AS buyer_agent_display_code,
        u1.name         AS creator_name,
        u2.name         AS updater_name
      FROM markups m
      LEFT JOIN suppliers s  ON s.id  = m.supplier_id
      LEFT JOIN buyers    b  ON b.id  = m.buyer_id
      LEFT JOIN agents    sa ON sa.id = s.agent_id
      LEFT JOIN agents    ba ON ba.id = b.agent_id
      LEFT JOIN users     u1 ON u1.id = m.created_by
      LEFT JOIN users     u2 ON u2.id = m.updated_by
      WHERE m.id = ? AND m.deleted_at IS NULL`,
      [id]
    );
    return rows[0] || null;
  },

  // Does NOT exclude soft-deleted rows — matches the DB unique index and
  // MarkupRequest comment about restoring rather than recreating.
  pairExists: async (supplierId, buyerId, ignoreId = null) => {
    let q = 'SELECT 1 FROM markups WHERE supplier_id = ? AND buyer_id = ?';
    const p = [supplierId, buyerId];
    if (ignoreId) { q += ' AND id != ?'; p.push(ignoreId); }
    const [rows] = await pool.query(q, p);
    return rows.length > 0;
  },

  supplierActiveExists: async (id) => {
    const [rows] = await pool.query(
      "SELECT 1 FROM suppliers WHERE id = ? AND status = 'active' AND deleted_at IS NULL", [id]
    );
    return rows.length > 0;
  },

  buyerActiveExists: async (id) => {
    const [rows] = await pool.query(
      "SELECT 1 FROM buyers WHERE id = ? AND status = 'active' AND deleted_at IS NULL", [id]
    );
    return rows.length > 0;
  },

  getActiveSuppliersForForm: async (keepId = null) => {
    let q = `SELECT id, display_code, company_name FROM suppliers
              WHERE deleted_at IS NULL AND (status = 'active'`;
    const p = [];
    if (keepId) { q += ' OR id = ?'; p.push(keepId); }
    q += ') ORDER BY company_name';
    const [rows] = await pool.query(q, p);
    return rows;
  },

  getActiveBuyersForForm: async (keepId = null) => {
    let q = `SELECT id, display_code, company_name FROM buyers
              WHERE deleted_at IS NULL AND (status = 'active'`;
    const p = [];
    if (keepId) { q += ' OR id = ?'; p.push(keepId); }
    q += ') ORDER BY company_name';
    const [rows] = await pool.query(q, p);
    return rows;
  },

  getDefaultMarkups: async () => {
    const [rows] = await pool.query(
      "SELECT id, name, markup_percent FROM default_markups WHERE deleted_at IS NULL AND status = 'active' ORDER BY name"
    );
    return rows;
  },

  getAllSupplierDiscounts: async () => {
    const [rows] = await pool.query('SELECT id, discount_percent FROM suppliers WHERE deleted_at IS NULL');
    return rows;
  },

  getAllSupplierAgentCommissions: async () => {
    const [rows] = await pool.query(`
      SELECT s.id, a.name AS agent_name, a.display_code AS agent_display_code,
             s.agent_commission_type, s.agent_commission_value
      FROM suppliers s LEFT JOIN agents a ON a.id = s.agent_id WHERE s.deleted_at IS NULL`
    );
    return rows;
  },

  getAllBuyerAgentCommissions: async () => {
    const [rows] = await pool.query(`
      SELECT b.id, a.name AS agent_name, a.display_code AS agent_display_code,
             b.agent_commission_type, b.agent_commission_value
      FROM buyers b LEFT JOIN agents a ON a.id = b.agent_id WHERE b.deleted_at IS NULL`
    );
    return rows;
  },

  create: async (data) => {
    const [result] = await pool.query(
      `INSERT INTO markups
         (supplier_id, buyer_id, record_date, markup_percent, status, remarks, created_by, updated_by, created_at, updated_at)
       VALUES (?, ?, CURDATE(), ?, ?, ?, ?, ?, NOW(), NOW())`,
      [data.supplier_id, data.buyer_id, data.markup_percent, data.status, data.remarks, data.created_by, data.updated_by]
    );
    return result.insertId;
  },

  update: async (id, data) => {
    await pool.query(
      `UPDATE markups SET supplier_id=?, buyer_id=?, markup_percent=?, status=?, remarks=?, updated_by=?, updated_at=NOW()
       WHERE id=? AND deleted_at IS NULL`,
      [data.supplier_id, data.buyer_id, data.markup_percent, data.status, data.remarks, data.updated_by, id]
    );
  },

  toggleStatus: async (id, newStatus, userId) => {
    await pool.query(
      'UPDATE markups SET status=?, updated_by=?, updated_at=NOW() WHERE id=? AND deleted_at IS NULL',
      [newStatus, userId, id]
    );
  },

  softDelete: async (id) => {
    await pool.query('UPDATE markups SET deleted_at=NOW() WHERE id=? AND deleted_at IS NULL', [id]);
  },
};
