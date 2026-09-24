/**
 * Runs a report definition: company scope + filters → one SQL query, used
 * for the paginated JSON view and, unchanged, for the Excel export.
 */
import { pool } from '../../config/database.js';
import { writeSimpleXlsx } from '../../utils/xlsx-writer.js';

export const MAX_EXPORT_ROWS = 50000;
const MAX_PAGE_SIZE = 200;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const ID_RE = /^[1-9]\d*$/;

const rejected = (message) => ({ status: 422, message });
const blank = (v) => v === undefined || v === null || String(v).trim() === '';

/**
 * The company a report is run for — always explicit and always applied on
 * the server: 'all' (every company, each row carries its company), a
 * company id, or 'unassigned' (legacy rows with no company).
 */
export const parseCompany = async (value) => {
  if (blank(value)) throw rejected('Select a company (or "all").');
  const v = String(value).trim();
  if (v === 'all') return { all: true };
  if (v === 'unassigned') return { unassigned: true };
  if (!ID_RE.test(v)) throw rejected('Invalid company.');
  const [[row]] = await pool.query('SELECT id FROM companies WHERE id = ? AND deleted_at IS NULL', [Number(v)]);
  if (!row) throw rejected('Company not found.');
  return { id: row.id };
};

export const companyCondition = (column, scope) => {
  if (scope.all) return { sql: '', params: [] };
  if (scope.unassigned) return { sql: ` AND ${column} IS NULL`, params: [] };
  return { sql: ` AND ${column} = ?`, params: [scope.id] };
};

/** SQL + params for a definition and the request's filters (invalid filter values are refused, not ignored). */
export const buildQuery = async (def, query) => {
  const scope = await parseCompany(query.company_id);
  const company = companyCondition(def.company, scope);
  let sql = `${def.base}${company.sql}`;
  const params = [...company.params];

  if (def.date) {
    for (const [name, op] of [['date_from', '>='], ['date_to', '<=']]) {
      if (blank(query[name])) continue;
      if (!DATE_RE.test(String(query[name]))) throw rejected(`${name} must be a date (YYYY-MM-DD).`);
      // A datetime column includes the whole "to" day.
      if (def.date.type === 'datetime' && op === '<=') {
        sql += ` AND ${def.date.column} < DATE_ADD(?, INTERVAL 1 DAY)`;
      } else {
        sql += ` AND ${def.date.column} ${op} ?`;
      }
      params.push(String(query[name]));
    }
  }
  for (const filter of def.filters) {
    const value = query[filter.name];
    if (blank(value)) continue;
    const v = String(value).trim();
    if (filter.kind === 'id') {
      if (!ID_RE.test(v)) throw rejected(`Invalid ${filter.label.toLowerCase()}.`);
      sql += ` AND ${filter.column} = ?`;
      params.push(Number(v));
    } else if (filter.kind === 'enum') {
      if (!filter.values.includes(v)) throw rejected(`Invalid ${filter.label.toLowerCase()}.`);
      sql += ` AND ${filter.column} = ?`;
      params.push(v);
    } else if (filter.kind === 'like') {
      sql += ` AND ${filter.column} LIKE ?`;
      params.push(`%${v}%`);
    }
  }
  if (!blank(query.search) && def.search?.length) {
    sql += ` AND (${def.search.map((c) => `${c} LIKE ?`).join(' OR ')})`;
    params.push(...def.search.map(() => `%${String(query.search).trim()}%`));
  }
  return { sql, params, orderBy: def.orderBy };
};

const mapRows = (def, rows) => (def.mapRow ? rows.map(def.mapRow) : rows);

/** One page of the report (JSON view). */
export const runPage = async (def, query) => {
  const { sql, params, orderBy } = await buildQuery(def, query);
  const page = parseInt(query.page, 10) > 0 ? parseInt(query.page, 10) : 1;
  const limit = parseInt(query.limit, 10) > 0 ? Math.min(parseInt(query.limit, 10), MAX_PAGE_SIZE) : 25;
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM (${sql}) AS sub`, params);
  const [rows] = await pool.query(`${sql} ORDER BY ${orderBy} LIMIT ? OFFSET ?`, [...params, limit, (page - 1) * limit]);
  return { rows: mapRows(def, rows), total, page, limit };
};

/** Every row of the report as an .xlsx (same query + filters); refuses more than MAX_EXPORT_ROWS. */
export const runExport = async (def, query, maxRows = MAX_EXPORT_ROWS) => {
  const { sql, params, orderBy } = await buildQuery(def, query);
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM (${sql}) AS sub`, params);
  if (total > maxRows) {
    throw rejected(`This export has ${total} rows, more than the ${maxRows} allowed. Narrow the filters (e.g. company or date range) and export again.`);
  }
  const [rows] = await pool.query(`${sql} ORDER BY ${orderBy}`, params);
  const header = def.columns.map((c) => c.label);
  const body = mapRows(def, rows).map((row) => def.columns.map((c) => ({ type: c.type, value: row[c.key] ?? null })));
  return { buffer: writeSimpleXlsx({ sheetName: def.title.slice(0, 31).replace(/[\\/?*[\]:]/g, ' '), rows: [header, ...body] }), total };
};

/** Column / filter metadata for the frontend (no SQL). */
export const describe = (def) => ({
  key: def.key,
  title: def.title,
  columns: def.columns,
  date: def.date ? { label: def.date.label || 'Date', type: def.date.type } : null,
  search: Boolean(def.search?.length),
  filters: def.filters.map(({ name, label, kind, values, options }) => ({ name, label, kind, values: values || null, options: options || null })),
});
