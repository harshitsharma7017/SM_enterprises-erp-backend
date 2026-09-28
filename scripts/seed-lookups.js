import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../src/config/database.js';

/**
 * Starting values for the dropdown lookups — calculation bases, GST rates,
 * price bands, countries / states / cities, currencies, ports, incoterms,
 * payment terms, shipment methods, designations, supplier types and markup
 * presets. Ported from the original ERP's LookupSeeder, GeoSeeder,
 * SupplierLookupSeeder and DefaultMarkupSeeder (src/config/lookup-seed.json).
 *
 * Run after the migrations (payment_terms.has_split comes from 038).
 *
 * Insert-only and idempotent: a row whose natural key already exists is left
 * exactly as it is, so re-running never duplicates and never overwrites a
 * value the client has since edited.
 */
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const seed = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/config/lookup-seed.json'), 'utf-8'));

async function run() {
  const connection = await pool.getConnection();
  const counts = {};
  const insert = async (table, sql, params) => {
    const [result] = await connection.query(sql, params);
    counts[table] = (counts[table] || 0) + result.affectedRows;
  };
  try {
    await connection.beginTransaction();

    for (const b of seed.price_bands) {
      await insert('price_bands', "INSERT IGNORE INTO price_bands (code, name, status, created_at, updated_at) VALUES (?, ?, 'active', NOW(), NOW())", [b.code, b.name]);
    }
    for (const rate of seed.gst_rates) {
      await insert('gst_rates', "INSERT IGNORE INTO gst_rates (rate, status, created_at, updated_at) VALUES (?, 'active', NOW(), NOW())", [rate]);
    }
    for (const name of seed.calculation_bases) {
      await insert('calculation_bases', "INSERT IGNORE INTO calculation_bases (name, status, created_at, updated_at) VALUES (?, 'active', NOW(), NOW())", [name]);
    }
    for (const c of seed.countries) {
      await insert('countries', "INSERT IGNORE INTO countries (iso_code, name, dial_code, status, created_at, updated_at) VALUES (?, ?, ?, 'active', NOW(), NOW())", [c.iso_code, c.name, c.dial_code]);
    }
    for (const c of seed.currencies) {
      await insert('currencies', "INSERT IGNORE INTO currencies (iso_code, name, symbol, status, created_at, updated_at) VALUES (?, ?, ?, 'active', NOW(), NOW())", [c.iso_code, c.name, c.symbol]);
    }
    // ports.code has no unique key, so each row is guarded explicitly.
    for (const p of seed.ports) {
      await insert('ports', `INSERT INTO ports (country_id, code, name, type, status, created_at, updated_at)
        SELECT (SELECT id FROM countries WHERE iso_code = ?), ?, ?, ?, 'active', NOW(), NOW() FROM DUAL
        WHERE NOT EXISTS (SELECT 1 FROM ports WHERE code = ?)`, [p.country, p.code, p.name, p.type, p.code]);
    }
    for (const i of seed.incoterms) {
      await insert('incoterms', "INSERT IGNORE INTO incoterms (code, name, status, created_at, updated_at) VALUES (?, ?, 'active', NOW(), NOW())", [i.code, i.name]);
    }
    for (const t of seed.payment_terms) {
      await insert('payment_terms', "INSERT IGNORE INTO payment_terms (name, days, has_split, applies_to, status, created_at, updated_at) VALUES (?, ?, ?, ?, 'active', NOW(), NOW())", [t.name, t.days, t.has_split ? 1 : 0, t.applies_to]);
    }
    for (const name of seed.shipment_methods) {
      await insert('shipment_methods', "INSERT IGNORE INTO shipment_methods (name, status, created_at, updated_at) VALUES (?, 'active', NOW(), NOW())", [name]);
    }
    for (const name of seed.designations) {
      await insert('designations', "INSERT IGNORE INTO designations (name, status, created_at, updated_at) VALUES (?, 'active', NOW(), NOW())", [name]);
    }
    for (const t of seed.supplier_types) {
      await insert('supplier_types', "INSERT IGNORE INTO supplier_types (code, name, is_registered, status, created_at, updated_at) VALUES (?, ?, ?, 'active', NOW(), NOW())", [t.code, t.name, t.is_registered]);
    }
    for (const m of seed.default_markups) {
      await insert('default_markups', `INSERT INTO default_markups (name, markup_percent, status, created_at, updated_at)
        SELECT ?, ?, 'active', NOW(), NOW() FROM DUAL
        WHERE NOT EXISTS (SELECT 1 FROM default_markups WHERE name = ? AND deleted_at IS NULL)`, [m.name, m.markup_percent, m.name]);
    }

    // Country → state → city (countries above must exist first).
    for (const [iso, states] of Object.entries(seed.geo)) {
      const [[country]] = await connection.query('SELECT id FROM countries WHERE iso_code = ?', [iso]);
      if (!country) continue;
      for (const s of states) {
        await insert('states', "INSERT IGNORE INTO states (country_id, name, code, status, created_at, updated_at) VALUES (?, ?, ?, 'active', NOW(), NOW())", [country.id, s.name, s.code]);
        const [[state]] = await connection.query('SELECT id FROM states WHERE country_id = ? AND name = ?', [country.id, s.name]);
        for (const city of s.cities) {
          await insert('cities', "INSERT IGNORE INTO cities (state_id, name, status, created_at, updated_at) VALUES (?, ?, 'active', NOW(), NOW())", [state.id, city]);
        }
      }
    }

    await connection.commit();
    console.log('✅ Lookups seeded (rows added per table; 0 = already present):');
    Object.entries(counts).forEach(([table, n]) => console.log(`- ${table}: ${n}`));
  } catch (error) {
    await connection.rollback();
    console.error('❌ Rolled back:', error.message);
    process.exitCode = 1;
  } finally {
    connection.release();
    await pool.end();
  }
}

run();
