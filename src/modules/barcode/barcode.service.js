import crypto from 'crypto';
import { pool } from '../../config/database.js';
import { barcodeRepository } from './barcode.repository.js';
import { lotRepository } from '../lot/lot.repository.js';
import { inventoryRepository } from '../inventory/inventory.repository.js';
import { companyScope } from '../../services/company-scope.service.js';
import { rbacService } from '../../services/rbac.service.js';

// Crockford base32 (no I, L, O, U): unambiguous when read off a sticker or typed.
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const VALUE_LENGTH = 11;
const MAX_ATTEMPTS = 5;

const notFound = (message = 'Barcode not found') => ({ status: 404, message });
const rejected = (message) => ({ status: 422, message });

const inTransaction = async (work) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await work(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const blank = (v) => v === undefined || v === null || String(v).trim() === '';

/** "L" + 11 random base32 characters: random rather than sequential, so a value reveals nothing about other lots. */
export const generateValue = () => `L${Array.from({ length: VALUE_LENGTH }, () => ALPHABET[crypto.randomInt(ALPHABET.length)]).join('')}`;

/** Scanners and people may send lower case or stray spaces; values are stored upper case. */
export const normaliseValue = (value) => String(value ?? '').trim().toUpperCase();

/**
 * The lot behind a barcode, as the lot module reports it (the lot stays
 * authoritative), its stock per location, and — only for users allowed to
 * see them — the PIs of the orders it is allocated to and the invoices it
 * appears on.
 */
const lotContext = async (lotId, userId) => {
  const lot = await lotRepository.findById(lotId);
  const stockByLocation = await inventoryRepository.findLotBalances(lotId);
  const [canPi, canInvoice] = await Promise.all([
    rbacService.hasPermission(userId, 'proforma-invoice.view'),
    rbacService.hasPermission(userId, 'invoice.view'),
  ]);
  const ocIds = [...new Set((lot.order_allocations || []).map((a) => a.order_confirmation_id))];
  return {
    lot,
    stock_by_location: stockByLocation,
    commercial: {
      proforma_invoices: canPi ? await barcodeRepository.findOrderProformas(ocIds) : null,
      invoices: canInvoice ? await barcodeRepository.findLotInvoices(lotId) : null,
    },
  };
};

export const barcodeService = {
  lotContext,

  formData: async ({ company_id: companyId, search }) => {
    const id = Number(companyId);
    if (!Number.isInteger(id) || id <= 0) throw rejected('company_id is required');
    return { lots: await barcodeRepository.findEligibleLots(id, search) };
  },

  /**
   * One active barcode per received lot. Locks the lot so concurrent
   * requests for the same lot serialise (the unique active-lot key backs
   * this up); a value collision simply draws a new value.
   */
  create: async ({ lot_id: lotId, company_id: companyId }, userId) => {
    try {
      return await inTransaction(async (connection) => {
        const lot = await barcodeRepository.lockLot(connection, lotId);
        if (!lot) throw rejected('Lot not found.');
        if (!blank(companyId) && Number(companyId) !== lot.company_id) throw rejected(`Lot ${lot.lot_no} belongs to a different company.`);
        if (lot.status !== 'received') throw rejected(`Lot ${lot.lot_no} is ${lot.status}; only a received lot can be barcoded.`);
        if (lot.product_deleted_at || (lot.product_company_id !== null && lot.product_company_id !== lot.company_id)) {
          throw rejected(`The material of lot ${lot.lot_no} is not a product of its company.`);
        }
        await companyScope.assertActiveCompany(lot.company_id, connection);
        const existing = await barcodeRepository.findActiveForLot(connection, lot.id);
        if (existing) throw rejected(`Lot ${lot.lot_no} already has barcode ${existing.barcode_value}; retire it before generating a new one.`);
        for (let attempt = 1; ; attempt++) {
          try {
            return await barcodeRepository.insert(connection, { company_id: lot.company_id, barcode_value: generateValue(), lot_id: lot.id, user_id: userId });
          } catch (error) {
            if (error.code !== 'ER_DUP_ENTRY' || !/barcode_value_unique/.test(error.message) || attempt >= MAX_ATTEMPTS) throw error;
          }
        }
      });
    } catch (error) {
      if (error && error.code === 'ER_DUP_ENTRY' && /active_lot_unique/.test(error.message)) throw rejected('This lot already has an active barcode.');
      throw error;
    }
  },

  /** A damaged / lost sticker: the barcode stays in history (and still resolves as retired) but no longer identifies the lot. */
  retire: async (id, reason, userId) => {
    await inTransaction(async (connection) => {
      const barcode = await barcodeRepository.lock(connection, id);
      if (!barcode) throw notFound();
      if (barcode.status !== 'active') throw rejected('This barcode is already retired.');
      if (blank(reason)) throw rejected('A reason is required to retire a barcode.');
      await barcodeRepository.setRetired(connection, id, String(reason).trim(), userId);
    });
  },

  /**
   * Identify a scanned value in the company the user is working in. Every
   * scan is recorded. An unknown value and another company's value give the
   * same 404 (nothing leaks). A known value returns the lot and marks whether
   * this barcode was already scanned in the same context (duplicate) — the
   * barcode row is locked, so exactly one concurrent scan is the first.
   * Scanning changes no stock and no status.
   */
  scan: async ({ barcode, company_id: companyId, context = 'lookup', location_id: locationId }, userId) => {
    const value = normaliseValue(barcode);
    if (!value) throw rejected('Scan or enter a barcode.');
    const company = await companyScope.assertActiveCompany(companyId);
    let location = null;
    if (!blank(locationId)) {
      location = await inventoryRepository.findLocation(pool, locationId);
      if (!location || location.company_id !== company) throw rejected('The stock location does not belong to this company.');
    }
    const outcome = await inTransaction(async (connection) => {
      const row = await barcodeRepository.lockByValue(connection, value);
      const base = { company_id: company, barcode_value: value, context, location_id: location ? location.id : null, user_id: userId };
      if (!row || row.company_id !== company) {
        const scanId = await barcodeRepository.insertScan(connection, { ...base, barcode_id: null, lot_id: null, result: 'not_found', is_duplicate: false, previous_scan_id: null });
        return { result: 'not_found', scanId };
      }
      if (row.status !== 'active') {
        const scanId = await barcodeRepository.insertScan(connection, { ...base, barcode_id: row.id, lot_id: row.lot_id, result: 'retired', is_duplicate: false, previous_scan_id: null });
        return { result: 'retired', scanId, barcode: row };
      }
      const previous = await barcodeRepository.findPreviousScan(connection, row.id, context);
      const scanId = await barcodeRepository.insertScan(connection, { ...base, barcode_id: row.id, lot_id: row.lot_id, result: 'found', is_duplicate: !!previous, previous_scan_id: previous ? previous.id : null });
      return { result: 'found', scanId, barcode: row, previous };
    });

    if (outcome.result === 'not_found') {
      const error = notFound('Barcode not recognised in this company.');
      error.scan_id = outcome.scanId;
      throw error;
    }
    if (outcome.result === 'retired') {
      const active = await barcodeRepository.findActiveForLot(pool, outcome.barcode.lot_id);
      const error = rejected(`Barcode ${value} was retired${outcome.barcode.retirement_reason ? ` (${outcome.barcode.retirement_reason})` : ''}${active ? `; the lot's current barcode is ${active.barcode_value}` : ''}.`);
      error.scan_id = outcome.scanId;
      throw error;
    }
    const scan = await barcodeRepository.findScan(outcome.scanId);
    const previous = outcome.previous ? await barcodeRepository.findScan(outcome.previous.id) : null;
    const [[{ context_scans: contextScans }]] = await pool.query(
      "SELECT COUNT(*) AS context_scans FROM barcode_scans WHERE barcode_id = ? AND context = ? AND result = 'found'",
      [outcome.barcode.id, context]
    );
    const detail = await lotContext(outcome.barcode.lot_id, userId);
    return {
      result: 'found',
      first_scan: !previous,
      duplicate: !!previous,
      scan,
      previous_scan: previous,
      context_scans_count: contextScans,
      barcode: await barcodeRepository.findById(pool, outcome.barcode.id),
      ...detail,
      stock_at_location: location ? (detail.stock_by_location.find((b) => b.location_id === location.id)?.quantity ?? 0) : null,
    };
  },
};
