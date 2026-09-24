/**
 * Excel import flow — Upload → Parse → Validate / Preview → Confirm:
 *   preview  : parses and validates every row; writes NOTHING.
 *   confirm  : re-parses the same file, then in ONE transaction re-validates
 *              every row (data may have changed since the preview) and
 *              creates the records through the modules' own services.
 *              Any invalid row, or any failure while creating, rolls the
 *              whole import back: all rows or none.
 * Create-only: a row that clashes with an existing record (or with an
 * earlier row of the file) is an error — never an update, never skipped.
 */
import { pool } from '../../config/database.js';
import { readFirstSheet, XlsxReadError } from '../../utils/xlsx-reader.js';
import { writeSimpleXlsx } from '../../utils/xlsx-writer.js';
import { companyScope } from '../../services/company-scope.service.js';
import { fieldFor, blank, text } from './import-definitions.js';

export const MAX_IMPORT_ROWS = 1000;
const rejected = (message, extra = {}) => ({ status: 422, message, ...extra });
const headerName = (h) => text(h).replace(/\s*\*$/, '').toLowerCase();

/** The file's rows as { rowNumber, row: { Header: value } }, after checking the header row against the template. */
export const parseFile = (def, buffer) => {
  let sheet;
  try {
    sheet = readFirstSheet(buffer, { maxRows: MAX_IMPORT_ROWS });
  } catch (error) {
    if (error instanceof XlsxReadError) throw rejected(error.message);
    throw error;
  }
  if (sheet.length === 0) throw rejected('The first sheet is empty. Use the template: one header row, then one row per record.');
  const byName = Object.fromEntries(def.columns.map((c) => [c.header.toLowerCase(), c.header]));
  const headers = sheet[0].map((h) => (blank(h) ? null : headerName(h)));
  const problems = [];
  const seen = new Set();
  headers.forEach((h) => {
    if (h === null) return;
    if (!byName[h]) problems.push(`Unknown column "${h}"`);
    else if (seen.has(h)) problems.push(`Column "${byName[h]}" appears twice`);
    seen.add(h);
  });
  for (const c of def.columns.filter((col) => col.required)) {
    if (!seen.has(c.header.toLowerCase())) problems.push(`Missing column "${c.header}"`);
  }
  if (problems.length) throw rejected(`The header row does not match the ${def.title} template: ${problems.join('; ')}.`);

  const rows = [];
  for (let i = 1; i < sheet.length; i++) {
    const cells = sheet[i] || [];
    if (cells.every((c) => blank(c))) continue;
    const row = Object.fromEntries(def.columns.map((c) => [c.header, null]));
    headers.forEach((h, col) => { if (h !== null) row[byName[h]] = cells[col] ?? null; });
    rows.push({ rowNumber: i + 1, row });
  }
  if (rows.length === 0) throw rejected('The file has a header row but no data rows.');
  return rows;
};

const toErrors = (messages, rules) => messages.map((m) => ({ field: fieldFor(m, rules), message: m }));

/** Validates every row; returns per-row results and, for valid files, what to create. */
export const validateRows = async (def, parsed, companyId) => {
  const results = new Map(parsed.map((p) => [p.rowNumber, { row_number: p.rowNumber, values: p.row, errors: [] }]));
  const addError = (rowNumber, error) => results.get(rowNumber).errors.push(error);
  const toCreate = [];

  if (!def.grouped) {
    const firstSeen = def.keys.map(() => new Map());
    for (const { rowNumber, row } of parsed) {
      const resolved = def.resolve ? await def.resolve(row, companyId) : { ids: {}, errors: [] };
      resolved.errors.forEach((e) => addError(rowNumber, e));
      const body = def.toBody(row, companyId, resolved.ids);
      const { errors } = await def.validate(body);
      toErrors(errors, def.fieldRules).forEach((e) => addError(rowNumber, e));
      def.keys.forEach(([field, keyOf], k) => {
        const key = keyOf(body);
        if (!key) return;
        if (firstSeen[k].has(key)) addError(rowNumber, { field, message: `Duplicate of row ${firstSeen[k].get(key)} in this file` });
        else firstSeen[k].set(key, rowNumber);
      });
      toCreate.push({ rowNumbers: [rowNumber], body });
    }
  } else {
    const groups = new Map();
    for (const p of parsed) {
      const key = def.groupKey(p.row);
      if (!key) {
        addError(p.rowNumber, { field: 'Projection Ref', message: 'Projection Ref is required' });
        continue;
      }
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(p);
    }
    for (const rows of groups.values()) {
      const first = rows[0];
      for (const p of rows.slice(1)) {
        for (const field of def.headerFields) {
          if (text(p.row[field]) !== text(first.row[field])) addError(p.rowNumber, { field, message: `Differs from row ${first.rowNumber} of the same projection` });
        }
      }
      const resolved = await def.resolveGroup(rows, companyId);
      resolved.errors.forEach(({ rowNumber, ...e }) => addError(rowNumber, e));
      const body = def.toGroupBody(rows, companyId, resolved);
      const { errors, items } = await def.validateGroup(body);
      for (const message of errors) {
        const line = message.match(/^Line (\d+): /);
        const target = line ? rows[Number(line[1]) - 1] : first;
        addError((target || first).rowNumber, { field: fieldFor(message, def.fieldRules), message });
      }
      toCreate.push({ rowNumbers: rows.map((r) => r.rowNumber), body, items });
    }
  }

  const rows = [...results.values()].map((r) => ({ ...r, valid: r.errors.length === 0 }));
  const invalid = rows.filter((r) => !r.valid).length;
  return {
    rows,
    summary: { rows: rows.length, valid: rows.length - invalid, invalid, records: toCreate.length },
    toCreate: invalid ? [] : toCreate,
  };
};

const companyFor = async (companyId) => {
  if (blank(companyId) || !/^[1-9]\d*$/.test(String(companyId))) throw rejected('Select the company to import into.');
  return companyScope.assertActiveCompany(Number(companyId));
};

export const importService = {
  template: (def) => writeSimpleXlsx({
    sheetName: def.title.slice(0, 31),
    rows: [def.columns.map((c) => `${c.header}${c.required ? ' *' : ''}`)],
  }),

  /** Validation only — nothing is written. */
  preview: async (def, buffer, companyId) => {
    const company = await companyFor(companyId);
    const parsed = parseFile(def, buffer);
    const { rows, summary } = await validateRows(def, parsed, company);
    return { rows, summary, can_import: summary.invalid === 0 };
  },

  /** All-or-nothing: re-validates every row inside the transaction, then creates them all, or none. */
  confirm: async (def, buffer, companyId, userId) => {
    const company = await companyFor(companyId);
    const parsed = parseFile(def, buffer);
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const { rows, summary, toCreate } = await validateRows(def, parsed, company);
      if (summary.invalid > 0) {
        await connection.rollback();
        throw rejected(`${summary.invalid} row(s) are invalid, so nothing was imported.`, { rows, summary, created: 0 });
      }
      const created = [];
      for (const record of toCreate) {
        try {
          created.push(def.grouped
            ? await def.createGroup(record.body, record.items, userId, connection)
            : await def.create(record.body, userId, connection));
        } catch (error) {
          await connection.rollback();
          const reason = error && error.code === 'ER_DUP_ENTRY' ? 'already exists (created since the preview)' : (error.status ? error.message : 'could not be created');
          if (!error.status && error.code !== 'ER_DUP_ENTRY') console.error('Import create failed:', error.message);
          throw rejected(`Row ${record.rowNumbers.join(', ')} ${reason}, so nothing was imported.`, { summary, created: 0, failed_rows: record.rowNumbers });
        }
      }
      await connection.commit();
      return { summary, created: created.length, ids: created };
    } catch (error) {
      await connection.rollback().catch(() => {});
      throw error;
    } finally {
      connection.release();
    }
  },
};
