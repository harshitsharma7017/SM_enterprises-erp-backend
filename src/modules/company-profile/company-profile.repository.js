import { pool } from '../../config/database.js';

export const companyProfileRepository = {
  get: async () => {
    const [rows] = await pool.query('SELECT * FROM company_profile LIMIT 1');
    return rows[0] || null;
  },

  update: async (data) => {
    const existing = await companyProfileRepository.get();
    if (existing) {
      await pool.query(`
        UPDATE company_profile SET
          company_name = ?, tagline = ?, address = ?, phone = ?, email = ?,
          gstin = ?, iec_code = ?, bank_name = ?, bank_account_number = ?,
          bank_ifsc = ?, bank_swift = ?, signatory_name = ?, signatory_designation = ?,
          logo_path = ?, updated_at = NOW()
        WHERE id = ?
      `, [
        data.company_name, data.tagline || null, data.address || null, data.phone || null,
        data.email || null, data.gstin || null, data.iec_code || null, data.bank_name || null,
        data.bank_account_number || null, data.bank_ifsc || null, data.bank_swift || null,
        data.signatory_name || null, data.signatory_designation || null, data.logo_path || existing.logo_path,
        existing.id
      ]);
    } else {
      await pool.query(`
        INSERT INTO company_profile (
          company_name, tagline, address, phone, email,
          gstin, iec_code, bank_name, bank_account_number,
          bank_ifsc, bank_swift, signatory_name, signatory_designation,
          logo_path, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `, [
        data.company_name, data.tagline || null, data.address || null, data.phone || null,
        data.email || null, data.gstin || null, data.iec_code || null, data.bank_name || null,
        data.bank_account_number || null, data.bank_ifsc || null, data.bank_swift || null,
        data.signatory_name || null, data.signatory_designation || null, data.logo_path || null
      ]);
    }
  }
};
