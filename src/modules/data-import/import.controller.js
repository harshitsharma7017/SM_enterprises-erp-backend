import { IMPORTS, findImport } from './import-definitions.js';
import { importService, MAX_IMPORT_ROWS } from './import.service.js';
import { rbacService } from '../../services/rbac.service.js';

// Fixed choices are listed; a database-backed list is only flagged (`lookup`), its values are in the template.
const describe = (def) => ({
  key: def.key, title: def.title, example: def.example, grouped: Boolean(def.grouped),
  columns: def.columns.map(({ options, ...c }) => ({ ...c, ...(Array.isArray(options) ? { options } : options ? { lookup: true } : {}) })),
  company_scoped: def.companyScoped !== false, max_rows: MAX_IMPORT_ROWS,
});

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

  // GET /api/imports/:entity/template?company_id= (company only for per-company imports)
  template: async (req, res, next) => {
    try {
      const def = await authorised(req, res);
      if (!def) return;
      // The drop-downs list this company's records, so a per-company template needs one.
      const buffer = await importService.template(def, req.query.company_id);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${def.key}-import-template.xlsx"`);
      res.send(buffer);
    } catch (error) {
      fail(res, next, error);
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

  // POST /api/imports/:entity/confirm (multipart: the same file, company_id, skip_rows = "3,7,12")
  // — every row not excluded, or none
  confirm: async (req, res, next) => {
    try {
      const def = await authorised(req, res);
      if (!def) return;
      const buffer = fileOf(req, res);
      if (!buffer) return;
      const skipRows = String(req.body?.skip_rows || '').split(',').map((n) => Number(n.trim())).filter((n) => Number.isInteger(n) && n > 1);
      const result = await importService.confirm(def, buffer, req.body?.company_id, req.user.id, { skipRows });
      const skippedNote = result.skipped ? ` ${result.skipped} row(s) left out.` : '';
      res.status(201).json({ success: true, message: `${result.created} ${def.title.toLowerCase()} imported.${skippedNote}`, data: result });
    } catch (error) {
      fail(res, next, error);
    }
  },
};
