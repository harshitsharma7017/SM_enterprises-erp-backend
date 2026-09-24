/**
 * Proforma / final invoice documents, rendered on request from the stored
 * record with the existing dependency-free PDF writer. Nothing is written to
 * disk: /storage is served publicly, and the ERP has no private document
 * store yet, so the document is always regenerated from its (frozen once
 * issued) source transaction through the authenticated API.
 *
 * The layout is deliberately neutral: it carries only transaction data
 * already in the ERP. Tax, statutory and bank sections are placeholders
 * until the client approves a format.
 */
import { pool } from '../config/database.js';
import { writeSimplePdf } from '../utils/pdf-writer.js';

const WIDTH = 100;
const cell = (value, width, alignRight = false) => {
  const s = value === null || value === undefined ? '' : String(value);
  const cut = s.length > width ? `${s.slice(0, width - 1)}~` : s;
  return alignRight ? cut.padStart(width) : cut.padEnd(width);
};
const qty = (value, decimals) => (value === null || value === undefined ? '' : Number(value).toFixed(Number(decimals) || 0));
const money = (value) => (value === null || value === undefined ? '-' : Number(value).toFixed(2));
const day = (value) => (value ? String(value instanceof Date ? value.toISOString() : value).slice(0, 10) : '-');

export const commercialDocument = {
  /** Issuing company and customer as held in the masters. */
  parties: async (companyId, buyerId) => {
    const [[company]] = await pool.query('SELECT code, name, short_name, address, phone, email FROM companies WHERE id = ?', [companyId]);
    const [[buyer]] = await pool.query('SELECT company_name, address, city, state, pincode FROM buyers WHERE id = ?', [buyerId]);
    return { company: company || {}, buyer: buyer || {} };
  },

  /** "PI/2026-27/001" → "PI-2026-27-001.pdf" (same convention as inquiry documents). */
  filename: (number) => `${String(number).replace(/\//g, '-')}.pdf`,

  /**
   * @param {object} doc
   * @param {string} doc.title - "PROFORMA INVOICE" / "INVOICE"
   * @param {string} doc.number
   * @param {string} doc.status - draft / issued / cancelled
   * @param {{company: object, buyer: object}} doc.parties
   * @param {Array<[string, any]>} doc.fields - header facts (order, dates, references)
   * @param {Array<object>} doc.lines - { description, detail, quantity, decimals, unit, unit_price, amount }
   * @param {string|null} doc.currency
   * @param {Array<[string, any]>} doc.footer - references / remarks after the lines
   */
  render: ({ title, number, status, parties, fields, lines, currency, footer = [] }) => {
    const { company, buyer } = parties;
    const out = [];
    out.push(company.name || '');
    String(company.address || '').split(/\r?\n/).filter(Boolean).forEach((l) => out.push(l));
    const contact = [company.phone && `Phone: ${company.phone}`, company.email && `Email: ${company.email}`].filter(Boolean).join('   ');
    if (contact) out.push(contact);
    out.push('='.repeat(WIDTH));
    const mark = status === 'draft' ? '   [DRAFT - NOT ISSUED]' : status === 'cancelled' ? '   [CANCELLED]' : '';
    out.push(`${title}   ${number}${mark}`);
    out.push('');
    out.push(`Customer: ${buyer.company_name || '-'}`);
    const address = [buyer.address, buyer.city, buyer.state, buyer.pincode].filter(Boolean).join(', ');
    if (address) out.push(`          ${address}`);
    fields.filter(([, v]) => v !== null && v !== undefined && v !== '').forEach(([label, value]) => out.push(`${label}: ${value}`));
    out.push('-'.repeat(WIDTH));
    out.push(`${cell('#', 4)}${cell('Description', 44)}${cell('Quantity', 14, true)} ${cell('Unit', 6)}${cell('Unit price', 12, true)}${cell('Amount', 14, true)}`);
    out.push('-'.repeat(WIDTH));
    let total = 0;
    let unpriced = 0;
    lines.forEach((l, i) => {
      out.push(`${cell(i + 1, 4)}${cell(l.description, 44)}${cell(qty(l.quantity, l.decimals), 14, true)} ${cell(l.unit, 6)}${cell(money(l.unit_price), 12, true)}${cell(money(l.amount), 14, true)}`);
      if (l.detail) out.push(`${cell('', 4)}${l.detail}`);
      if (l.amount === null || l.amount === undefined) unpriced += 1;
      else total += Math.round(Number(l.amount) * 100);
    });
    out.push('-'.repeat(WIDTH));
    out.push(`Total of priced lines: ${(total / 100).toFixed(2)}${currency ? ` ${currency}` : ''}${unpriced ? `   (${unpriced} line(s) without a price)` : ''}`);
    out.push('Amount = quantity x the order item\'s unit price. No tax, discount, freight or other charge is calculated by the ERP.');
    out.push('');
    footer.filter(([, v]) => v !== null && v !== undefined && v !== '').forEach(([label, value]) => out.push(`${label}: ${value}`));
    out.push('');
    out.push('Tax / statutory details: [format pending client approval]');
    out.push('Bank / payment instructions: [format pending client approval]');
    out.push('');
    out.push(`Generated ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC from ERP record ${number}.`);
    return writeSimplePdf({ lines: out });
  },

  day,
};
