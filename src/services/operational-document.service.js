/**
 * Operational documents — PO, GRN, QC inspection, supplier return (return
 * challan), debit note, material issue slip and processing record — rendered
 * on request from the stored record with the existing dependency-free PDF
 * writer. Same principle as the commercial documents: nothing is written to
 * disk, and the layout carries only transaction data already in the ERP.
 * Tax, statutory and bank sections are not calculated; the formats are
 * neutral until the client approves their own.
 *
 * Courier (monospaced) keeps the space-padded columns aligned.
 */
import { pool } from '../config/database.js';
import { writeSimplePdf } from '../utils/pdf-writer.js';

const WIDTH = 100;
const HALF = 50;

const text = (value) => (value === null || value === undefined ? '' : String(value));
const cell = (value, width, alignRight = false) => {
  const s = text(value);
  const cut = s.length > width ? `${s.slice(0, width - 1)}~` : s;
  return alignRight ? cut.padStart(width) : cut.padEnd(width);
};
/** The PDF font covers Latin-1 only; map common typographic characters instead of printing "?". */
const plain = (line) => String(line)
  .replace(/[\u2012-\u2015]/g, '-')
  .replace(/[\u2018\u2019]/g, "'")
  .replace(/[\u201C\u201D]/g, '"')
  .replace(/\u2026/g, '...')
  .replace(/\u20B9/g, 'Rs.')
  .replace(/\u00D7/g, 'x');
const has = (value) => value !== null && value !== undefined && String(value).trim() !== '';

/** A quantity at its UOM precision ("1900.50"); blank stays blank. */
export const qty = (value, decimals) => (has(value) ? Number(value).toFixed(Number(decimals) || 0) : '');
export const money = (value) => (has(value) ? Number(value).toFixed(2) : '-');
export const day = (value) => (value ? String(value instanceof Date ? value.toISOString() : value).slice(0, 10) : '-');

/** Wraps long text to the page width. */
const wrap = (value, width = WIDTH) => {
  const out = [];
  String(value).split(/\r?\n/).forEach((para) => {
    let line = '';
    para.split(/\s+/).forEach((word) => {
      if (!word) return;
      if ((line ? `${line} ${word}` : word).length > width) {
        if (line) out.push(line);
        line = word.length > width ? word.slice(0, width) : word;
      } else {
        line = line ? `${line} ${word}` : word;
      }
    });
    out.push(line);
  });
  return out;
};

export const operationalDocument = {
  /** The issuing company as held in the Companies master. */
  company: async (companyId) => {
    const [[company]] = await pool.query('SELECT code, name, address, phone, email, gstin FROM companies WHERE id = ?', [companyId]);
    return company || {};
  },

  /** A supplier's name, code, address and tax numbers as held in the master. */
  supplier: async (supplierId) => {
    if (!supplierId) return null;
    const [[row]] = await pool.query(
      'SELECT display_code, company_name, name_on_bill, address, pincode, gst_number, pan_number FROM suppliers WHERE id = ?',
      [supplierId]
    );
    if (!row) return null;
    return {
      name: row.name_on_bill || row.company_name,
      code: row.display_code,
      address: [row.address, row.pincode].filter(has).join(' - '),
      tax: [row.gst_number && `GSTIN: ${row.gst_number}`, row.pan_number && `PAN: ${row.pan_number}`].filter(Boolean).join('   '),
    };
  },

  /** "GT/PO/005/2026-27" → "GT-PO-005-2026-27.pdf". */
  filename: (number) => `${String(number).replace(/[/\\]/g, '-')}.pdf`,

  /**
   * @param {object} doc
   * @param {string} doc.title - e.g. "PURCHASE ORDER"
   * @param {string} doc.number
   * @param {string|null} doc.mark - e.g. "DRAFT - NOT POSTED" / "CANCELLED"
   * @param {object} doc.company - from company()
   * @param {{label: string, name: string, code?: string, address?: string, tax?: string}|null} doc.party
   * @param {Array<[string, any]>} doc.fields - header facts, printed in two columns
   * @param {Array<{label: string, width: number, right?: boolean}>} doc.columns
   * @param {Array<{cells: any[], detail?: string}>} doc.rows
   * @param {Array<[string, any]>} doc.summary - totals / quantities after the lines
   * @param {Array<[string, any]>} doc.footer - remarks, references
   * @param {string[]} doc.notes - fixed explanatory lines
   * @param {string[]} doc.signatures - signature captions
   */
  render: ({ title, number, mark = null, company, party = null, fields = [], columns = [], rows = [], summary = [], footer = [], notes = [], signatures = [] }) => {
    const out = [];
    out.push(text(company.name));
    String(company.address || '').split(/\r?\n/).filter(has).forEach((l) => out.push(l));
    const contact = [company.phone && `Phone: ${company.phone}`, company.email && `Email: ${company.email}`, company.gstin && `GSTIN: ${company.gstin}`].filter(Boolean).join('   ');
    if (contact) out.push(contact);
    out.push('='.repeat(WIDTH));
    out.push(`${title}   ${number}${mark ? `   [${mark}]` : ''}`);
    out.push('');

    if (party) {
      out.push(`${party.label}: ${text(party.name)}${party.code ? ` (${party.code})` : ''}`);
      if (has(party.address)) wrap(party.address, WIDTH - 10).forEach((l) => out.push(`          ${l}`));
      if (has(party.tax)) out.push(`          ${party.tax}`);
    }

    const facts = fields.filter(([, v]) => has(v)).map(([label, value]) => `${label}: ${value}`);
    for (let i = 0; i < facts.length; i += 2) {
      out.push(`${cell(facts[i], HALF)}${facts[i + 1] ? cell(facts[i + 1], HALF) : ''}`.trimEnd());
    }

    if (columns.length > 0) {
      out.push('-'.repeat(WIDTH));
      out.push(columns.map((c) => cell(c.label, c.width, c.right)).join(' ').trimEnd());
      out.push('-'.repeat(WIDTH));
      if (rows.length === 0) out.push('(no lines)');
      rows.forEach((row) => {
        out.push(columns.map((c, i) => cell(row.cells[i], c.width, c.right)).join(' ').trimEnd());
        if (has(row.detail)) wrap(row.detail, WIDTH - 6).forEach((l) => out.push(`      ${l}`));
      });
      out.push('-'.repeat(WIDTH));
    }

    summary.filter(([, v]) => has(v)).forEach(([label, value]) => out.push(`${label}: ${value}`));
    const extra = footer.filter(([, v]) => has(v));
    if (extra.length) out.push('');
    extra.forEach(([label, value]) => wrap(`${label}: ${value}`).forEach((l) => out.push(l)));
    if (notes.length) out.push('');
    notes.forEach((n) => wrap(n).forEach((l) => out.push(l)));

    if (signatures.length) {
      const width = Math.floor(WIDTH / signatures.length);
      out.push('', '', '');
      out.push(signatures.map(() => cell('______________________', width)).join('').trimEnd());
      out.push(signatures.map((s) => cell(s, width)).join('').trimEnd());
    }

    out.push('');
    out.push(`Generated ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC from ERP record ${number}.`);
    return writeSimplePdf({ lines: out.map(plain), font: 'Courier', fontSize: 8.5, lineHeight: 12 });
  },
};
