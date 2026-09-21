import { pool } from '../../config/database.js';

export const orderFormatRepository = {
  findAll: async ({ search, status, sort, direction, offset = 0, limit = 10 }) => {
    let query = `
      SELECT 
        df.id, df.name, df.module, df.blade_view, df.status, 
        df.created_at, df.updated_at,
        (SELECT COUNT(*) FROM category_format cf WHERE cf.document_format_id = df.id) as categories_count,
        (SELECT COUNT(*) FROM document_format_units dfu WHERE dfu.document_format_id = df.id) as units_count,
        (SELECT COUNT(*) FROM document_format_images dfi WHERE dfi.document_format_id = df.id) as images_count
      FROM document_formats df
      WHERE 1=1
    `;

    const params = [];

    if (search) {
      query += ` AND df.name LIKE ? `;
      params.push(`%${search}%`);
    }

    if (status === 'active' || status === 'inactive') {
      query += ` AND df.status = ? `;
      params.push(status);
    }

    // Whitelisted sort columns. An unrecognized/absent `sort` falls back to
    // newest-first (id DESC), matching Filterable::scopeSort()'s latest('id').
    const allowedSortFields = {
      'id': 'df.id',
      'name': 'df.name',
      'status': 'df.status',
      'created_at': 'df.created_at'
    };

    const sortColumn = allowedSortFields[sort];
    const sortField = sortColumn || 'df.id';
    const sortDirection = sortColumn
      ? (String(direction).toUpperCase() === 'DESC' ? 'DESC' : 'ASC')
      : 'DESC';

    query += ` ORDER BY ${sortField} ${sortDirection} `;
    
    // Count total before limit
    const [countRows] = await pool.query(`SELECT COUNT(*) as total FROM (${query}) as t`, params);
    const total = countRows[0].total;

    query += ` LIMIT ? OFFSET ? `;
    params.push(Number(limit), Number(offset));

    const [rows] = await pool.query(query, params);

    return {
      data: rows,
      total,
      limit: Number(limit),
      offset: Number(offset)
    };
  },

  findById: async (id) => {
    const [rows] = await pool.query(
      'SELECT * FROM document_formats WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  },

  findByIdIncludingRequiredRelations: async (id) => {
    const format = await orderFormatRepository.findById(id);
    if (!format) return null;

    const [units] = await pool.query(
      'SELECT id, name FROM document_format_units WHERE document_format_id = ? ORDER BY sort_order ASC',
      [id]
    );

    const [columns] = await pool.query(
      'SELECT id, `key`, label, is_enabled, is_custom, print_only, sort_order ' +
      'FROM document_format_columns ' +
      'WHERE document_format_id = ? ORDER BY sort_order ASC',
      [id]
    );

    const [images] = await pool.query(
      'SELECT id, path, original_name, sort_order FROM document_format_images WHERE document_format_id = ? ORDER BY sort_order ASC',
      [id]
    );

    const [categories] = await pool.query(
      `SELECT c.id, c.name FROM categories c 
       JOIN category_format cf ON c.id = cf.category_id 
       WHERE cf.document_format_id = ? AND c.deleted_at IS NULL`,
      [id]
    );

    return {
      ...format,
      units,
      columns,
      images,
      categories
    };
  },

  nameExists: async (name, ignoreId = null) => {
    let query = 'SELECT id FROM document_formats WHERE name = ?';
    const params = [name];

    if (ignoreId) {
      query += ' AND id != ?';
      params.push(ignoreId);
    }

    const [rows] = await pool.query(query, params);
    return rows.length > 0;
  },

  create: async (connection, data) => {
    const [result] = await connection.query(
      `INSERT INTO document_formats (
        name, status, created_at, updated_at
      ) VALUES (?, ?, NOW(), NOW())`,
      [
        data.name, 
        data.status
      ]
    );
    return result.insertId;
  },

  update: async (connection, id, data) => {
    await connection.query(
      `UPDATE document_formats SET 
        name = ?, status = ?, updated_at = NOW()
      WHERE id = ?`,
      [
        data.name,
        data.status,
        id
      ]
    );
  },

  softDelete: async (connection, id) => {
    await connection.query('DELETE FROM document_formats WHERE id = ?', [id]);
  },

  toggleStatus: async (id, newStatus, userId) => {
    await pool.query(
      'UPDATE document_formats SET status = ?, updated_at = NOW() WHERE id = ?',
      [newStatus, id]
    );
  },

  countCategories: async (id) => {
    const [rows] = await pool.query(
      'SELECT COUNT(*) as count FROM category_format WHERE document_format_id = ?',
      [id]
    );
    return rows[0].count;
  },

  deleteUnits: async (connection, documentFormatId) => {
    await connection.query('DELETE FROM document_format_units WHERE document_format_id = ?', [documentFormatId]);
  },

  insertUnit: async (connection, documentFormatId, name, sortOrder) => {
    await connection.query(
      'INSERT INTO document_format_units (document_format_id, name, sort_order) VALUES (?, ?, ?)',
      [documentFormatId, name, sortOrder]
    );
  },

  deleteColumns: async (connection, documentFormatId) => {
    await connection.query('DELETE FROM document_format_columns WHERE document_format_id = ?', [documentFormatId]);
  },

  insertColumn: async (connection, documentFormatId, colData) => {
    await connection.query(
      'INSERT INTO document_format_columns (' +
      '  document_format_id, `key`, label, is_enabled, is_custom, print_only, sort_order' +
      ') VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        documentFormatId,
        colData.key,
        colData.label,
        colData.is_enabled ? 1 : 0,
        colData.is_custom ? 1 : 0,
        colData.print_only ? 1 : 0,
        colData.sort_order
      ]
    );
  },

  getImages: async (connection, documentFormatId) => {
    const [rows] = await connection.query(
      'SELECT id, path, original_name, sort_order FROM document_format_images WHERE document_format_id = ?',
      [documentFormatId]
    );
    return rows;
  },

  deleteImageRows: async (connection, documentFormatId, excludeIds = []) => {
    let query = 'DELETE FROM document_format_images WHERE document_format_id = ?';
    const params = [documentFormatId];

    if (excludeIds.length > 0) {
      query += ` AND id NOT IN (?)`;
      params.push(excludeIds);
    }
    
    await connection.query(query, params);
  },

  insertImage: async (connection, documentFormatId, path, originalName, sortOrder) => {
    await connection.query(
      `INSERT INTO document_format_images (
        document_format_id, path, original_name, sort_order, created_at, updated_at
      ) VALUES (?, ?, ?, ?, NOW(), NOW())`,
      [documentFormatId, path, originalName, sortOrder]
    );
  },

  getMaxImageSortOrder: async (connection, documentFormatId) => {
    const [rows] = await connection.query(
      'SELECT MAX(sort_order) as max_order FROM document_format_images WHERE document_format_id = ?',
      [documentFormatId]
    );
    return rows[0].max_order || 0;
  }
};
