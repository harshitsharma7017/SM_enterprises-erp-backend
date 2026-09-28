/**
 * The ERP's document house style (requirement 18), used by every generated
 * document: company letterhead (logo, name, address, contact and tax numbers
 * from Companies + Letterhead settings), a title band with the document number,
 * party boxes, a details grid, the line table (header repeated on each page),
 * totals with amount in words, bank details, remarks / terms, signature blocks
 * and a footer with the page count. It lays out what it is given and computes
 * nothing — amounts, taxes and wording come from the caller.
 */
import { pool } from '../config/database.js';
import { PdfCanvas, PAGE } from '../utils/pdf-canvas.js';
import { companyLetterhead } from '../modules/company/company-letterhead.service.js';

const M = 36; // page margin
const W = PAGE.width - M * 2;
const BOTTOM = PAGE.height - 48; // content stops above the footer
const INK = 0.12;
const MUTED = 0.42;
const RULE = 0.72;
const SHADE = 0.93;

const has = (v) => v !== null && v !== undefined && String(v).trim() !== '';

/** Company master + letterhead settings + logo bytes, for one company. */
export const loadLetterhead = async (companyId) => {
  const [[company]] = await pool.query('SELECT id, code, name, short_name, address, phone, email, gstin FROM companies WHERE id = ?', [companyId]);
  const settings = await companyLetterhead.get(companyId);
  return { company: company || { name: '' }, settings, logo: await companyLetterhead.logo(settings) };
};

class Layout {
  constructor(doc) {
    this.doc = doc;
    this.c = new PdfCanvas();
    this.y = M;
  }

  ensure(space, onNewPage) {
    if (this.y + space <= BOTTOM) return false;
    this.c.addPage();
    this.y = M;
    this.continuationHeader();
    if (onNewPage) onNewPage();
    return true;
  }

  continuationHeader() {
    const { c, doc } = this;
    c.text(doc.letterhead.company.name, M, this.y, { size: 10, font: 'Helvetica-Bold', color: INK });
    c.text(`${doc.title}  ${doc.number || ''}`.trim(), M + W, this.y, { size: 10, font: 'Helvetica-Bold', align: 'right', color: INK });
    this.y += 16;
    c.line(M, this.y, M + W, this.y, { width: 0.6, gray: RULE });
    this.y += 10;
  }

  letterhead() {
    const { c } = this;
    const { company, settings, logo } = this.doc.letterhead;
    let x = M;
    let logoH = 0;
    if (logo) {
      try {
        const size = c.image(logo, M, this.y, 80, 56);
        x = M + size.width + 12;
        logoH = size.height;
      } catch {
        // an unusable logo is skipped rather than failing the document
      }
    }
    let y = this.y;
    c.text(company.name, x, y, { size: 16, font: 'Helvetica-Bold', color: INK });
    y += 19;
    if (has(settings.tagline)) {
      c.text(settings.tagline, x, y, { size: 8.5, font: 'Helvetica-Oblique', color: MUTED });
      y += 11;
    }
    const width = M + W - x;
    for (const line of (company.address ? c.wrap(company.address, width, 8.5) : [])) {
      c.text(line, x, y, { size: 8.5, color: INK });
      y += 10.5;
    }
    const contact = [company.phone && `Phone: ${company.phone}`, company.email && `Email: ${company.email}`, settings.website].filter(Boolean).join('   |   ');
    if (contact) {
      c.text(contact, x, y, { size: 8, color: MUTED });
      y += 10.5;
    }
    const tax = [company.gstin && `GSTIN: ${company.gstin}`, settings.pan && `PAN: ${settings.pan}`, settings.iec_code && `IEC: ${settings.iec_code}`].filter(Boolean).join('   |   ');
    if (tax) {
      c.text(tax, x, y, { size: 8, font: 'Helvetica-Bold', color: INK });
      y += 10.5;
    }
    this.y = Math.max(y, this.y + logoH) + 8;
    c.line(M, this.y, M + W, this.y, { width: 1.2, gray: INK });
    this.y += 8;
  }

  titleBand() {
    const { c, doc } = this;
    c.rect(M, this.y, W, 26, { fill: SHADE });
    c.text(doc.title, M + 10, this.y + 8, { size: 13, font: 'Helvetica-Bold', color: INK });
    if (has(doc.number)) c.text(doc.number, M + W - 10, this.y + 8, { size: 11, font: 'Helvetica-Bold', align: 'right', color: INK });
    this.y += 26;
    if (doc.mark) {
      c.rect(M, this.y, W, 16, { fill: 0.25 });
      c.text(doc.mark, M + W / 2, this.y + 4, { size: 8.5, font: 'Helvetica-Bold', align: 'center', color: 1 });
      this.y += 16;
    }
    this.y += 10;
  }

  /** Up to three bordered boxes side by side: { title, lines: [first line bold, …] }. */
  parties() {
    const { c } = this;
    const parties = (this.doc.parties || []).filter((p) => p && (p.lines || []).some(has));
    if (!parties.length) return;
    const gap = 10;
    const bw = (W - gap * (parties.length - 1)) / parties.length;
    const blocks = parties.map((p) => p.lines.filter(has).flatMap((l, i) => c.wrap(l, bw - 16, i === 0 ? 9.5 : 8.5, i === 0 ? 'Helvetica-Bold' : 'Helvetica').map((t) => ({ t, first: i === 0 }))));
    const h = 22 + Math.max(...blocks.map((b) => b.reduce((s, l) => s + (l.first ? 12 : 10.5), 0))) + 6;
    this.ensure(h);
    parties.forEach((p, i) => {
      const x = M + i * (bw + gap);
      c.rect(x, this.y, bw, h, { stroke: RULE });
      c.rect(x, this.y, bw, 15, { fill: SHADE });
      c.text(p.title.toUpperCase(), x + 8, this.y + 4, { size: 7.5, font: 'Helvetica-Bold', color: MUTED });
      let y = this.y + 21;
      for (const l of blocks[i]) {
        c.text(l.t, x + 8, y, { size: l.first ? 9.5 : 8.5, font: l.first ? 'Helvetica-Bold' : 'Helvetica', color: INK });
        y += l.first ? 12 : 10.5;
      }
    });
    this.y += h + 10;
  }

  /** Label / value cells, `perRow` to a row, bordered. */
  facts() {
    const { c } = this;
    const facts = (this.doc.facts || []).filter(([, v]) => has(v));
    if (!facts.length) return;
    const perRow = this.doc.factsPerRow || 4;
    const cw = W / perRow;
    for (let i = 0; i < facts.length; i += perRow) {
      const row = facts.slice(i, i + perRow);
      const wrapped = row.map(([, v]) => c.wrap(String(v), cw - 12, 9, 'Helvetica-Bold'));
      const h = 16 + Math.max(...wrapped.map((w) => w.length)) * 11 + 4;
      this.ensure(h);
      row.forEach(([label], j) => {
        const x = M + j * cw;
        c.rect(x, this.y, cw, h, { stroke: RULE });
        c.text(label, x + 6, this.y + 4, { size: 7, color: MUTED });
        wrapped[j].forEach((line, k) => c.text(line, x + 6, this.y + 14 + k * 11, { size: 9, font: 'Helvetica-Bold', color: INK }));
      });
      for (let j = row.length; j < perRow; j++) c.rect(M + j * cw, this.y, cw, h, { stroke: RULE });
      this.y += h;
    }
    this.y += 12;
  }

  /** columns: [{ label, width (share), align }]; rows: [{ cells: [...], sub }]. */
  table() {
    const { c } = this;
    const t = this.doc.table;
    if (!t) return;
    const total = t.columns.reduce((s, col) => s + (col.width || 1), 0);
    const cols = [];
    let x = M;
    for (const col of t.columns) {
      const w = (W * (col.width || 1)) / total;
      cols.push({ ...col, x, w });
      x += w;
    }
    const header = () => {
      const labels = cols.map((col) => c.wrap(col.label, col.w - 8, 7.5, 'Helvetica-Bold'));
      const h = Math.max(...labels.map((l) => l.length)) * 9 + 8;
      c.rect(M, this.y, W, h, { fill: 0.2 });
      cols.forEach((col, i) => labels[i].forEach((line, k) => {
        const tx = col.align === 'right' ? col.x + col.w - 4 : col.align === 'center' ? col.x + col.w / 2 : col.x + 4;
        c.text(line, tx, this.y + 4 + k * 9, { size: 7.5, font: 'Helvetica-Bold', align: col.align || 'left', color: 1 });
      }));
      this.y += h;
    };
    this.ensure(40);
    header();
    if (!t.rows.length) {
      c.rect(M, this.y, W, 20, { stroke: RULE });
      c.text(t.emptyText || 'No lines', M + W / 2, this.y + 6, { size: 8.5, align: 'center', color: MUTED });
      this.y += 20;
    }
    t.rows.forEach((row, r) => {
      const cells = cols.map((col, i) => c.wrap(has(row.cells[i]) ? String(row.cells[i]) : '', col.w - 8, 8.5, col.bold ? 'Helvetica-Bold' : 'Helvetica'));
      const subLines = has(row.sub) ? c.wrap(row.sub, W - (cols[1]?.x || M) + M - 12, 7.5) : [];
      const h = Math.max(...cells.map((l) => l.length)) * 10.5 + subLines.length * 9 + 8;
      this.ensure(h, header);
      if (r % 2 === 1) c.rect(M, this.y, W, h, { fill: 0.975 });
      cols.forEach((col, i) => cells[i].forEach((line, k) => {
        const tx = col.align === 'right' ? col.x + col.w - 4 : col.align === 'center' ? col.x + col.w / 2 : col.x + 4;
        c.text(line, tx, this.y + 4 + k * 10.5, { size: 8.5, font: col.bold ? 'Helvetica-Bold' : 'Helvetica', align: col.align || 'left', color: INK });
      }));
      const subTop = this.y + 4 + Math.max(...cells.map((l) => l.length)) * 10.5;
      subLines.forEach((line, k) => c.text(line, (cols[1]?.x || M) + 4, subTop + k * 9, { size: 7.5, font: 'Helvetica-Oblique', color: MUTED }));
      c.line(M, this.y + h, M + W, this.y + h, { width: 0.4, gray: RULE });
      this.y += h;
    });
    c.rect(M, this.y - 0.01, W, 0.01, { stroke: RULE });
    this.y += 6;
  }

  totals() {
    const { c, doc } = this;
    const rows = (doc.totals || []).filter(([, v]) => has(v));
    if (!rows.length && !has(doc.amountInWords)) return;
    const bw = 230;
    const h = rows.length * 16;
    const words = has(doc.amountInWords) ? c.wrap(doc.amountInWords, W - bw - 20, 8.5, 'Helvetica-Bold') : [];
    this.ensure(Math.max(h, 20 + words.length * 11) + 8);
    if (words.length) {
      c.text('Amount in words', M, this.y + 2, { size: 7, color: MUTED });
      words.forEach((line, k) => c.text(line, M, this.y + 12 + k * 11, { size: 8.5, font: 'Helvetica-Bold', color: INK }));
    }
    rows.forEach(([label, value, opts = {}], i) => {
      const y = this.y + i * 16;
      if (opts.strong) c.rect(M + W - bw, y, bw, 16, { fill: SHADE });
      c.text(label, M + W - bw + 6, y + 4, { size: 8.5, font: opts.strong ? 'Helvetica-Bold' : 'Helvetica', color: INK });
      c.text(value, M + W - 6, y + 4, { size: opts.strong ? 10 : 8.5, font: opts.strong ? 'Helvetica-Bold' : 'Helvetica', align: 'right', color: INK });
    });
    if (rows.length) c.rect(M + W - bw, this.y, bw, h, { stroke: RULE });
    this.y += Math.max(h, 12 + words.length * 11) + 12;
  }

  /** Titled free-text blocks (remarks, notes, terms), and the company bank details when asked for. */
  sections() {
    const { c, doc } = this;
    const { settings } = doc.letterhead;
    const blocks = (doc.sections || []).filter((s) => has(s.text));
    if (doc.bank) {
      const bank = [
        settings.bank_account_name && `Account name: ${settings.bank_account_name}`,
        settings.bank_name && `Bank: ${settings.bank_name}${settings.bank_branch ? `, ${settings.bank_branch}` : ''}`,
        settings.bank_account_number && `Account no.: ${settings.bank_account_number}`,
        [settings.bank_ifsc && `IFSC: ${settings.bank_ifsc}`, settings.bank_swift && `SWIFT: ${settings.bank_swift}`].filter(Boolean).join('   '),
      ].filter(Boolean);
      if (bank.length) blocks.unshift({ title: 'Bank details', text: bank.join('\n') });
    }
    for (const block of blocks) {
      const lines = c.wrap(block.text, W - 4, 8.5);
      this.ensure(14 + Math.min(lines.length, 3) * 10.5);
      c.text(block.title.toUpperCase(), M, this.y, { size: 7.5, font: 'Helvetica-Bold', color: MUTED });
      this.y += 11;
      for (const line of lines) {
        this.ensure(10.5);
        c.text(line, M, this.y, { size: block.small ? 7.5 : 8.5, color: INK });
        this.y += block.small ? 9.5 : 10.5;
      }
      this.y += 8;
    }
  }

  signatures() {
    const { c, doc } = this;
    const sigs = doc.signatures || [];
    if (!sigs.length) return;
    this.ensure(70);
    this.y += 10;
    const gap = 16;
    // One signature sits on the right at a normal width; several share the row.
    const bw = sigs.length === 1 ? 220 : (W - gap * (sigs.length - 1)) / sigs.length;
    const left = sigs.length === 1 ? M + W - bw : M;
    sigs.forEach((s, i) => {
      const x = left + i * (bw + gap);
      const forCompany = s.forCompany ? `For ${doc.letterhead.company.name}` : null;
      if (forCompany) c.text(forCompany, x + bw / 2, this.y, { size: 8.5, font: 'Helvetica-Bold', align: 'center', color: INK });
      c.line(x + 10, this.y + 40, x + bw - 10, this.y + 40, { width: 0.6, gray: MUTED });
      c.text(s.label, x + bw / 2, this.y + 44, { size: 8, align: 'center', color: INK });
      if (has(s.name)) c.text(s.name, x + bw / 2, this.y + 54, { size: 7.5, align: 'center', color: MUTED });
    });
    this.y += 66;
  }

  footer(canvas, page, pages) {
    const { doc } = this;
    const y = PAGE.height - 34;
    canvas.line(M, y - 4, M + W, y - 4, { width: 0.5, gray: RULE });
    canvas.text(doc.letterhead.settings.footer_note || 'This is a computer-generated document.', M, y, { size: 7, color: MUTED });
    canvas.text(`${doc.number || ''}`, M + W / 2, y, { size: 7, align: 'center', color: MUTED });
    canvas.text(`Page ${page} of ${pages}`, M + W, y, { size: 7, align: 'right', color: MUTED });
  }

  render() {
    this.letterhead();
    this.titleBand();
    this.parties();
    this.facts();
    this.table();
    this.totals();
    this.sections();
    this.signatures();
    if (this.doc.generatedNote) {
      this.ensure(12);
      this.c.text(this.doc.generatedNote, M, this.y, { size: 7, font: 'Helvetica-Oblique', color: MUTED });
    }
    return this.c.build({ footer: (canvas, page, pages) => this.footer(canvas, page, pages) });
  }
}

/**
 * @param {object} doc
 * @param {object} doc.letterhead - from loadLetterhead()
 * @param {string} doc.title / doc.number / doc.mark (e.g. "DRAFT - NOT ISSUED")
 * @param {Array<{title: string, lines: string[]}>} doc.parties
 * @param {Array<[string, any]>} doc.facts, doc.factsPerRow
 * @param {{columns: Array<{label, width, align, bold}>, rows: Array<{cells: any[], sub?: string}>, emptyText?}} doc.table
 * @param {Array<[string, string, {strong?: boolean}]>} doc.totals
 * @param {string} doc.amountInWords
 * @param {boolean} doc.bank - print the company's bank details
 * @param {Array<{title: string, text: string, small?: boolean}>} doc.sections
 * @param {Array<{label: string, name?: string, forCompany?: boolean}>} doc.signatures
 * @param {string} doc.generatedNote
 * @returns {Buffer}
 */
export const renderDocument = (doc) => new Layout(doc).render();
