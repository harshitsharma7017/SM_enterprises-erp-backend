import { pool } from '../../config/database.js';

export const SPEC_FIELDS = ['design', 'quality', 'width', 'colour', 'printing', 'specification', 'remarks'];

const SPEC_SELECT = `
  SELECT s.*, p.name AS product_name, p.item_group_code, u.code AS uom_code,
         uc.name AS creator_name, uu.name AS updater_name
  FROM brand_product_specs s
  JOIN products p ON p.id = s.product_id
  LEFT JOIN uoms u ON u.id = p.uom_id
  LEFT JOIN users uc ON uc.id = s.created_by
  LEFT JOIN users uu ON uu.id = s.updated_by
`;

/** "Design: X · Width: 32 mm · Printing: logo" — the one-line form shown beside an item. */
export const specSummary = (spec) => {
  if (!spec) return null;
  const parts = [
    spec.design && `Design: ${spec.design}`,
    spec.quality && `Quality: ${spec.quality}`,
    spec.width && `Width: ${spec.width}`,
    spec.colour && `Colour: ${spec.colour}`,
    spec.printing && `Printing: ${spec.printing}`,
    spec.specification && `Spec: ${spec.specification.replace(/\s+/g, ' ').trim()}`,
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : null;
};

export const brandSpecRepository = {
  findByBrand: async (brandId) => {
    const [rows] = await pool.query(`${SPEC_SELECT} WHERE s.brand_id = ? ORDER BY p.name`, [brandId]);
    return rows;
  },

  findById: async (brandId, id) => {
    const [rows] = await pool.query(`${SPEC_SELECT} WHERE s.brand_id = ? AND s.id = ?`, [brandId, id]);
    return rows[0] || null;
  },

  existsFor: async (brandId, productId, ignoreId = null) => {
    const [rows] = await pool.query(
      'SELECT id FROM brand_product_specs WHERE brand_id = ? AND product_id = ? AND id <> ?',
      [brandId, productId, ignoreId || 0]
    );
    return rows.length > 0;
  },

  create: async (data) => {
    const [result] = await pool.query(
      `INSERT INTO brand_product_specs (brand_id, product_id, ${SPEC_FIELDS.join(', ')}, status, created_by, updated_by, created_at, updated_at)
       VALUES (?, ?, ${SPEC_FIELDS.map(() => '?').join(', ')}, ?, ?, ?, NOW(), NOW())`,
      [data.brand_id, data.product_id, ...SPEC_FIELDS.map((f) => data[f]), data.status, data.created_by, data.updated_by]
    );
    return result.insertId;
  },

  update: async (id, data) => {
    await pool.query(
      `UPDATE brand_product_specs SET product_id = ?, ${SPEC_FIELDS.map((f) => `${f} = ?`).join(', ')}, status = ?, updated_by = ?, updated_at = NOW() WHERE id = ?`,
      [data.product_id, ...SPEC_FIELDS.map((f) => data[f]), data.status, data.updated_by, id]
    );
  },

  delete: async (id) => {
    await pool.query('DELETE FROM brand_product_specs WHERE id = ?', [id]);
  },

  /**
   * Adds `brand_spec` ({ ...fields, summary } or null) to each line, given a
   * function returning the line's brand id. Lines without a brand or product,
   * or with no active spec, get null.
   */
  attach: async (lines, brandOf) => {
    const pairs = (lines || []).map((l) => [brandOf(l), l.product_id]).filter(([b, p]) => b && p);
    if (pairs.length === 0) return (lines || []).map((l) => ({ ...l, brand_spec: null }));
    const [rows] = await pool.query(
      `SELECT * FROM brand_product_specs WHERE status = 'active' AND (brand_id, product_id) IN (${pairs.map(() => '(?, ?)').join(', ')})`,
      pairs.flat()
    );
    const byPair = Object.fromEntries(rows.map((r) => [`${r.brand_id}-${r.product_id}`, { ...r, summary: specSummary(r) }]));
    return lines.map((l) => ({ ...l, brand_spec: byPair[`${brandOf(l)}-${l.product_id}`] || null }));
  },
};
