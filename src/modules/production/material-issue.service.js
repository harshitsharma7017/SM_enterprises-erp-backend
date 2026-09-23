import { pool } from '../../config/database.js';
import { materialIssueRepository } from './material-issue.repository.js';
import { inventoryRepository } from '../inventory/inventory.repository.js';
import { checkLot, nextMovementNo } from '../inventory/inventory.service.js';
import { numberSeriesService, financialYearFor } from '../../services/number-series.service.js';
import { quantity } from '../../services/quantity.service.js';
import { companyScope } from '../../services/company-scope.service.js';

const ISSUE_SERIES = { module: 'material_issue', prefix: 'MI/' };

const notFound = () => ({ status: 404, message: 'Material issue not found' });
const rejected = (message, errors) => ({ status: 422, message, errors });

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

const dateFor = (value) => {
  const [y, m, d] = String(value).slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
};

const blank = (v) => v === undefined || v === null || String(v).trim() === '';
const text = (v) => (blank(v) ? null : String(v).trim());
const idOrNull = (v) => (blank(v) ? null : Number(v));

/** Source location: exists, belongs to the issue's company, active. */
const checkLocation = async (executor, locationId, companyId) => {
  const location = await inventoryRepository.findLocation(executor, locationId);
  if (!location) throw rejected('Stock location not found.');
  if (location.company_id !== companyId) throw rejected(`Location ${location.code} belongs to a different company.`);
  if (location.status !== 'active') throw rejected(`Location ${location.code} is inactive.`);
  return location;
};

/** Receiver / supervisor / foreman must be existing, active users. */
const checkPeople = async (executor, data) => {
  const people = {
    receiver_user_id: idOrNull(data.receiver_user_id),
    supervisor_user_id: idOrNull(data.supervisor_user_id),
    foreman_user_id: idOrNull(data.foreman_user_id),
  };
  const ids = [...new Set(Object.values(people).filter((v) => v !== null))];
  const found = await materialIssueRepository.findUsers(executor, ids);
  for (const id of ids) {
    const user = found.find((u) => u.id === id);
    if (!user) throw rejected('A selected person is not an existing user.');
    if (!user.is_active) throw rejected(`${user.name} is not an active user.`);
  }
  return people;
};

/**
 * Validates issue lines against USABLE stock at the location: each lot a
 * received lot of a posted GRN, in the issue's company, quantity positive in
 * the lot's UOM precision and not above the lot's balance at the location.
 * `lots` maps lot id → lot row (locked when posting).
 */
const checkLines = async (executor, companyId, locationId, lines, lots) => {
  const errors = [];
  const seen = new Set();
  const output = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const label = `Line ${i + 1}`;
    const lot = lots[line.lot_id];
    if (!lot) {
      errors.push(`${label}: lot not found`);
      continue;
    }
    if (seen.has(lot.id)) {
      errors.push(`${label}: lot ${lot.lot_no} appears twice`);
      continue;
    }
    seen.add(lot.id);
    try {
      checkLot(lot);
    } catch (error) {
      errors.push(`${label}: ${error.message}`);
      continue;
    }
    if (lot.company_id !== companyId) {
      errors.push(`${label}: lot ${lot.lot_no} belongs to a different company`);
      continue;
    }
    const qtyError = quantity.validate(line.quantity, lot.uom_decimal_places, `${label}: quantity`);
    if (qtyError) {
      errors.push(qtyError);
      continue;
    }
    const totals = await inventoryRepository.lotTotals(executor, lot.id, locationId);
    const available = quantity.toMicro(totals.location_quantity);
    if (quantity.toMicro(line.quantity) > available) {
      errors.push(`${label}: issuing ${String(line.quantity).trim()} exceeds the ${quantity.fromMicro(Math.max(available, 0))}${lot.unit ? ` ${lot.unit}` : ''} of lot ${lot.lot_no} available at this location`);
      continue;
    }
    output.push({
      lot_id: lot.id,
      product_id: lot.product_id, // always the lot's product and receipt UOM
      uom_id: lot.uom_id,
      unit: lot.unit,
      quantity: String(line.quantity).trim(),
      remarks: text(line.remarks),
    });
  }
  if (errors.length > 0) throw rejected(`Material issue lines are invalid: ${errors.join('; ')}`, errors);
  return output;
};

const readLots = async (executor, lines) => {
  const lots = {};
  for (const line of lines) {
    const lot = await materialIssueRepository.findLot(executor, line.lot_id);
    if (lot) lots[lot.id] = lot;
  }
  return lots;
};

export const materialIssueService = {
  /** Locations and people for a company, or the usable stock at one location. */
  formData: async ({ company_id: companyId, location_id: locationId }) => {
    if (!blank(locationId)) {
      const stock = await inventoryRepository.findBalances({ location_id: locationId, limit: 500 });
      return { stock: stock.rows };
    }
    const locations = await inventoryRepository.findLocations({ company_id: companyId, status: 'active', limit: 500 });
    return { locations: locations.rows, users: await materialIssueRepository.findActiveUsers() };
  },

  /** Draft: validated against current stock, reserves nothing (posting re-checks under lock). */
  create: async (data, userId) => inTransaction(async (connection) => {
    const companyId = await companyScope.assertActiveCompany(data.company_id, connection);
    const location = await checkLocation(connection, data.location_id, companyId);
    const people = await checkPeople(connection, data);
    const lines = await checkLines(connection, companyId, location.id, data.items, await readLots(connection, data.items));

    const financialYear = financialYearFor(dateFor(data.issue_date));
    await numberSeriesService.ensure(connection, ISSUE_SERIES.module, ISSUE_SERIES.prefix, financialYear);
    const issueNo = await numberSeriesService.next(connection, ISSUE_SERIES.module, financialYear);
    const id = await materialIssueRepository.insertHeader(connection, {
      company_id: companyId,
      issue_no: issueNo,
      financial_year: financialYear,
      issue_date: data.issue_date,
      location_id: location.id,
      job_reference: text(data.job_reference),
      ...people,
      remarks: text(data.remarks),
      user_id: userId,
    });
    await materialIssueRepository.replaceLines(connection, id, lines);
    return id;
  }),

  /** Draft only; the company is fixed once created. */
  update: async (id, data, userId) => {
    await inTransaction(async (connection) => {
      const existing = await materialIssueRepository.lock(connection, id);
      if (!existing) throw notFound();
      if (existing.status !== 'draft') throw rejected(`A ${existing.status} material issue cannot be edited.`);
      if (!blank(data.company_id) && Number(data.company_id) !== existing.company_id) {
        throw rejected('The company of a material issue cannot be changed.');
      }
      const location = await checkLocation(connection, data.location_id, existing.company_id);
      const people = await checkPeople(connection, data);
      const lines = await checkLines(connection, existing.company_id, location.id, data.items, await readLots(connection, data.items));
      await materialIssueRepository.updateHeader(connection, id, {
        issue_date: data.issue_date,
        location_id: location.id,
        job_reference: text(data.job_reference),
        ...people,
        remarks: text(data.remarks),
        user_id: userId,
      });
      await materialIssueRepository.replaceLines(connection, id, lines);
    });
  },

  /**
   * draft → issued. Locks the issue, its lines and every lot (ascending id —
   * the Phase 7 rule: every stock change of a lot holds the lot lock), then
   * re-validates stock and writes one MATERIAL_ISSUE OUT movement per line.
   * A second post fails on status and, for any race, on the unique key.
   */
  post: async (id, userId) => {
    try {
      await inTransaction(async (connection) => {
        const existing = await materialIssueRepository.lock(connection, id);
        if (!existing) throw notFound();
        if (existing.status !== 'draft') throw rejected(`Only a draft material issue can be posted (this one is ${existing.status}).`);
        const saved = await materialIssueRepository.lockLines(connection, id);
        if (saved.length === 0) throw rejected('Add at least one line before posting.');
        if (!existing.receiver_user_id) throw rejected('Select who receives the material before posting.');

        const lots = {};
        for (const lotId of [...new Set(saved.map((l) => l.lot_id))].sort((a, b) => a - b)) {
          const lot = await inventoryRepository.lockLot(connection, lotId);
          if (lot) lots[lot.id] = lot;
        }
        await companyScope.assertActiveCompany(existing.company_id, connection);
        const location = await checkLocation(connection, existing.location_id, existing.company_id);
        await checkPeople(connection, existing);
        await checkLines(connection, existing.company_id, location.id, saved.map((l) => ({
          lot_id: l.lot_id, quantity: String(Number(l.quantity)), remarks: l.remarks,
        })), lots);

        for (const line of saved) {
          const lot = lots[line.lot_id];
          if (line.product_id !== lot.product_id || (line.uom_id ?? null) !== (lot.uom_id ?? null)) {
            throw rejected(`Line for lot ${lot.lot_no} no longer matches the lot's product/UOM.`);
          }
          const { financialYear, movementNo } = await nextMovementNo(connection, existing.issue_date);
          await inventoryRepository.insertMovement(connection, {
            company_id: existing.company_id,
            movement_no: movementNo,
            financial_year: financialYear,
            movement_date: String(existing.issue_date).slice(0, 10),
            movement_type: 'MATERIAL_ISSUE',
            direction: 'out',
            location_id: location.id,
            lot_id: lot.id,
            product_id: lot.product_id,
            uom_id: lot.uom_id,
            unit: lot.unit,
            quantity: String(Number(line.quantity)),
            source_type: 'material_issue',
            quality_inspection_id: null,
            material_issue_item_id: line.id,
            reason: null,
            remarks: text(existing.job_reference),
            created_by: userId,
          });
        }
        await materialIssueRepository.setIssued(connection, id, userId);
      });
    } catch (error) {
      if (error && error.code === 'ER_DUP_ENTRY' && /material_issue_item/.test(error.message)) {
        throw rejected('This material issue is already posted.');
      }
      throw error;
    }
  },

  /** Drafts only: a posted issue is in the immutable stock ledger (no reversal yet). */
  cancel: async (id, userId) => {
    await inTransaction(async (connection) => {
      const existing = await materialIssueRepository.lock(connection, id);
      if (!existing) throw notFound();
      if (existing.status === 'cancelled') throw rejected('This material issue is already cancelled.');
      if (existing.status !== 'draft') throw rejected('An issued material issue cannot be cancelled: its stock movements are immutable.');
      await materialIssueRepository.setCancelled(connection, id, userId);
    });
  },
};
