/**
 * Lot traceability report: finds one lot (by lot number or barcode) in ONE
 * company and returns the existing trace — nothing is re-derived:
 *   barcodeService.lotContext → lot module (GRN → PO → supplier → requirement /
 *   projection, QC, material issues → processing, finished lot → processing →
 *   issue → source lots, allocations → orders, dispatches) + stock per
 *   location + PIs / invoices (only with those permissions).
 * The one addition is the forward step raw lot → processing → finished lot,
 * read through the existing lots.processing_record_id link. A report lookup
 * is not a scan, so nothing is written to the scan history.
 */
import { pool } from '../../config/database.js';
import { barcodeService, normaliseValue } from '../barcode/barcode.service.js';
import { rbacService } from '../../services/rbac.service.js';
import { parseCompany } from './report-runner.js';

const rejected = (status, message) => ({ status, message });
const blank = (v) => v === undefined || v === null || String(v).trim() === '';

export const traceLot = async ({ company_id: companyId, lot, barcode }, userId) => {
  const scope = await parseCompany(companyId);
  if (!scope.id) throw rejected(422, 'Select one company to trace a lot.');
  if (blank(lot) === blank(barcode)) throw rejected(422, 'Enter a lot number or a barcode.');

  let lotId = null;
  let foundBy = null;
  if (!blank(barcode)) {
    if (!(await rbacService.hasPermission(userId, 'barcode.view'))) throw rejected(403, 'Forbidden');
    const [[row]] = await pool.query('SELECT id, lot_id, status FROM barcodes WHERE barcode_value = ? AND company_id = ?', [normaliseValue(barcode), scope.id]);
    if (row) {
      lotId = row.lot_id;
      foundBy = { type: 'barcode', barcode_id: row.id, barcode_status: row.status };
    }
  } else {
    const [[row]] = await pool.query('SELECT id FROM lots WHERE lot_no = ? AND company_id = ?', [String(lot).trim(), scope.id]);
    if (row) {
      lotId = row.id;
      foundBy = { type: 'lot' };
    }
  }
  // Another company's lot / barcode is indistinguishable from an unknown one.
  if (!lotId) throw rejected(404, 'No such lot or barcode in this company.');

  const context = await barcodeService.lotContext(lotId, userId);
  const [finishedLots] = await pool.query(`
    SELECT DISTINCT ol.id, ol.lot_no, ol.quantity, ol.unit, ol.status, pr.id AS processing_record_id, pr.processing_no
    FROM processing_record_items pri
    JOIN processing_records pr ON pr.id = pri.processing_record_id
    JOIN lots ol ON ol.processing_record_id = pr.id
    WHERE pri.lot_id = ?
    ORDER BY ol.id`, [lotId]);
  return { found_by: foundBy, ...context, finished_lots: finishedLots };
};
