import { pool } from '../../config/database.js';

// Explicit column list everywhere a full row is read — `agents.commission_rate`
// is a stale column the current Laravel source no longer uses at all (replaced
// by agent_commissions rows). It must never be read or written, so it is
// deliberately excluded here rather than relying on callers to ignore it after
// a `SELECT *`.
const AGENT_COLUMNS = 'id, agent_type, name, display_code, calculation_basis_id, status, remarks, created_by, updated_by, created_at, updated_at, deleted_at';

export const agentRepository = {
  findAll: async ({ search, status, agent_type, sort, direction, page = 1, limit = 10 }) => {
    let query = `
      SELECT
        a.id, a.agent_type, a.name, a.display_code, a.status, a.created_at, a.updated_at,
        cb.name AS calculation_basis_name,
        (SELECT COUNT(*) FROM agent_category ac WHERE ac.agent_id = a.id) AS categories_count,
        (SELECT COUNT(*) FROM agent_commissions acm WHERE acm.agent_id = a.id) AS commissions_count
      FROM agents a
      LEFT JOIN calculation_bases cb ON cb.id = a.calculation_basis_id
      WHERE a.deleted_at IS NULL
    `;

    const params = [];

    // Search only the columns that actually exist on the locked schema —
    // city/phone from Laravel's searchable() have no backing column here.
    if (search) {
      query += ` AND (a.display_code LIKE ? OR a.name LIKE ? OR a.remarks LIKE ?)`;
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    if (status === 'active' || status === 'inactive') {
      query += ` AND a.status = ?`;
      params.push(status);
    }

    if (agent_type === 'supplier' || agent_type === 'buyer' || agent_type === 'jobber') {
      query += ` AND a.agent_type = ?`;
      params.push(agent_type);
    }

    // Whitelisted sort columns. An unrecognized/absent `sort` falls back to
    // newest-first (id DESC), matching Filterable::scopeSort()'s latest('id').
    const allowedSortFields = {
      'id': 'a.id',
      'display_code': 'a.display_code',
      'name': 'a.name',
      'status': 'a.status',
      'created_at': 'a.created_at'
    };

    const sortColumn = allowedSortFields[sort];
    const sortField = sortColumn || 'a.id';
    const sortDirection = sortColumn
      ? (String(direction).toUpperCase() === 'DESC' ? 'DESC' : 'ASC')
      : 'DESC';

    query += ` ORDER BY ${sortField} ${sortDirection}`;

    const [countRows] = await pool.query(`SELECT COUNT(*) as total FROM (${query}) as t`, params);
    const total = countRows[0].total;

    const safeLimit = Number(limit) > 0 ? Number(limit) : 10;
    const safePage = Number(page) > 0 ? Number(page) : 1;
    const offset = (safePage - 1) * safeLimit;

    query += ` LIMIT ? OFFSET ?`;
    params.push(safeLimit, offset);

    const [rows] = await pool.query(query, params);

    return {
      data: rows,
      total,
      page: safePage,
      limit: safeLimit
    };
  },

  findById: async (id) => {
    const [rows] = await pool.query(
      `SELECT ${AGENT_COLUMNS} FROM agents WHERE id = ? AND deleted_at IS NULL`,
      [id]
    );
    return rows[0] || null;
  },

  findByIdIncludingRelations: async (id) => {
    const [rows] = await pool.query(
      `SELECT
        a.id, a.agent_type, a.name, a.display_code, a.calculation_basis_id, a.status, a.remarks,
        a.created_by, a.updated_by, a.created_at, a.updated_at, a.deleted_at,
        cb.name AS calculation_basis_name,
        u1.name AS creator_name,
        u2.name AS updater_name
      FROM agents a
      LEFT JOIN calculation_bases cb ON cb.id = a.calculation_basis_id
      LEFT JOIN users u1 ON u1.id = a.created_by
      LEFT JOIN users u2 ON u2.id = a.updated_by
      WHERE a.id = ? AND a.deleted_at IS NULL`,
      [id]
    );
    return rows[0] || null;
  },

  getCategories: async (agentId) => {
    const [rows] = await pool.query(
      `SELECT c.id, c.name
       FROM agent_category ac
       JOIN categories c ON c.id = ac.category_id
       WHERE ac.agent_id = ?
       ORDER BY c.name ASC`,
      [agentId]
    );
    return rows;
  },

  getCommissions: async (agentId) => {
    const [rows] = await pool.query(
      `SELECT acm.id, acm.commission_type, acm.amount, acm.currency_id, acm.sort_order, cur.iso_code AS currency_iso_code
       FROM agent_commissions acm
       LEFT JOIN currencies cur ON cur.id = acm.currency_id
       WHERE acm.agent_id = ?
       ORDER BY acm.sort_order ASC`,
      [agentId]
    );
    return rows;
  },

  /**
   * Uniqueness deliberately INCLUDES soft-deleted rows, matching Laravel's
   * `Rule::unique` (the DB index has no knowledge of deleted_at either) and
   * `checkCode()`'s own `Agent::withTrashed()`.
   */
  displayCodeExists: async (code, ignoreId = null) => {
    let query = 'SELECT 1 FROM agents WHERE display_code = ?';
    const params = [code];
    if (ignoreId) {
      query += ' AND id != ?';
      params.push(ignoreId);
    }
    const [rows] = await pool.query(query, params);
    return rows.length > 0;
  },

  nameExists: async (name, ignoreId = null) => {
    let query = 'SELECT 1 FROM agents WHERE name = ?';
    const params = [name];
    if (ignoreId) {
      query += ' AND id != ?';
      params.push(ignoreId);
    }
    const [rows] = await pool.query(query, params);
    return rows.length > 0;
  },

  // -- Raw existence checks for FK validation (Rule::exists semantics — no
  // status filtering, matching the source's literal validation rules) --

  categoryExists: async (id) => {
    const [rows] = await pool.query('SELECT 1 FROM categories WHERE id = ?', [id]);
    return rows.length > 0;
  },

  calculationBasisExists: async (id) => {
    const [rows] = await pool.query('SELECT 1 FROM calculation_bases WHERE id = ?', [id]);
    return rows.length > 0;
  },

  currencyExists: async (id) => {
    const [rows] = await pool.query('SELECT 1 FROM currencies WHERE id = ?', [id]);
    return rows.length > 0;
  },

  // -- canDelete: real dependency counts, not a stub --

  countBuyersForAgent: async (agentId) => {
    const [rows] = await pool.query(
      'SELECT COUNT(*) as cnt FROM buyers WHERE agent_id = ? AND deleted_at IS NULL',
      [agentId]
    );
    return rows[0].cnt;
  },

  countSuppliersForAgent: async (agentId) => {
    const [rows] = await pool.query(
      'SELECT COUNT(*) as cnt FROM suppliers WHERE agent_id = ? AND deleted_at IS NULL',
      [agentId]
    );
    return rows[0].cnt;
  },

  // -- Create / update / status / delete. commission_rate is never touched. --

  create: async (connection, data) => {
    const [result] = await connection.query(
      `INSERT INTO agents (
        agent_type, name, display_code, calculation_basis_id, status, remarks,
        created_by, updated_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        data.agent_type, data.name, data.display_code, data.calculation_basis_id,
        data.status, data.remarks, data.created_by, data.updated_by
      ]
    );
    return result.insertId;
  },

  update: async (connection, id, data) => {
    await connection.query(
      `UPDATE agents SET
        agent_type = ?, name = ?, display_code = ?, calculation_basis_id = ?, status = ?, remarks = ?,
        updated_by = ?, updated_at = NOW()
      WHERE id = ? AND deleted_at IS NULL`,
      [
        data.agent_type, data.name, data.display_code, data.calculation_basis_id, data.status, data.remarks,
        data.updated_by, id
      ]
    );
  },

  toggleStatus: async (id, newStatus, userId) => {
    await pool.query(
      'UPDATE agents SET status = ?, updated_by = ?, updated_at = NOW() WHERE id = ? AND deleted_at IS NULL',
      [newStatus, userId, id]
    );
  },

  softDelete: async (id) => {
    await pool.query(
      'UPDATE agents SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL',
      [id]
    );
  },

  // -- Category pivot: delete-then-bulk-insert. The caller must de-duplicate
  // categoryIds first — agent_category has no composite unique key on the
  // locked schema (unlike Laravel's migration), so the DB will not stop a
  // duplicate (agent_id, category_id) pair from being inserted twice.

  syncCategories: async (connection, agentId, categoryIds) => {
    await connection.query('DELETE FROM agent_category WHERE agent_id = ?', [agentId]);
    if (Array.isArray(categoryIds) && categoryIds.length > 0) {
      const values = categoryIds.map((cid) => [agentId, cid]);
      await connection.query('INSERT INTO agent_category (agent_id, category_id) VALUES ?', [values]);
    }
  },

  // -- Commissions: full delete-and-reinsert, order/skip logic in the service --

  deleteCommissions: async (connection, agentId) => {
    await connection.query('DELETE FROM agent_commissions WHERE agent_id = ?', [agentId]);
  },

  insertCommission: async (connection, agentId, row) => {
    await connection.query(
      `INSERT INTO agent_commissions (agent_id, commission_type, amount, currency_id, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
      [agentId, row.commission_type, row.amount, row.currency_id, row.sort_order]
    );
  },

  // -- Lookup/dropdown data. Active-only, WITH current-value union when
  // editing — matches AgentController::formData()'s Product-style pattern
  // (unlike Buyer/Supplier, which never union).

  getCategoriesForForm: async (includeIds = []) => {
    const params = ['active'];
    let query = `SELECT id, name FROM categories WHERE deleted_at IS NULL AND (status = ?`;
    if (includeIds.length > 0) {
      const placeholders = includeIds.map(() => '?').join(',');
      query += ` OR id IN (${placeholders})`;
      params.push(...includeIds);
    }
    query += ') ORDER BY name ASC';
    const [rows] = await pool.query(query, params);
    return rows;
  },

  getCalculationBasesForForm: async (includeId = null) => {
    const params = ['active'];
    let query = `SELECT id, name FROM calculation_bases WHERE (status = ?`;
    if (includeId) {
      query += ' OR id = ?';
      params.push(includeId);
    }
    query += ') ORDER BY name ASC';
    const [rows] = await pool.query(query, params);
    return rows;
  },

  getCurrenciesForForm: async (includeIds = []) => {
    const params = ['active'];
    let query = `SELECT id, iso_code, name, symbol FROM currencies WHERE (status = ?`;
    if (includeIds.length > 0) {
      const placeholders = includeIds.map(() => '?').join(',');
      query += ` OR id IN (${placeholders})`;
      params.push(...includeIds);
    }
    query += ') ORDER BY iso_code ASC';
    const [rows] = await pool.query(query, params);
    return rows;
  }
};
