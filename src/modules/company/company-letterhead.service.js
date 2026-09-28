import { pool } from '../../config/database.js';
import { storage } from '../../services/storage.service.js';
import { assertDrawableImage } from '../../utils/pdf-canvas.js';

/**
 * A company's letterhead and document details (company_document_settings):
 * logo, tagline, PAN / IEC, website, bank details, signatory, purchase and
 * sales terms, footer note. Everything is optional; documents leave out what
 * is not filled in. The logo is kept in the storage layer under
 * company-profile/ (a public upload folder, so the form can preview it).
 */
const FIELDS = {
  tagline: 200, pan: 10, iec_code: 20, website: 150,
  bank_name: 150, bank_branch: 150, bank_account_name: 200, bank_account_number: 40, bank_ifsc: 11, bank_swift: 11,
  signatory_name: 120, signatory_designation: 120, purchase_terms: 4000, sales_terms: 4000, footer_note: 255,
};
const LABELS = {
  tagline: 'Tagline', pan: 'PAN', iec_code: 'IEC code', website: 'Website', bank_name: 'Bank name', bank_branch: 'Branch',
  bank_account_name: 'Account name', bank_account_number: 'Account number', bank_ifsc: 'IFSC', bank_swift: 'SWIFT',
  signatory_name: 'Signatory name', signatory_designation: 'Signatory designation', purchase_terms: 'Purchase terms',
  sales_terms: 'Sales terms', footer_note: 'Footer note',
};
const UPPER = ['pan', 'iec_code', 'bank_ifsc', 'bank_swift'];
const LOGO_TYPES = ['image/png', 'image/jpeg', 'image/jpg'];
const MAX_LOGO_BYTES = 1024 * 1024;

const clean = (v) => (v === undefined || v === null || String(v).trim() === '' ? null : String(v).trim());
const invalid = (errors) => ({ status: 422, message: 'Validation failed', errors });

export const companyLetterhead = {
  /** The settings row (or an empty one) — used by the form and by every document. */
  get: async (companyId) => {
    const [[row]] = await pool.query('SELECT * FROM company_document_settings WHERE company_id = ?', [companyId]);
    return row || { company_id: Number(companyId), logo_path: null, ...Object.fromEntries(Object.keys(FIELDS).map((f) => [f, null])) };
  },

  /** The logo bytes for a document, or null (a missing / unreadable file never stops a document). */
  logo: async (settings) => {
    if (!settings?.logo_path) return null;
    try {
      return await storage.get(settings.logo_path);
    } catch {
      return null;
    }
  },

  save: async (companyId, body, file, userId) => {
    const [[company]] = await pool.query('SELECT id, code FROM companies WHERE id = ? AND deleted_at IS NULL', [companyId]);
    if (!company) throw { status: 404, message: 'Company not found' };
    const errors = [];
    const data = {};
    for (const [field, max] of Object.entries(FIELDS)) {
      let v = clean(body[field]);
      if (v && UPPER.includes(field)) v = v.toUpperCase();
      if (v && v.length > max) errors.push(`${LABELS[field]} cannot exceed ${max} characters`);
      data[field] = v;
    }
    if (data.pan && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(data.pan)) errors.push('That is not a valid PAN — expected 10 characters, e.g. ABCDE1234F.');
    if (data.bank_ifsc && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(data.bank_ifsc)) errors.push('That is not a valid IFSC — expected 11 characters, e.g. HDFC0001234.');
    if (data.bank_swift && !/^[A-Z0-9]{8}([A-Z0-9]{3})?$/.test(data.bank_swift)) errors.push('A SWIFT code is 8 or 11 letters / digits.');
    if (file) {
      if (!LOGO_TYPES.includes(file.mimetype)) errors.push('The logo must be a PNG or JPEG image.');
      else if (file.size > MAX_LOGO_BYTES) errors.push('The logo cannot be larger than 1 MB.');
      else {
        try {
          assertDrawableImage(file.buffer);
        } catch (e) {
          errors.push(e.message);
        }
      }
    }
    if (errors.length) throw invalid(errors);

    const existing = await companyLetterhead.get(companyId);
    let logoPath = existing.logo_path;
    const removeLogo = ['1', 'true', 'yes'].includes(String(body.remove_logo || '').toLowerCase());
    if (file) {
      logoPath = storage.newKey('company-profile', `letterhead-${String(company.code).toLowerCase()}`, file.originalname);
      await storage.put(logoPath, file.buffer, file.mimetype);
    } else if (removeLogo) {
      logoPath = null;
    }
    const columns = ['logo_path', ...Object.keys(FIELDS)];
    const values = [logoPath, ...Object.keys(FIELDS).map((f) => data[f])];
    try {
      await pool.query(
        `INSERT INTO company_document_settings (company_id, ${columns.join(', ')}, updated_by, created_at, updated_at)
         VALUES (?, ${columns.map(() => '?').join(', ')}, ?, NOW(), NOW())
         ON DUPLICATE KEY UPDATE ${columns.map((c) => `${c} = VALUES(${c})`).join(', ')}, updated_by = VALUES(updated_by), updated_at = NOW()`,
        [companyId, ...values, userId]
      );
    } catch (error) {
      if (file) await storage.remove(logoPath);
      throw error;
    }
    if (existing.logo_path && existing.logo_path !== logoPath) await storage.remove(existing.logo_path);
    return companyLetterhead.get(companyId);
  },
};
