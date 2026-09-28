/**
 * Dependency-free A4 PDF canvas for laid-out documents (the plain-text
 * writer in pdf-writer.js stays for the simple inquiry print).
 *
 *   text / textWidth / wrap   Helvetica, Helvetica-Bold, Helvetica-Oblique —
 *                             standard fonts every reader has, measured with
 *                             their AFM widths so right-aligned and wrapped
 *                             text lands where it should
 *   line / rect               strokes and filled boxes (grey shades)
 *   image                     JPEG (DCTDecode) and 8-bit PNG (FlateDecode;
 *                             alpha becomes a soft mask) — for logos
 *   addPage / build           multi-page, "Page x of y" filled in at build
 *
 * Coordinates are in points from the TOP-LEFT of the page (y grows down);
 * the canvas converts to PDF's bottom-left origin. Text is WinAnsi (Latin-1):
 * typographic dashes / quotes are mapped, anything else outside Latin-1
 * prints as "?".
 */
import zlib from 'zlib';

export const PAGE = { width: 595.28, height: 841.89 };

// AFM advance widths (1/1000 em) for printable ASCII 32..126.
const WIDTHS = {
  Helvetica: [278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584],
  'Helvetica-Bold': [278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611, 975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556, 333, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611, 611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584],
};
WIDTHS['Helvetica-Oblique'] = WIDTHS.Helvetica;
const FONT_KEYS = { Helvetica: 'F1', 'Helvetica-Bold': 'F2', 'Helvetica-Oblique': 'F3' };

/** Latin-1 only: map common typographic characters, replace the rest. */
export const plainText = (value) => String(value ?? '')
  .replace(/[\u2012-\u2015]/g, '-')
  .replace(/[\u2018\u2019]/g, "'")
  .replace(/[\u201C\u201D]/g, '"')
  .replace(/\u2026/g, '...')
  .replace(/\u20B9/g, 'Rs.')
  .replace(/\u00D7/g, 'x')
  .replace(/\u2022/g, '\u00B7')
  .replace(/[^\x20-\x7E\u00A0-\u00FF\r\n]/g, '?'); // line breaks survive for wrap(); text() draws a single line

const charWidth = (font, code) => {
  if (code >= 32 && code <= 126) return WIDTHS[font][code - 32];
  if (code === 0xB7) return 278; // middle dot
  return 556;
};

const escape = (s) => {
  let out = '';
  for (const ch of s) {
    const code = ch.charCodeAt(0);
    if (ch === '\\' || ch === '(' || ch === ')') out += `\\${ch}`;
    else if (code > 126) out += `\\${code.toString(8).padStart(3, '0')}`;
    else out += ch;
  }
  return out;
};

const num = (n) => (Math.round(n * 100) / 100).toString();

// ---------------- images ----------------

const jpegInfo = (buf) => {
  let i = 2;
  while (i < buf.length) {
    if (buf[i] !== 0xFF) { i += 1; continue; }
    const marker = buf[i + 1];
    const len = buf.readUInt16BE(i + 2);
    if (marker >= 0xC0 && marker <= 0xCF && ![0xC4, 0xC8, 0xCC].includes(marker)) {
      return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7), components: buf[i + 9] };
    }
    i += 2 + len;
  }
  throw new Error('Unreadable JPEG');
};

/** 8-bit, non-interlaced PNG → { width, height, colors, data (Flate, PNG predictors), smask? }. */
const pngImage = (buf) => {
  let pos = 8;
  let header = null;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    const chunk = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') header = { width: chunk.readUInt32BE(0), height: chunk.readUInt32BE(4), depth: chunk[8], colorType: chunk[9], interlace: chunk[12] };
    else if (type === 'IDAT') idat.push(chunk);
    else if (type === 'IEND') break;
    pos += 12 + len;
  }
  if (!header || header.depth !== 8 || header.interlace !== 0 || ![0, 2, 4, 6].includes(header.colorType)) {
    throw new Error('Only 8-bit, non-interlaced greyscale / RGB PNG logos are supported');
  }
  const { width, height, colorType } = header;
  const compressed = Buffer.concat(idat);
  const hasAlpha = colorType === 4 || colorType === 6;
  const colors = colorType === 2 || colorType === 6 ? 3 : 1;
  if (!hasAlpha) return { width, height, colors, data: compressed, predictor: true };

  // Undo the PNG row filters, then split colour and alpha.
  const bpp = colors + 1;
  const raw = zlib.inflateSync(compressed);
  const stride = width * bpp;
  const pixels = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const row = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? pixels[y * stride + x - bpp] : 0;
      const b = y > 0 ? pixels[(y - 1) * stride + x] : 0;
      const c = x >= bpp && y > 0 ? pixels[(y - 1) * stride + x - bpp] : 0;
      let v = row[x];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += Math.floor((a + b) / 2);
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      pixels[y * stride + x] = v & 0xFF;
    }
  }
  const color = Buffer.alloc(width * height * colors);
  const alpha = Buffer.alloc(width * height);
  for (let p = 0; p < width * height; p++) {
    for (let k = 0; k < colors; k++) color[p * colors + k] = pixels[p * bpp + k];
    alpha[p] = pixels[p * bpp + colors];
  }
  return { width, height, colors, data: zlib.deflateSync(color), smask: zlib.deflateSync(alpha) };
};

/** Width / height of a logo, for sizing before drawing. */
export const imageSize = (buffer) => {
  if (buffer[0] === 0xFF && buffer[1] === 0xD8) return jpegInfo(buffer);
  if (buffer.subarray(1, 4).toString('ascii') === 'PNG') return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  throw new Error('Logo must be a PNG or JPEG image');
};

/** Throws unless the buffer is a JPEG or a PNG this canvas can draw (used to vet logo uploads). */
export const assertDrawableImage = (buffer) => {
  if (buffer[0] === 0xFF && buffer[1] === 0xD8) return jpegInfo(buffer);
  if (buffer.subarray(1, 4).toString('ascii') === 'PNG') return pngImage(buffer);
  throw new Error('Logo must be a PNG or JPEG image');
};

// ---------------- canvas ----------------

export class PdfCanvas {
  constructor() {
    this.pages = [];
    this.images = [];
    this.addPage();
  }

  addPage() {
    this.ops = [];
    this.pages.push(this.ops);
    return this;
  }

  get pageNumber() {
    return this.pages.length;
  }

  textWidth(text, size = 9, font = 'Helvetica') {
    let w = 0;
    for (const ch of plainText(text)) w += charWidth(font, ch.charCodeAt(0));
    return (w * size) / 1000;
  }

  /** Word-wraps text to a width; honours line breaks; breaks words longer than a line. */
  wrap(text, width, size = 9, font = 'Helvetica') {
    const lines = [];
    for (const para of plainText(text).split(/\r?\n/)) {
      let line = '';
      for (const word of para.split(/\s+/).filter(Boolean)) {
        const candidate = line ? `${line} ${word}` : word;
        if (this.textWidth(candidate, size, font) <= width) {
          line = candidate;
          continue;
        }
        if (line) lines.push(line);
        let rest = word;
        while (this.textWidth(rest, size, font) > width) {
          let cut = rest.length - 1;
          while (cut > 1 && this.textWidth(rest.slice(0, cut), size, font) > width) cut -= 1;
          lines.push(rest.slice(0, cut));
          rest = rest.slice(cut);
        }
        line = rest;
      }
      lines.push(line);
    }
    return lines;
  }

  /** Text at (x, y-top). align: left | right | center — x is the anchor. */
  text(value, x, y, { size = 9, font = 'Helvetica', align = 'left', color = 0 } = {}) {
    const s = plainText(value);
    if (!s) return this;
    let left = x;
    if (align !== 'left') {
      const w = this.textWidth(s, size, font);
      left = align === 'right' ? x - w : x - w / 2;
    }
    const baseline = PAGE.height - y - size * 0.8;
    this.ops.push(`BT /${FONT_KEYS[font]} ${num(size)} Tf ${num(color)} g ${num(left)} ${num(baseline)} Td (${escape(s)}) Tj ET`);
    return this;
  }

  line(x1, y1, x2, y2, { width = 0.5, gray = 0 } = {}) {
    this.ops.push(`${num(gray)} G ${num(width)} w ${num(x1)} ${num(PAGE.height - y1)} m ${num(x2)} ${num(PAGE.height - y2)} l S`);
    return this;
  }

  rect(x, y, w, h, { fill = null, stroke = null, width = 0.5 } = {}) {
    const box = `${num(x)} ${num(PAGE.height - y - h)} ${num(w)} ${num(h)} re`;
    if (fill !== null && stroke !== null) this.ops.push(`${num(fill)} g ${num(stroke)} G ${num(width)} w ${box} B`);
    else if (fill !== null) this.ops.push(`${num(fill)} g ${box} f`);
    else this.ops.push(`${num(stroke ?? 0)} G ${num(width)} w ${box} S`);
    return this;
  }

  /** Draws a PNG / JPEG scaled into the box (keeps aspect ratio, top-left aligned). */
  image(buffer, x, y, maxW, maxH) {
    const size = imageSize(buffer);
    const scale = Math.min(maxW / size.width, maxH / size.height);
    const w = size.width * scale;
    const h = size.height * scale;
    let entry = this.images.find((i) => i.buffer === buffer);
    if (!entry) {
      entry = { buffer, name: `Im${this.images.length + 1}` };
      this.images.push(entry);
    }
    this.ops.push(`q ${num(w)} 0 0 ${num(h)} ${num(x)} ${num(PAGE.height - y - h)} cm /${entry.name} Do Q`);
    return { width: w, height: h };
  }

  /** Assembles the PDF. `footer(canvas, pageNo, pageCount)` runs on every page first. */
  build({ footer = null } = {}) {
    if (footer) {
      const count = this.pages.length;
      this.pages.forEach((ops, idx) => {
        this.ops = ops;
        footer(this, idx + 1, count);
      });
    }
    const objects = [];
    const add = (body) => {
      objects.push(body);
      return objects.length;
    };
    const catalog = add(null);
    const pagesObj = add(null);
    const fonts = Object.entries(FONT_KEYS).map(([name, key]) => ({ key, id: add(`<< /Type /Font /Subtype /Type1 /BaseFont /${name} /Encoding /WinAnsiEncoding >>`) }));
    const imageIds = this.images.map((img) => {
      const b = img.buffer;
      if (b[0] === 0xFF && b[1] === 0xD8) {
        const info = jpegInfo(b);
        const cs = info.components === 1 ? '/DeviceGray' : info.components === 4 ? '/DeviceCMYK' : '/DeviceRGB';
        return { name: img.name, id: add({ dict: `<< /Type /XObject /Subtype /Image /Width ${info.width} /Height ${info.height} /ColorSpace ${cs} /BitsPerComponent 8 /Filter /DCTDecode`, data: b }) };
      }
      const png = pngImage(b);
      const cs = png.colors === 3 ? '/DeviceRGB' : '/DeviceGray';
      const smask = png.smask
        ? add({ dict: `<< /Type /XObject /Subtype /Image /Width ${png.width} /Height ${png.height} /ColorSpace /DeviceGray /BitsPerComponent 8 /Filter /FlateDecode`, data: png.smask })
        : null;
      const parms = png.predictor ? ` /DecodeParms << /Predictor 15 /Colors ${png.colors} /BitsPerComponent 8 /Columns ${png.width} >>` : '';
      return { name: img.name, id: add({ dict: `<< /Type /XObject /Subtype /Image /Width ${png.width} /Height ${png.height} /ColorSpace ${cs} /BitsPerComponent 8 /Filter /FlateDecode${parms}${smask ? ` /SMask ${smask} 0 R` : ''}`, data: png.data }) };
    });
    const resources = `<< /Font << ${fonts.map((f) => `/${f.key} ${f.id} 0 R`).join(' ')} >>${imageIds.length ? ` /XObject << ${imageIds.map((i) => `/${i.name} ${i.id} 0 R`).join(' ')} >>` : ''} >>`;
    const pageIds = this.pages.map((ops) => {
      const content = add({ dict: '<<', data: Buffer.from(ops.join('\n'), 'latin1') });
      return add(`<< /Type /Page /Parent ${pagesObj} 0 R /MediaBox [0 0 ${PAGE.width} ${PAGE.height}] /Resources ${resources} /Contents ${content} 0 R >>`);
    });
    objects[catalog - 1] = `<< /Type /Catalog /Pages ${pagesObj} 0 R >>`;
    objects[pagesObj - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`;

    const chunks = [Buffer.from('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n', 'latin1')];
    let offset = chunks[0].length;
    const offsets = [];
    objects.forEach((obj, idx) => {
      offsets.push(offset);
      let part;
      if (typeof obj === 'string') {
        part = Buffer.from(`${idx + 1} 0 obj\n${obj}\nendobj\n`, 'latin1');
      } else {
        const dict = obj.dict === '<<' ? `<< /Length ${obj.data.length} >>` : `${obj.dict} /Length ${obj.data.length} >>`;
        part = Buffer.concat([Buffer.from(`${idx + 1} 0 obj\n${dict}\nstream\n`, 'latin1'), obj.data, Buffer.from('\nendstream\nendobj\n', 'latin1')]);
      }
      chunks.push(part);
      offset += part.length;
    });
    const xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`;
    chunks.push(Buffer.from(`${xref}trailer\n<< /Size ${objects.length + 1} /Root ${catalog} 0 R >>\nstartxref\n${offset}\n%%EOF`, 'latin1'));
    return Buffer.concat(chunks);
  }
}
