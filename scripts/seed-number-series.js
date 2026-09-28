import { pool } from '../src/config/database.js';

/**
 * One counter per module that generates its own codes without a financial year.
 * Replicates the original Laravel NumberSeriesSeeder.
 *
 * Insert-only: re-running must never reset current_number, or the next save
 * hands out a code that already exists. The unique key on (module,
 * financial_year) does not stop duplicates when financial_year is NULL, so
 * each row is guarded with NOT EXISTS.
 *
 * Financial-year series (inquiry, oc, po, inward, export, brand_projection...)
 * are created on demand by their services, so they are not seeded here.
 */
const SERIES = [
  { module: 'category', prefix: 'CAT', padding: 3 }, // CAT001
  { module: 'buyer', prefix: 'BUY', padding: 2 },    // BUY01 — 5 chars, the sheet's max length
];

async function runSeed() {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    let inserted = 0;
    for (const row of SERIES) {
      const [result] = await connection.query(
        `INSERT INTO number_series (module, prefix, financial_year, current_number, padding, reset_yearly, created_at, updated_at)
         SELECT ?, ?, NULL, 0, ?, 0, NOW(), NOW() FROM DUAL
         WHERE NOT EXISTS (SELECT 1 FROM number_series WHERE module = ? AND financial_year IS NULL)`,
        [row.module, row.prefix, row.padding, row.module]
      );
      inserted += result.affectedRows;
      console.log(`- ${row.module}: ${result.affectedRows ? 'created' : 'already exists'}`);
    }

    await connection.commit();
    console.log(`✅ Number series seeded (${inserted} created).`);
  } catch (error) {
    if (connection) {
      await connection.rollback();
      console.error('❌ Transaction rolled back due to error.');
    }
    console.error('Error details:', error);
    process.exit(1);
  } finally {
    if (connection) {
      connection.release();
    }
    process.exit(0);
  }
}

runSeed();
