import { pool } from '../../config/database.js';
import { categoryRepository } from './category.repository.js';

const validateCommon = async (req, res, isUpdate = false) => {
  const { name, status, remarks, format_ids } = req.body;
  const errors = [];

  // Name
  if (!name || typeof name !== 'string' || name.trim() === '') {
    errors.push('Name is required');
  } else if (name.length > 120) {
    errors.push('Name cannot exceed 120 characters');
  } else {
    // Uniqueness check (matching Laravel: does not ignore soft deletes)
    const ignoreId = isUpdate ? req.params.id : null;
    const exists = await categoryRepository.nameExists(name, ignoreId);
    if (exists) {
      errors.push('A category with this name already exists.');
    }
  }

  // Status
  if (!status || !['active', 'inactive'].includes(status)) {
    errors.push('Status must be either active or inactive');
  }

  // Remarks
  if (remarks !== undefined && remarks !== null) {
    if (typeof remarks !== 'string') {
      errors.push('Remarks must be a string');
    } else if (remarks.length > 1000) {
      errors.push('Remarks cannot exceed 1000 characters');
    }
  }

  // Format IDs
  if (format_ids !== undefined && format_ids !== null) {
    if (!Array.isArray(format_ids)) {
      errors.push('Format IDs must be an array');
    } else if (format_ids.length > 0) {
      // Check if all are integers
      const allInts = format_ids.every(id => Number.isInteger(id));
      if (!allInts) {
        errors.push('Format IDs must be integers');
      } else {
        // Check if all exist in document_formats
        const [rows] = await pool.query('SELECT id FROM document_formats WHERE id IN (?)', [format_ids]);
        const foundIds = rows.map(r => r.id);
        const allExist = format_ids.every(id => foundIds.includes(id));
        if (!allExist) {
          errors.push('One or more selected formats are invalid.');
        }
      }
    }
  }

  return errors;
};

export const categoryValidator = {
  validateStoreCategory: async (req, res, next) => {
    try {
      const errors = await validateCommon(req, res, false);
      
      if (errors.length > 0) {
        return res.status(400).json({ success: false, message: 'Validation failed', errors });
      }
      
      next();
    } catch (error) {
      next(error);
    }
  },

  validateUpdateCategory: async (req, res, next) => {
    try {
      const errors = await validateCommon(req, res, true);
      
      if (errors.length > 0) {
        return res.status(400).json({ success: false, message: 'Validation failed', errors });
      }
      
      next();
    } catch (error) {
      next(error);
    }
  }
};
