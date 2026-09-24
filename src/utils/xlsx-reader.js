/**
 * Minimal, dependency-free XLSX reader — the counterpart of xlsx-writer.js,
 * for Excel imports. Deliberately narrow: the FIRST worksheet only; text
 * (shared / inline / formula-string), numeric and boolean cells; numbers in
 * a date format become "YYYY-MM-DD" (or "YYYY-MM-DD HH:MM:SS"). Formulas are
 * read as their cached value. Anything else (encrypted, .xls, .xlsb, ZIP64,
 * missing parts) is refused with XlsxReadError rather than guessed at.
 */
import zlib from 'zlib';

export class XlsxReadError extends Error {
  constructor(message) {
    super(message);
    this.status = 422;
  }
}

const MAX_UNCOMPRESSED = 50 * 1024 * 1024;

/** name → Buffer for every entry of a (non-ZIP64) ZIP archive, via its central directory. */
const unzip = (buffer) => {
  if (!Buffer.isBuffer(buffer) || buffer.length < 22 || buffer.readUInt32LE(0) !== 0x04034b50) {
    throw new XlsxReadError('The file is not an Excel .xlsx workbook.');
  }
  let eocd = -1;
  for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 22 - 65535); i--) {
    if (buffer.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new XlsxReadError('The workbook is damaged (no ZIP directory).');
  const count = buffer.readUInt16LE(eocd + 10);
  let offset = buffer.readUInt32LE(eocd + 16);
  const entries = new Map();
  let total = 0;
  for (let n = 0; n < count; n++) {
    if (offset + 46 > buffer.length || buffer.readUInt32LE(offset) !== 0x02014b50) throw new XlsxReadError('The workbook is damaged (bad ZIP entry).');
    const flags = buffer.readUInt16LE(offset + 8);
    const method = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const size = buffer.readUInt32LE(offset + 24);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localOffset = buffer.readUInt32LE(offset + 42);
    const name = buffer.toString('utf8', offset + 46, offset + 46 + nameLength);
    offset += 46 + nameLength + extraLength + commentLength;
    if (flags & 0x1) throw new XlsxReadError('Encrypted / password-protected workbooks are not supported.');
    if (compressedSize === 0xFFFFFFFF || size === 0xFFFFFFFF) throw new XlsxReadError('The workbook is too large (ZIP64 is not supported).');
    total += size;
    if (total > MAX_UNCOMPRESSED) throw new XlsxReadError('The workbook is too large.');
    if (buffer.readUInt32LE(localOffset) !== 0x04034b50) throw new XlsxReadError('The workbook is damaged (bad local header).');
    const dataStart = localOffset + 30 + buffer.readUInt16LE(localOffset + 26) + buffer.readUInt16LE(localOffset + 28);
    const raw = buffer.subarray(dataStart, dataStart + compressedSize);
    let data;
    try {
      if (method === 0) data = raw;
      else if (method === 8) data = zlib.inflateRawSync(raw);
      else throw new XlsxReadError(`Unsupported compression in the workbook (${method}).`);
    } catch (error) {
      if (error instanceof XlsxReadError) throw error;
      throw new XlsxReadError('The workbook is damaged (cannot decompress).');
    }
    entries.set(name, data);
  }
  return entries;
};

const decode = (text) => text
  .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
  .replace(/&amp;/g, '&');

const attr = (tag, name) => {
  const m = tag.match(new RegExp(`\\s${name}="([^"]*)"`));
  return m ? decode(m[1]) : null;
};

/** Concatenated <t> text of a shared-string item or inline string (rich-text runs included; phonetic runs skipped). */
const textOf = (xml) => {
  const withoutPhonetic = xml.replace(/<rPh[\s\S]*?<\/rPh>/g, '');
  let out = '';
  for (const m of withoutPhonetic.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>|<t(?:\s[^>]*)?\/>/g)) out += m[1] ? decode(m[1]) : '';
  return out;
};

const part = (entries, name) => entries.get(name) || entries.get(name.replace(/^\//, ''));

/** Path of the first worksheet, from workbook.xml + its relationships (falls back to sheet1.xml). */
const firstSheetPath = (entries) => {
  const workbook = part(entries, 'xl/workbook.xml');
  if (!workbook) throw new XlsxReadError('The file is not an Excel workbook (no xl/workbook.xml).');
  const sheet = workbook.toString('utf8').match(/<sheet\s[^>]*>/);
  const rels = part(entries, 'xl/_rels/workbook.xml.rels');
  if (sheet && rels) {
    const rid = attr(sheet[0], 'r:id');
    for (const rel of rels.toString('utf8').matchAll(/<Relationship\s[^>]*>/g)) {
      if (attr(rel[0], 'Id') === rid) {
        const target = attr(rel[0], 'Target');
        return target.startsWith('/') ? target.slice(1) : `xl/${target.replace(/^\.\//, '')}`;
      }
    }
  }
  return 'xl/worksheets/sheet1.xml';
};

const BUILTIN_DATE_FORMATS = new Set([14, 15, 16, 17, 18, 19, 20, 21, 22, 27, 30, 36, 45, 46, 47, 50, 57]);

/** Style index → 'date' | 'datetime' | null, from styles.xml number formats. */
const dateStyles = (entries) => {
  const styles = part(entries, 'xl/styles.xml');
  if (!styles) return [];
  const xml = styles.toString('utf8');
  const custom = {};
  for (const m of xml.matchAll(/<numFmt\s[^>]*>/g)) custom[Number(attr(m[0], 'numFmtId'))] = attr(m[0], 'formatCode') || '';
  const cellXfs = xml.match(/<cellXfs[^>]*>([\s\S]*?)<\/cellXfs>/);
  if (!cellXfs) return [];
  return [...cellXfs[1].matchAll(/<xf\s[^>]*?\/?>/g)].map((m) => {
    const id = Number(attr(m[0], 'numFmtId') || 0);
    const code = (custom[id] || '').replace(/"[^"]*"|\[[^\]]*\]|\\./g, '').toLowerCase();
    const isDate = BUILTIN_DATE_FORMATS.has(id) || /[dy]/.test(code) || (/m/.test(code) && /[dy]/.test(code));
    if (!isDate) return null;
    return /h|s/.test(code) || [22, 45, 46, 47].includes(id) ? 'datetime' : 'date';
  });
};

/** Excel serial → "YYYY-MM-DD" / "YYYY-MM-DD HH:MM:SS" (1900 date system). */
export const serialToDate = (serial, withTime = false) => {
  const n = Number(serial);
  if (!Number.isFinite(n)) return null;
  const ms = Math.round(n * 86400000);
  const d = new Date(Date.UTC(1899, 11, 30) + ms);
  const pad = (v) => String(v).padStart(2, '0');
  const date = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  return withTime ? `${date} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}` : date;
};

const columnIndex = (ref) => {
  const letters = String(ref).match(/^[A-Z]+/);
  if (!letters) return null;
  let n = 0;
  for (const ch of letters[0]) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
};

/**
 * @param {Buffer} buffer - the uploaded .xlsx file
 * @param {{ maxRows?: number }} options
 * @returns {Array<Array<string|number|boolean|null>>} rows of the first sheet (1st = header row),
 *   trailing empty rows removed; numbers stay numbers, date-formatted numbers become date strings.
 */
export function readFirstSheet(buffer, { maxRows = 5000 } = {}) {
  const entries = unzip(buffer);
  const sheetXml = part(entries, firstSheetPath(entries));
  if (!sheetXml) throw new XlsxReadError('The workbook has no worksheet.');
  const shared = [];
  const sst = part(entries, 'xl/sharedStrings.xml');
  if (sst) for (const m of sst.toString('utf8').matchAll(/<si>([\s\S]*?)<\/si>/g)) shared.push(textOf(m[1]));
  const styles = dateStyles(entries);

  const rows = [];
  const xml = sheetXml.toString('utf8');
  let nextRow = 0;
  for (const rowMatch of xml.matchAll(/<row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/row>)/g)) {
    const r = attr(`<row${rowMatch[1]}>`, 'r');
    const rowIndex = r ? Number(r) - 1 : nextRow;
    nextRow = rowIndex + 1;
    if (rowIndex >= maxRows + 1) throw new XlsxReadError(`The sheet has more than ${maxRows} data rows.`);
    const cells = [];
    let nextCol = 0;
    for (const cellMatch of (rowMatch[2] || '').matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const tag = `<c${cellMatch[1]}>`;
      const ref = attr(tag, 'r');
      const col = ref ? columnIndex(ref) : nextCol;
      nextCol = col + 1;
      const body = cellMatch[2] || '';
      const type = attr(tag, 't');
      const v = body.match(/<v>([\s\S]*?)<\/v>/);
      let value = null;
      if (type === 's') value = v ? (shared[Number(v[1])] ?? null) : null;
      else if (type === 'inlineStr') value = textOf(body.match(/<is>([\s\S]*?)<\/is>/)?.[1] || '');
      else if (type === 'str') value = v ? decode(v[1]) : null;
      else if (type === 'b') value = v ? v[1] === '1' : null;
      else if (type === 'e') value = null;
      else if (v) {
        const num = Number(v[1]);
        const style = styles[Number(attr(tag, 's') || 0)];
        value = Number.isFinite(num) ? (style ? serialToDate(num, style === 'datetime') : num) : decode(v[1]);
      }
      cells[col] = value;
    }
    rows[rowIndex] = Array.from({ length: cells.length }, (_, i) => (cells[i] === undefined ? null : cells[i]));
  }
  const dense = Array.from({ length: rows.length }, (_, i) => rows[i] || []);
  while (dense.length && dense[dense.length - 1].every((c) => c === null || c === '')) dense.pop();
  return dense;
}
