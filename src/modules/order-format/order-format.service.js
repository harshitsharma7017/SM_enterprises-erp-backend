import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../../config/database.js';
import { orderFormatRepository } from './order-format.repository.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// This file lives 3 levels under the project root (src/modules/order-format),
// so reaching public/storage/order-formats needs 3 levels of "..", not 2 —
// matching where upload.middleware.js (2 levels under root) actually writes
// files. Getting this wrong means post-commit cleanup silently no-ops:
// fs.existsSync() on the miscomputed path is always false.
const STORAGE_DIR = path.join(__dirname, '../../../public/storage/order-formats');

const STANDARD_COLUMNS = {
  'supplier':    { label: 'Supplier',          print_only: false },
  'design_no':   { label: 'Design No. / Name', print_only: false },
  'product':     { label: 'Product Name',      print_only: false },
  'colour':      { label: 'Colour',            print_only: false },
  'size':        { label: 'Size',              print_only: false },
  'unit':        { label: 'Unit',              print_only: false },
  'price':       { label: 'Price',             print_only: false },
  'image':       { label: 'Image',             print_only: true }
};

const DEFAULT_UNITS = ['PCS', 'SET', 'MTR', 'KGS', 'PAIR', 'DOZ'];

// Removes already-committed-obsolete physical files. Must only be called
// after the owning DB transaction has successfully committed, since a
// filesystem failure here cannot roll back a committed transaction.
const cleanupFiles = (filePaths) => {
  for (const filePath of filePaths) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (err) {
      console.error(`[order-format] Failed to remove physical file after commit: ${filePath}`, err);
    }
  }
};

export const orderFormatService = {

  getDefaults: () => {
    const columns = {};
    for (const [key, meta] of Object.entries(STANDARD_COLUMNS)) {
      columns[key] = {
        label: meta.label,
        enabled: true,
        mandatory: false,
        print_only: meta.print_only,
        sub_columns: []
      };
    }
    return { columns, units: DEFAULT_UNITS };
  },

  findAll: async (filters) => {
    return await orderFormatRepository.findAll(filters);
  },

  findById: async (id) => {
    return await orderFormatRepository.findByIdIncludingRequiredRelations(id);
  },

  create: async (data, files, userId) => {
    let connection;
    try {
      connection = await pool.getConnection();
      await connection.beginTransaction();

      const payload = {
        name: data.name,
        description: data.description,
        status: data.status,
        allow_multiple_colours: data.allow_multiple_colours,
        delivery_details: data.delivery_details,
        packing_details: data.packing_details,
        created_by: userId,
        updated_by: userId
      };

      const formatId = await orderFormatRepository.create(connection, payload);

      const filesToDeleteAfterCommit = [];

      await orderFormatService.syncUnits(connection, formatId, data.units || []);
      await orderFormatService.syncColumns(connection, formatId, data);
      await orderFormatService.syncImages(connection, formatId, files || [], [], filesToDeleteAfterCommit);

      await connection.commit();

      // Existing physical files are only ever removed after a successful commit.
      cleanupFiles(filesToDeleteAfterCommit);

      return await orderFormatRepository.findByIdIncludingRequiredRelations(formatId);
    } catch (error) {
      if (connection) await connection.rollback();
      // Filesystem cleanup for orphaned uploads on DB error
      if (files && files.length > 0) {
        files.forEach(f => {
          if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
        });
      }
      throw error;
    } finally {
      if (connection) connection.release();
    }
  },

  update: async (id, data, files, keepImages, userId) => {
    let connection;
    try {
      connection = await pool.getConnection();
      await connection.beginTransaction();

      const existing = await orderFormatRepository.findById(id);
      if (!existing) {
        throw { status: 404, message: 'Format not found' };
      }

      const payload = {
        name: data.name,
        description: data.description,
        status: data.status,
        allow_multiple_colours: data.allow_multiple_colours,
        delivery_details: data.delivery_details,
        packing_details: data.packing_details,
        updated_by: userId
      };

      await orderFormatRepository.update(connection, id, payload);

      const filesToDeleteAfterCommit = [];

      await orderFormatService.syncUnits(connection, id, data.units || []);
      await orderFormatService.syncColumns(connection, id, data);
      await orderFormatService.syncImages(connection, id, files || [], keepImages || [], filesToDeleteAfterCommit);

      await connection.commit();

      // Existing physical files are only ever removed after a successful commit.
      cleanupFiles(filesToDeleteAfterCommit);

      return await orderFormatRepository.findByIdIncludingRequiredRelations(id);
    } catch (error) {
      if (connection) await connection.rollback();
      // Filesystem cleanup for new uploads on DB error
      if (files && files.length > 0) {
        files.forEach(f => {
          if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
        });
      }
      throw error;
    } finally {
      if (connection) connection.release();
    }
  },

  syncUnits: async (connection, id, units) => {
    await orderFormatRepository.deleteUnits(connection, id);

    // Normalize units
    let normalized = units
      .map(u => String(u).trim().toUpperCase())
      .filter(u => u !== '');
    
    normalized = [...new Set(normalized)]; // deduplicate

    for (let i = 0; i < normalized.length; i++) {
      await orderFormatRepository.insertUnit(connection, id, normalized[i], i);
    }
  },

  syncColumns: async (connection, id, data) => {
    await orderFormatRepository.deleteColumns(connection, id);

    const posted = data.columns || {};
    const order = data.column_order || Object.keys(posted);

    const used = [];
    let sortOrder = 0;

    for (const clientKey of order) {
      const row = posted[clientKey] || {};
      const isStandard = Object.prototype.hasOwnProperty.call(STANDARD_COLUMNS, clientKey);

      let key, label, printOnly, isCustom;

      if (isStandard) {
        const defaults = STANDARD_COLUMNS[clientKey];
        key = clientKey;
        label = (row.label && row.label.trim() !== '') ? row.label.trim() : defaults.label;
        printOnly = defaults.print_only;
        isCustom = false;
      } else if (row.is_custom !== undefined && row.is_custom !== null && String(row.is_custom) === 'true') {
        label = (row.label || '').trim();
        if (label === '') continue;

        key = orderFormatService.uniqueKey(label, used);
        printOnly = false;
        isCustom = true;
      } else {
        continue;
      }

      used.push(key);

      const isEnabled = String(row.enabled) === 'true';
      const isMandatory = String(row.mandatory) === 'true';

      const colData = {
        key,
        label,
        is_enabled: isEnabled,
        is_mandatory: isMandatory,
        is_custom: isCustom,
        print_only: printOnly,
        sub_columns: orderFormatService.parseSubColumns(row.sub_columns),
        sort_order: sortOrder++
      };

      await orderFormatRepository.insertColumn(connection, id, colData);
    }

    // Ensure all standard columns exist (even if not posted)
    for (const [key, defaults] of Object.entries(STANDARD_COLUMNS)) {
      if (used.includes(key)) continue;

      const colData = {
        key,
        label: defaults.label,
        is_enabled: false,
        is_mandatory: false,
        is_custom: false,
        print_only: defaults.print_only,
        sub_columns: null,
        sort_order: sortOrder++
      };

      await orderFormatRepository.insertColumn(connection, id, colData);
    }
  },

  parseSubColumns: (raw) => {
    if (!raw || typeof raw !== 'string' || raw.trim() === '') return null;
    let tags = raw.split(',').map(t => t.trim()).filter(t => t !== '');
    tags = [...new Set(tags)];
    return tags.length > 0 ? tags : null;
  },

  uniqueKey: (label, used) => {
    let base = label.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 30);
    // Trim trailing/leading underscores
    base = base.replace(/^_+|_+$/g, '');
    if (base === '') base = 'column';

    let key = base;
    let n = 2;

    while (used.includes(key)) {
      key = `${base}_${n}`;
      n++;
    }

    return key;
  },

  syncImages: async (connection, id, newFiles, keepImages, filesToDeleteAfterCommit = []) => {
    // Determine which images to keep and which to delete
    const existingImages = await orderFormatRepository.getImages(connection, id);

    // keepImages should be an array of integers (IDs to keep)
    const keepIds = keepImages.map(k => parseInt(k, 10));

    // Images not kept: remove their DB rows now, but only queue their
    // physical files for deletion after the transaction commits, so a
    // later rollback leaves the existing files untouched.
    const imagesToDelete = existingImages.filter(img => !keepIds.includes(img.id));

    for (const img of imagesToDelete) {
      // Find full physical path
      // Because we store relatively or just filename, assuming path is just the filename for simplicity
      // based on how multer configured it. Wait, multer gives full absolute path or relative depending on config.
      // Laravel uses 'order-formats/filename'. Let's store just the filename relative to /storage/order-formats.
      const filePath = path.join(STORAGE_DIR, path.basename(img.path));
      filesToDeleteAfterCommit.push(filePath);
    }

    await orderFormatRepository.deleteImageRows(connection, id, keepIds.length > 0 ? keepIds : [-1]);

    let order = await orderFormatRepository.getMaxImageSortOrder(connection, id);

    for (const file of newFiles) {
      // file.filename comes from multer
      const relativePath = `order-formats/${file.filename}`;
      order++;
      await orderFormatRepository.insertImage(connection, id, relativePath, file.originalname, order);
    }
  },

  canDelete: async (id) => {
    const categoryCount = await orderFormatRepository.countCategories(id);
    if (categoryCount > 0) {
      return {
        allowed: false,
        reason: `This format is linked to ${categoryCount} category/categories. Remove it from them first.`
      };
    }
    return { allowed: true, reason: null };
  },

  delete: async (id) => {
    let connection;
    try {
      connection = await pool.getConnection();
      await connection.beginTransaction();

      const existing = await orderFormatRepository.findById(id);
      if (!existing) {
        throw { status: 404, message: 'Format not found' };
      }

      const check = await orderFormatService.canDelete(id);
      if (!check.allowed) {
        throw { status: 400, message: check.reason };
      }

      // Queue existing physical images for deletion, but do not remove them
      // from disk until the transaction has successfully committed.
      const images = await orderFormatRepository.getImages(connection, id);
      const filesToDeleteAfterCommit = images.map(img =>
        path.join(STORAGE_DIR, path.basename(img.path))
      );

      await orderFormatRepository.deleteImageRows(connection, id);
      await orderFormatRepository.softDelete(connection, id);

      await connection.commit();

      // Existing physical files are only ever removed after a successful commit.
      cleanupFiles(filesToDeleteAfterCommit);
    } catch (error) {
      if (connection) await connection.rollback();
      throw error;
    } finally {
      if (connection) connection.release();
    }
  },

  toggleStatus: async (id, userId) => {
    const existing = await orderFormatRepository.findById(id);
    if (!existing) {
      throw { status: 404, message: 'Format not found' };
    }

    const newStatus = existing.status === 'active' ? 'inactive' : 'active';
    await orderFormatRepository.toggleStatus(id, newStatus, userId);
    
    return await orderFormatRepository.findByIdIncludingRequiredRelations(id);
  }
};
