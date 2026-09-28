import { companyProfileRepository } from './company-profile.repository.js';
import { storage } from '../../services/storage.service.js';
import Joi from 'joi';

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
      // The file is written only now, after validation passed; the old logo
      // is removed only once the new path is saved.
      let oldLogo = null;
      if (req.file) {
        const existing = await companyProfileRepository.get();
        oldLogo = existing?.logo_path || null;
        value.logo_path = storage.newKey('company-profile', 'logo', req.file.originalname);
        await storage.put(value.logo_path, req.file.buffer, req.file.mimetype);
      }

      try {
        await companyProfileRepository.update(value);
      } catch (error) {
        if (req.file) await storage.remove(value.logo_path);
        throw error;
      }
      if (oldLogo && oldLogo !== value.logo_path) await storage.remove(oldLogo);
      const data = await companyProfileRepository.get();
      res.json({ message: 'Company Profile updated successfully', data });
    } catch (error) {
      next(error);
    }
  }
};
