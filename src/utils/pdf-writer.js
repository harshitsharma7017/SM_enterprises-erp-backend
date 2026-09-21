/**
 * Minimal, dependency-free PDF writer — no PDF library exists in this
 * project (see package.json), and the task explicitly asks not to
 * introduce a large dependency when an existing one can't be reused. This
 * hand-writes a valid PDF 1.4 document (Helvetica, one of the 14 standard
 * fonts every reader supports without embedding) directly from plain text
 * lines, with simple pagination. It is intentionally generic — any module
 * that needs a text/table PDF can reuse it, not just Inquiry.
 */

const PAGE_WIDTH = 595.28; // A4 portrait, points
const PAGE_HEIGHT = 841.89;
const MARGIN = 40;
const FONT_SIZE = 10;
const LINE_HEIGHT = 14;
const LINES_PER_PAGE = Math.floor((PAGE_HEIGHT - MARGIN * 2) / LINE_HEIGHT);

// Standard Helvetica only covers Latin-1 without embedding a Unicode font —
// non-representable characters (e.g. a rupee/euro glyph) are replaced with
// "?" rather than corrupting the byte-exact /Length below.
const escapePdfText = (str) => String(str)
  .replace(/[^\x20-\x7E]/g, '?')
  .replace(/\\/g, '\\\\')
  .replace(/\(/g, '\\(')
  .replace(/\)/g, '\\)');

/**
 * @param {{ lines: string[] }} params - Plain text lines, already laid out
 *   by the caller (one array entry per printed row).
 * @returns {Buffer}
 */
export function writeSimplePdf({ lines = [] }) {
  const pages = [];
  for (let i = 0; i < lines.length; i += LINES_PER_PAGE) {
    pages.push(lines.slice(i, i + LINES_PER_PAGE));
  }
  if (pages.length === 0) pages.push([]);

  const catalogId = 1;
  const pagesId = 2;
  const fontId = 3;
  let nextId = 4;

  const pageIds = pages.map(() => nextId++);
  const contentIds = pages.map(() => nextId++);

  const contentStreams = pages.map((pageLines) => {
    let y = PAGE_HEIGHT - MARGIN;
    const parts = [`BT`, `/F1 ${FONT_SIZE} Tf`, `${MARGIN} ${y} Td`];
    pageLines.forEach((line, idx) => {
      if (idx > 0) parts.push(`0 ${-LINE_HEIGHT} Td`);
      parts.push(`(${escapePdfText(line)}) Tj`);
    });
    parts.push('ET');
    return parts.join('\n');
  });

  const objects = new Map();
  objects.set(catalogId, `<< /Type /Catalog /Pages ${pagesId} 0 R >>`);
  objects.set(pagesId, `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`);
  objects.set(fontId, `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>`);

  pageIds.forEach((pageId, idx) => {
    objects.set(
      pageId,
      `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] ` +
      `/Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentIds[idx]} 0 R >>`
    );
  });

  contentIds.forEach((contentId, idx) => {
    const stream = contentStreams[idx];
    const len = Buffer.byteLength(stream, 'utf8');
    objects.set(contentId, `<< /Length ${len} >>\nstream\n${stream}\nendstream`);
  });

  const maxId = nextId - 1;
  const chunks = [];
  const offsets = new Array(maxId + 1).fill(0);
  let offset = 0;

  const push = (str) => {
    const buf = Buffer.from(str, 'binary');
    chunks.push(buf);
    offset += buf.length;
  };

  push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');

  for (let id = 1; id <= maxId; id++) {
    offsets[id] = offset;
    push(`${id} 0 obj\n${objects.get(id)}\nendobj\n`);
  }

  const xrefStart = offset;
  let xref = `xref\n0 ${maxId + 1}\n0000000000 65535 f \n`;
  for (let id = 1; id <= maxId; id++) {
    xref += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`;
  }
  push(xref);
  push(`trailer\n<< /Size ${maxId + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefStart}\n%%EOF`);

  return Buffer.concat(chunks);
}
