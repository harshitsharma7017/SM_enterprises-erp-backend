import { IMPORTS, findImport } from './import-definitions.js';
import { importService, MAX_IMPORT_ROWS } from './import.service.js';
import { rbacService } from '../../services/rbac.service.js';

const describe = (def) => ({ key: def.key, title: def.title, columns: def.columns, example: def.example, grouped: Boolean(def.grouped), max_rows: MAX_IMPORT_ROWS });

/** report.import (route) AND the entity's own create permission. */
const authorised = async (req, res) => {
  const def = findImport(req.params.entity);
  if (!def) {
    res.status(404).json({ success: false, message: 'No import exists for this record type.' });
    return null;
  }
  if (!(await rbacService.hasPermission(req.user.id, def.permission))) {
    res.status(403).json({ success: false, message: 'Forbidden' });
    return null;
  }
  return def;
};

const fileOf = (req, res) => {
  if (!req.file) {
    res.status(422).json({ success: false, message: 'Choose an .xlsx file to upload.' });
    return null;
  }
  return req.file.buffer;
};

const fail = (res, next, error) => {
  if (error && error.status && !error.code) {
    const { status, message, ...extra } = error;
    return res.status(status).json({ success: false, message, ...extra });
  }
  return next(error);
};

export const importController = {
  // GET /api/imports — the imports this user may run
  index: async (req, res, next) => {
    try {
      const visible = [];
      for (const def of IMPORTS) if (await rbacService.hasPermission(req.user.id, def.permission)) visible.push(describe(def));
      res.json({ success: true, data: visible });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/imports/:entity/template
  template: async (req, res, next) => {
    try {
      const def = await authorised(req, res);
      if (!def) return;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${def.key}-import-template.xlsx"`);
      res.send(importService.template(def));
    } catch (error) {
      next(error);
    }
  },

  // POST /api/imports/:entity/preview (multipart: file, company_id) — validation only
  preview: async (req, res, next) => {
    try {
      const def = await authorised(req, res);
      if (!def) return;
      const buffer = fileOf(req, res);
      if (!buffer) return;
      res.json({ success: true, data: await importService.preview(def, buffer, req.body?.company_id) });
    } catch (error) {
      fail(res, next, error);
    }
  },

  // POST /api/imports/:entity/confirm (multipart: the same file, company_id) — all rows or none
  confirm: async (req, res, next) => {
    try {
      const def = await authorised(req, res);
      if (!def) return;
      const buffer = fileOf(req, res);
      if (!buffer) return;
      const result = await importService.confirm(def, buffer, req.body?.company_id, req.user.id);
      res.status(201).json({ success: true, message: `${result.created} ${def.title.toLowerCase()} imported.`, data: result });
    } catch (error) {
      fail(res, next, error);
    }
  },
};
