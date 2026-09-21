import fs from 'fs';
import { orderFormatRepository } from './order-format.repository.js';

// Reads a file's magic bytes to confirm it is actually a JPEG, PNG or WEBP,
// rather than trusting the client-supplied Content-Type header (which
// multer's fileFilter checks but which is trivially spoofable). Mirrors
// Laravel's `mimes:jpg,jpeg,png,webp` rule, which sniffs file content rather
// than the request metadata alone.
const detectImageMimeType = (filePath) => {
  const buffer = Buffer.alloc(12);
  let bytesRead = 0;
  const fd = fs.openSync(filePath, 'r');
  try {
    bytesRead = fs.readSync(fd, buffer, 0, 12, 0);
  } finally {
    fs.closeSync(fd);
  }

  if (bytesRead >= 3 && buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return 'image/jpeg';
  }
  if (bytesRead >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]))) {
    return 'image/png';
  }
  if (bytesRead >= 12 && buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') {
    return 'image/webp';
  }
  return null;
};

const parseField = (value) => {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
};

const validateCommon = async (req, res, isUpdate = false) => {
  // Parse fields that might be stringified due to multipart/form-data
  const body = req.body;
  const name = body.name;
  const description = body.description;
  const status = body.status;
  const allow_multiple_colours = body.allow_multiple_colours === 'true' || body.allow_multiple_colours === true;
  const delivery_details = body.delivery_details;
  const packing_details = body.packing_details;
  
  const units = parseField(body.units);
  const columns = parseField(body.columns);
  const column_order = parseField(body.column_order);
  const keep_images = parseField(body.keep_images);

  const errors = [];

  // Name
  if (!name || typeof name !== 'string' || name.trim() === '') {
    errors.push('Name is required');
  } else if (name.length > 120) {
    errors.push('Name cannot exceed 120 characters');
  } else {
    const ignoreId = isUpdate ? req.params.id : null;
    const exists = await orderFormatRepository.nameExists(name.trim(), ignoreId);
    if (exists) {
      errors.push('A format with this name already exists.');
    }
  }

  // Description
  if (description !== undefined && description !== null) {
    if (typeof description !== 'string' || description.length > 1000) {
      errors.push('Description cannot exceed 1000 characters');
    }
  }

  // Status
  if (!status || !['active', 'inactive'].includes(status)) {
    errors.push('Status must be either active or inactive');
  }

  // Units
  if (!units || !Array.isArray(units) || units.length === 0) {
    errors.push('Add at least one unit — a price column needs something to be priced per.');
  } else if (units.length > 20) {
    errors.push('Cannot exceed 20 units');
  } else {
    const unitRegex = /^[a-zA-Z0-9 .\\/-]+$/;
    for (const u of units) {
      if (typeof u !== 'string' || u.length > 20 || !unitRegex.test(u)) {
        errors.push('A unit may contain letters, numbers, spaces and . / - only.');
        break;
      }
    }
  }

  // Columns & Column Order
  if (!columns || typeof columns !== 'object' || Array.isArray(columns)) {
    errors.push('Columns must be a valid object configuration');
  } else if (!column_order || !Array.isArray(column_order) || column_order.length === 0) {
    errors.push('Column order is required');
  } else {
    let enabledCount = 0;
    for (const key of column_order) {
      const col = columns[key];
      if (!col) {
        errors.push(`Missing configuration for column ${key}`);
        continue;
      }
      if (!col.label || typeof col.label !== 'string' || col.label.trim() === '' || col.label.length > 60) {
        errors.push(`Label for column ${key} must be a valid string under 60 characters`);
      }
      if (String(col.enabled) === 'true') {
        enabledCount++;
      }
    }
    
    if (enabledCount === 0) {
      errors.push('Keep at least one column — the item table would otherwise be empty.');
    }
  }

  // Delivery & Packing
  if (delivery_details && delivery_details.length > 2000) errors.push('Delivery details cannot exceed 2000 characters');
  if (packing_details && packing_details.length > 2000) errors.push('Packing details cannot exceed 2000 characters');

  // Newly uploaded images only — Laravel's `images` rule (`max:10`) caps the
  // files submitted in this request; `keep_images` (already-saved images) is
  // uncapped, matching `'keep_images' => ['nullable', 'array']`.
  const newImagesCount = req.files ? req.files.length : 0;
  if (newImagesCount > 10) {
    errors.push('Cannot exceed a maximum of 10 images');
  }

  // Content-based type check on each newly uploaded file — rejects anything
  // whose actual bytes aren't a JPEG/PNG/WEBP, regardless of what Content-Type
  // the client claimed. Invalid files are removed immediately since they were
  // already written to disk by multer before this validator ran.
  if (req.files && req.files.length > 0) {
    for (const file of req.files) {
      if (!detectImageMimeType(file.path)) {
        errors.push(`File "${file.originalname}" is not a valid JPG, PNG or WEBP image.`);
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      }
    }
  }

  // Write parsed values back to body for the controller
  req.body.units = units;
  req.body.columns = columns;
  req.body.column_order = column_order;
  req.body.keep_images = Array.isArray(keep_images) ? keep_images : [];
  req.body.allow_multiple_colours = allow_multiple_colours;

  return errors;
};

export const orderFormatValidator = {
  validateStore: async (req, res, next) => {
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

  validateUpdate: async (req, res, next) => {
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
