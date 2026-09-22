import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { companyProfileRepository } from './company-profile.repository.js';
import Joi from 'joi';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 'logo' is never accepted as a body field — it only ever comes from the
// uploaded file (see update() below), matching the original's
// `$request->safe()->except('logo')` plus an explicit logo_path assignment.
const validator = Joi.object({
  company_name: Joi.string().max(255).required(),
  tagline: Joi.string().max(255).allow(null, ''),
  address: Joi.string().allow(null, ''),
  phone: Joi.string().max(255).allow(null, ''),
  email: Joi.string().email().max(255).allow(null, ''),
  gstin: Joi.string().max(255).allow(null, ''),
  iec_code: Joi.string().max(255).allow(null, ''),
  bank_name: Joi.string().max(255).allow(null, ''),
  bank_account_number: Joi.string().max(255).allow(null, ''),
  bank_ifsc: Joi.string().max(255).allow(null, ''),
  bank_swift: Joi.string().max(255).allow(null, ''),
  signatory_name: Joi.string().max(255).allow(null, ''),
  signatory_designation: Joi.string().max(255).allow(null, '')
});

export const companyProfileController = {
  get: async (req, res, next) => {
    try {
      const data = await companyProfileRepository.get();
      res.json({ data: data || {} });
    } catch (error) {
      next(error);
    }
  },

  update: async (req, res, next) => {
    try {
      const { error, value } = validator.validate(req.body, { abortEarly: false, stripUnknown: true });
      if (error) {
        return res.status(422).json({
          message: 'Validation failed',
          errors: error.details.reduce((acc, curr) => ({ ...acc, [curr.path[0]]: curr.message }), {})
        });
      }

      // Original ERP: CompanyProfileController::update() — a new logo
      // replaces and deletes the old file; no file means "leave it alone".
      if (req.file) {
        const existing = await companyProfileRepository.get();
        if (existing?.logo_path) {
          const oldPath = path.join(__dirname, '../../../public/storage', existing.logo_path);
          fs.unlink(oldPath, () => {});
        }
        value.logo_path = `company-profile/${req.file.filename}`;
      }

      await companyProfileRepository.update(value);
      const data = await companyProfileRepository.get();
      res.json({ message: 'Company Profile updated successfully', data });
    } catch (error) {
      next(error);
    }
  }
};
