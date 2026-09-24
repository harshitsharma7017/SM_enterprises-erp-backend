import { reportRepository } from './report.repository.js';
import { REPORTS, findReport } from './report-definitions.js';
import { runPage, runExport, describe, parseCompany } from './report-runner.js';
import { traceLot } from './report-traceability.service.js';
import { rbacService } from '../../services/rbac.service.js';

const hasAll = async (userId, permissions) => (await Promise.all(permissions.map((p) => rbacService.hasPermission(userId, p)))).every(Boolean);

/**
 * A report needs report.view (report.export to export) AND the view
 * permission of the module whose data it shows — report access never widens
 * what a role can already see.
 */
const authorised = async (req, res, action) => {
  const def = findReport(req.params.key);
  if (!def) {
    res.status(404).json({ success: false, message: 'Report not found' });
    return null;
  }
  if (!(await hasAll(req.user.id, [action === 'export' ? 'report.export' : 'report.view', def.permission]))) {
    res.status(403).json({ success: false, message: 'Forbidden' });
    return null;
  }
  return def;
};

const fail = (res, next, error) => (error && error.status && !error.code ? res.status(error.status).json({ success: false, message: error.message }) : next(error));

export const reportController = {
  // Original ERP: neither ReportsController::index() nor ::outstanding() are
  // paginated lists — index() returns dashboard stat counts, outstanding()
  // returns the full (unpaginated) Purchase Order / Export Document sets with
  // computed totals. Matches that shape; both now need an explicit company_id.
  index: async (req, res, next) => {
    try {
      const data = await reportRepository.getIndex(await parseCompany(req.query.company_id));
      res.json({ data });
    } catch (error) {
      fail(res, next, error);
    }
  },

  outstanding: async (req, res, next) => {
    try {
      const data = await reportRepository.getOutstanding(await parseCompany(req.query.company_id));
      res.json({ data });
    } catch (error) {
      fail(res, next, error);
    }
  },

  // GET /api/reports/definitions — the reports this user may open
  definitions: async (req, res, next) => {
    try {
      const canExport = await rbacService.hasPermission(req.user.id, 'report.export');
      const visible = [];
      for (const def of REPORTS) {
        if (await rbacService.hasPermission(req.user.id, def.permission)) visible.push({ ...describe(def), can_export: canExport });
      }
      res.json({ success: true, data: visible });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/reports/data/:key?company_id=…&filters…&page=&limit=
  data: async (req, res, next) => {
    try {
      const def = await authorised(req, res, 'view');
      if (!def) return;
      const result = await runPage(def, req.query);
      res.json({ success: true, report: describe(def), data: result.rows, meta: { total: result.total, page: result.page, limit: result.limit } });
    } catch (error) {
      fail(res, next, error);
    }
  },

  // GET /api/reports/data/:key/export?company_id=…&filters… — same query and filters, every row, .xlsx
  export: async (req, res, next) => {
    try {
      const def = await authorised(req, res, 'export');
      if (!def) return;
      const { buffer } = await runExport(def, req.query);
      const stamp = new Date().toISOString().slice(0, 10);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${def.key}-report-${stamp}.xlsx"`);
      res.send(buffer);
    } catch (error) {
      fail(res, next, error);
    }
  },

  // GET /api/reports/data/:key/options?company_id= — filter choices for this report
  options: async (req, res, next) => {
    try {
      const def = await authorised(req, res, 'view');
      if (!def) return;
      const kinds = [...new Set(def.filters.map((f) => f.options).filter(Boolean))];
      res.json({ success: true, data: await reportRepository.findOptions(kinds, await parseCompany(req.query.company_id)) });
    } catch (error) {
      fail(res, next, error);
    }
  },

  // GET /api/reports/traceability?company_id=&lot= | &barcode=
  traceability: async (req, res, next) => {
    try {
      res.json({ success: true, data: await traceLot(req.query, req.user.id) });
    } catch (error) {
      fail(res, next, error);
    }
  },
};
