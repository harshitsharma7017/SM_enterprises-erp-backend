/**
 * Minimal, dependency-free XLSX writer — no spreadsheet library exists in
 * this project (see package.json). An .xlsx file is a ZIP archive of small
 * XML parts; this builds both the ZIP container (via Node's built-in zlib
 * for DEFLATE, a hand-rolled CRC32, and a standard local/central-directory
 * writer) and the OOXML parts by hand, using inline strings so no
 * sharedStrings.xml bookkeeping is needed. Generic — any module that needs
 * a single-sheet tabular export can reuse it, not just Inquiry.
 */
import zlib from 'zlib';

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c >>> 0;
  }
  return table;
})();

const crc32 = (buf) => {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
};

const dosDateTime = (date = new Date()) => ({
  dosTime: ((date.getHours() & 0x1F) << 11) | ((date.getMinutes() & 0x3F) << 5) | ((date.getSeconds() >> 1) & 0x1F),
  dosDate: (((date.getFullYear() - 1980) & 0x7F) << 9) | (((date.getMonth() + 1) & 0xF) << 5) | (date.getDate() & 0x1F)
});

const buildZip = (files) => {
  const { dosTime, dosDate } = dosDateTime();
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const file of files) {
    const nameBuf = Buffer.from(file.name, 'utf8');
    const dataBuf = file.data;
    const compressed = zlib.deflateRawSync(dataBuf);
    const crc = crc32(dataBuf);

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(8, 8);
    localHeader.writeUInt16LE(dosTime, 10);
    localHeader.writeUInt16LE(dosDate, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(compressed.length, 18);
    localHeader.writeUInt32LE(dataBuf.length, 22);
    localHeader.writeUInt16LE(nameBuf.length, 26);
    localHeader.writeUInt16LE(0, 28);

    localParts.push(localHeader, nameBuf, compressed);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0, 8);
    centralHeader.writeUInt16LE(8, 10);
    centralHeader.writeUInt16LE(dosTime, 12);
    centralHeader.writeUInt16LE(dosDate, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(compressed.length, 20);
    centralHeader.writeUInt32LE(dataBuf.length, 24);
    centralHeader.writeUInt16LE(nameBuf.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);

    centralParts.push(centralHeader, nameBuf);

    offset += localHeader.length + nameBuf.length + compressed.length;
  }

  const centralDirStart = offset;
  const centralDir = Buffer.concat(centralParts);

  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(centralDir.length, 12);
  eocd.writeUInt32LE(centralDirStart, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, centralDir, eocd]);
};

const xmlEscape = (v) => String(v)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;');

export const colName = (index) => {
  let n = index + 1;
  let name = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    name = String.fromCharCode(65 + rem) + name;
    n = Math.floor((n - 1) / 26);
  }
  return name;
};

// Typed cells (reports): { type: 'number' | 'date' | 'datetime', value }. Plain strings / numbers
// keep their original behaviour (Inquiry export).
const DECIMAL_RE = /^-?\d+(\.\d+)?$/;
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/;
// Style indexes in the minimal styles part below (0 = default).
const STYLE_DATE = 1;
const STYLE_DATETIME = 2;

/**
 * A DECIMAL value exactly as the database returned it ("3000.500000"),
 * written as an Excel number without going through a float: only trailing
 * fraction zeros are dropped, nothing is rounded.
 */
const decimalText = (value) => {
  const text = String(value).trim();
  if (!DECIMAL_RE.test(text)) return null;
  return text.includes('.') ? text.replace(/0+$/, '').replace(/\.$/, '') : text;
};

/** "YYYY-MM-DD[ HH:MM[:SS]]" → Excel serial (days since 1899-12-30; no time-zone shift). */
export const excelSerial = (value) => {
  const m = String(value).trim().match(DATE_RE);
  if (!m) return null;
  const [, y, mo, d, h = '0', mi = '0', sec = '0'] = m;
  const days = (Date.UTC(Number(y), Number(mo) - 1, Number(d)) - Date.UTC(1899, 11, 30)) / 86400000;
  if (!Number.isFinite(days)) return null;
  const fraction = (Number(h) * 3600 + Number(mi) * 60 + Number(sec)) / 86400;
  return String(fraction ? Number((days + fraction).toFixed(10)) : days);
};

const inlineString = (ref, value) => `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${xmlEscape(value)}</t></is></c>`;

const typedCell = (ref, cell) => {
  if (cell.value === null || cell.value === undefined || cell.value === '') return '';
  if (cell.type === 'number') {
    const v = typeof cell.value === 'number' && Number.isFinite(cell.value) ? String(cell.value) : decimalText(cell.value);
    return v === null ? inlineString(ref, cell.value) : `<c r="${ref}"><v>${v}</v></c>`;
  }
  if (cell.type === 'date' || cell.type === 'datetime') {
    const v = excelSerial(cell.value);
    return v === null ? inlineString(ref, cell.value) : `<c r="${ref}" s="${cell.type === 'date' ? STYLE_DATE : STYLE_DATETIME}"><v>${v}</v></c>`;
  }
  return inlineString(ref, cell.value);
};

const isTyped = (cell) => cell !== null && typeof cell === 'object' && 'type' in cell;

/**
 * `widths`: column widths in characters (index = column).
 * `validations`: drop-down lists, [{ sqref: 'B2:B1001', list: 'definedName', strict }] — strict
 * rejects anything not in the list; otherwise the list is offered but any text is accepted
 * (used for ";"-separated multi-value cells).
 */
const buildSheetXml = (rows, { widths = [], validations = [] } = {}) => {
  const rowsXml = rows.map((row, rIdx) => {
    const cellsXml = row.map((cell, cIdx) => {
      const ref = `${colName(cIdx)}${rIdx + 1}`;
      if (isTyped(cell)) return typedCell(ref, cell);
      if (cell === null || cell === undefined || cell === '') return '';
      if (typeof cell === 'number' && Number.isFinite(cell)) {
        return `<c r="${ref}"><v>${cell}</v></c>`;
      }
      return inlineString(ref, cell);
    }).join('');
    return `<row r="${rIdx + 1}">${cellsXml}</row>`;
  }).join('');

  const colsXml = widths.length
    ? `<cols>${widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>`
    : '';
  const validationsXml = validations.length
    ? `<dataValidations count="${validations.length}">${validations.map((v) => (
      `<dataValidation type="list" allowBlank="1" showInputMessage="1" showErrorMessage="${v.strict ? 1 : 0}" ` +
      `errorTitle="Not in the list" error="Pick a value from the drop-down list." sqref="${v.sqref}">` +
      `<formula1>${xmlEscape(v.list)}</formula1></dataValidation>`
    )).join('')}</dataValidations>`
    : '';

  // Element order is fixed by the schema: cols, sheetData, then dataValidations.
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
    `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    `${colsXml}<sheetData>${rowsXml}</sheetData>${validationsXml}</worksheet>`;
};

// Only written when a date cell needs it: yyyy-mm-dd and yyyy-mm-dd hh:mm:ss (unambiguous in every locale).
const STYLES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
  `<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
  `<numFmts count="2"><numFmt numFmtId="164" formatCode="yyyy-mm-dd"/><numFmt numFmtId="165" formatCode="yyyy-mm-dd hh:mm:ss"/></numFmts>` +
  `<fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts>` +
  `<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>` +
  `<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>` +
  `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>` +
  `<cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>` +
  `<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>` +
  `<xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs>` +
  `</styleSheet>`;

/**
 * @param {{ sheetName?: string, rows: Array<Array<string|number|null|{type: string, value: any}>>,
 *   widths?: number[], validations?: Array<{ sqref: string, list: string, strict?: boolean }>,
 *   extraSheets?: Array<{ name: string, rows: Array<Array<any>>, hidden?: boolean, widths?: number[] }>,
 *   definedNames?: Array<{ name: string, ref: string }> }} params
 *   Plain strings / numbers are written as before; typed cells ({ type: 'number' | 'date' |
 *   'datetime' | 'text', value }) give exact decimals and real Excel dates. `extraSheets` follow
 *   the main sheet, which stays first (readFirstSheet reads only that one). `definedNames` are
 *   workbook-level named ranges, e.g. { name: 'opt_Status', ref: 'Lists!$A$2:$A$3' }, which a
 *   validation's `list` can refer to.
 * @returns {Buffer}
 */
export function writeSimpleXlsx({ sheetName = 'Sheet1', rows = [], widths = [], validations = [], extraSheets = [], definedNames = [] }) {
  const sheets = [{ name: sheetName, rows, widths, validations }, ...extraSheets];
  const withStyles = sheets.some((sheet) => sheet.rows.some((row) => row.some((cell) => isTyped(cell) && (cell.type === 'date' || cell.type === 'datetime'))));
  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
    `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
    `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
    `<Default Extension="xml" ContentType="application/xml"/>` +
    `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
    sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('') +
    (withStyles ? `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>` : '') +
    `</Types>`;

  const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>` +
    `</Relationships>`;

  const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
    `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
    `<sheets>${sheets.map((sheet, i) => `<sheet name="${xmlEscape(sheet.name)}" sheetId="${i + 1}"${sheet.hidden ? ' state="hidden"' : ''} r:id="rId${i + 1}"/>`).join('')}</sheets>` +
    (definedNames.length ? `<definedNames>${definedNames.map((d) => `<definedName name="${xmlEscape(d.name)}">${xmlEscape(d.ref)}</definedName>`).join('')}</definedNames>` : '') +
    `</workbook>`;

  // Worksheets take rId1..rIdN, so the styles part follows them.
  const workbookRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('') +
    (withStyles ? `<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` : '') +
    `</Relationships>`;

  const files = [
    { name: '[Content_Types].xml', data: Buffer.from(contentTypes, 'utf8') },
    { name: '_rels/.rels', data: Buffer.from(rootRels, 'utf8') },
    { name: 'xl/workbook.xml', data: Buffer.from(workbook, 'utf8') },
    { name: 'xl/_rels/workbook.xml.rels', data: Buffer.from(workbookRels, 'utf8') },
    ...sheets.map((sheet, i) => ({ name: `xl/worksheets/sheet${i + 1}.xml`, data: Buffer.from(buildSheetXml(sheet.rows, sheet), 'utf8') })),
    ...(withStyles ? [{ name: 'xl/styles.xml', data: Buffer.from(STYLES_XML, 'utf8') }] : []),
  ];

  return buildZip(files);
}
