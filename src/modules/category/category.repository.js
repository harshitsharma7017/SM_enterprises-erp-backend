import { pool } from '../../config/database.js';

export const categoryRepository = {
  /**
   * List categories with optional search, status filter, and pagination
   * @param {Object} params
   */
  findAll: async ({ search, status, sort, direction, offset = 0, limit = 10 }) => {
    let query = `
      SELECT 
        c.id, c.code, c.name, c.description, c.status, c.remarks,
        c.created_at, c.updated_at, c.deleted_at,
        u1.name as creator_name,
        u2.name as updater_name,
        (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.deleted_at IS NULL) as products_count
      FROM categories c
      LEFT JOIN users u1 ON c.created_by = u1.id
      LEFT JOIN users u2 ON c.updated_by = u2.id
      WHERE c.deleted_at IS NULL
    `;
    
    const params = [];

    if (search) {
      query += ` AND (c.name LIKE ? OR c.code LIKE ? OR c.remarks LIKE ?)`;
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, searchParam);
    }

    if (status && (status === 'active' || status === 'inactive')) {
      query += ` AND c.status = ?`;
      params.push(status);
    }

    // Sort mapping to prevent SQL injection
    const sortColumns = {
      'id': 'c.id',
      'code': 'c.code',
      'name': 'c.name',
      'status': 'c.status',
      'created_at': 'c.created_at'
    };
    
    const sortColumn = sortColumns[sort] || 'c.id';
    const sortDir = (direction && direction.toUpperCase() === 'DESC') ? 'DESC' : 'ASC';

    query += ` ORDER BY ${sortColumn} ${sortDir}`;
    
    // Total count for pagination
    const countQuery = `SELECT COUNT(*) as total FROM (${query}) as sub`;
    const [countRows] = await pool.query(countQuery, params);
    const total = countRows[0].total;

    // Pagination
    query += ` LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    const [rows] = await pool.query(query, params);

    // Load formats for the items
    if (rows.length > 0) {
      const categoryIds = rows.map(r => r.id);
      const [formatRows] = await pool.query(`
        SELECT cf.category_id, df.id, df.name 
        FROM category_format cf
        JOIN document_formats df ON cf.document_format_id = df.id
        WHERE cf.category_id IN (?)
        ORDER BY df.name ASC
      `, [categoryIds]);

      rows.forEach(row => {
        row.formats = formatRows.filter(f => f.category_id === row.id).map(f => ({ id: f.id, name: f.name }));
      });
    }

    return {
      data: rows,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset)
    };
  },

  findById: async (id) => {
    const [rows] = await pool.query(`
      SELECT * FROM categories WHERE id = ? AND deleted_at IS NULL
    `, [id]);
    return rows[0] || null;
  },

  findByIdIncludingRequiredRelations: async (id) => {
    const query = `
      SELECT 
        c.*,
        u1.name as creator_name,
        u2.name as updater_name,
        (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.deleted_at IS NULL) as products_count
      FROM categories c
      LEFT JOIN users u1 ON c.created_by = u1.id
      LEFT JOIN users u2 ON c.updated_by = u2.id
      WHERE c.id = ? AND c.deleted_at IS NULL
    `;
    const [rows] = await pool.query(query, [id]);
    
    if (rows.length === 0) return null;
    const category = rows[0];

    const [formatRows] = await pool.query(`
      SELECT df.id, df.name 
      FROM category_format cf
      JOIN document_formats df ON cf.document_format_id = df.id
      WHERE cf.category_id = ?
      ORDER BY df.name ASC
    `, [id]);

    category.formats = formatRows;
    return category;
  },

  /**
   * Checks if a category name is already taken.
   * Deliberately INCLUDES soft-deleted records to match Laravel behavior.
   */
  nameExists: async (name, ignoreId = null) => {
    let query = 'SELECT 1 FROM categories WHERE name = ?';
    const params = [name];
    
    if (ignoreId) {
      query += ' AND id != ?';
      params.push(ignoreId);
    }
    
    const [rows] = await pool.query(query, params);
    return rows.length > 0;
  },

  create: async (connection, data) => {
    const { code, name, status, remarks, created_by, updated_by } = data;
    const [result] = await connection.query(`
      INSERT INTO categories (code, name, status, remarks, created_by, updated_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
    `, [code, name, status, remarks, created_by, updated_by]);
    
    return result.insertId;
  },

  update: async (connection, id, data) => {
    const { name, status, remarks, updated_by } = data;
    await connection.query(`
      UPDATE categories 
      SET name = ?, status = ?, remarks = ?, updated_by = ?, updated_at = NOW()
      WHERE id = ?
    `, [name, status, remarks, updated_by, id]);
  },

  toggleStatus: async (id, newStatus, userId) => {
    await pool.query(`
      UPDATE categories 
      SET status = ?, updated_by = ?, updated_at = NOW()
      WHERE id = ?
    `, [newStatus, userId, id]);
  },

  softDelete: async (id) => {
    await pool.query(`
      UPDATE categories SET deleted_at = NOW() WHERE id = ?
    `, [id]);
  },

  syncFormats: async (connection, categoryId, formatIds) => {
    await connection.query('DELETE FROM category_format WHERE category_id = ?', [categoryId]);
    
    if (Array.isArray(formatIds) && formatIds.length > 0) {
      const values = formatIds.map(fid => [categoryId, fid]);
      await connection.query('INSERT INTO category_format (category_id, document_format_id) VALUES ?', [values]);
    }
  },

  countProducts: async (categoryId) => {
    const [rows] = await pool.query('SELECT COUNT(*) as cnt FROM products WHERE category_id = ? AND deleted_at IS NULL', [categoryId]);
    return rows[0].cnt;
  },

  countBuyers: async (categoryId) => {
    const [rows] = await pool.query('SELECT COUNT(*) as cnt FROM buyer_category WHERE category_id = ?', [categoryId]);
    return rows[0].cnt;
  },

  countSuppliers: async (categoryId) => {
    const [rows] = await pool.query('SELECT COUNT(*) as cnt FROM supplier_category WHERE category_id = ?', [categoryId]);
    return rows[0].cnt;
  }
};
