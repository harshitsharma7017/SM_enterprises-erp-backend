/**
 * Hands out the next display code for a module — CAT001, CAT002, etc.
 * Replicates the original Laravel NumberSeriesService logic.
 */
/** Indian financial year (Apr–Mar) label for a date, e.g. "2026-27". */
export const financialYearFor = (date = new Date()) => {
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  const startYear = month >= 4 ? year : year - 1;
  return `${startYear}-${String(startYear + 1).slice(-2)}`;
};

export const numberSeriesService = {
  /**
   * Creates the module's series for a financial year on first use — the same
   * lazy pattern the inquiry/PO/inward modules use inline.
   */
  ensure: async (connection, module, prefix, financialYear) => {
    const [existing] = await connection.query(
      'SELECT id FROM number_series WHERE module = ? AND financial_year = ?',
      [module, financialYear]
    );
    if (existing.length === 0) {
      await connection.query(
        `INSERT INTO number_series (module, prefix, financial_year, current_number, padding, reset_yearly, created_at, updated_at)
         VALUES (?, ?, ?, 0, 3, 1, NOW(), NOW())`,
        [module, prefix, financialYear]
      );
    }
  },

  /**
   * Reserve and return the next code for a module.
   * 
   * @param {import('mysql2/promise').PoolConnection} connection - The active transaction connection
   * @param {string} module - The module name (e.g., 'category')
   * @param {string|null} financialYear - Optional financial year
   * @returns {Promise<string>} The generated formatted code
   */
  next: async (connection, module, financialYear = null) => {
    // Determine the financial year condition
    let query = 'SELECT * FROM number_series WHERE module = ?';
    const params = [module];
    
    if (financialYear) {
      query += ' AND financial_year = ?';
      params.push(financialYear);
    } else {
      query += ' AND financial_year IS NULL';
    }

    // Lock the row for update to prevent concurrent duplicate code generation
    query += ' FOR UPDATE';

    const [rows] = await connection.query(query, params);

    if (rows.length === 0) {
      throw new Error(`No number series configured for module [${module}]. Run NumberSeriesSeeder.`);
    }

    const series = rows[0];

    // Increment the number
    const newNumber = series.current_number + 1;

    await connection.query('UPDATE number_series SET current_number = ? WHERE id = ?', [
      newNumber,
      series.id
    ]);

    // Format the number
    const paddedNumber = String(newNumber).padStart(series.padding, '0');
    
    if (series.financial_year) {
      return `${series.prefix}${series.financial_year}/${paddedNumber}`;
    } else {
      return `${series.prefix}${paddedNumber}`;
    }
  },

  /**
   * The raw next number, padded but without the prefix or shape.
   */
  nextNumber: async (connection, module, financialYear = null) => {
    let query = 'SELECT * FROM number_series WHERE module = ?';
    const params = [module];
    
    if (financialYear) {
      query += ' AND financial_year = ?';
      params.push(financialYear);
    } else {
      query += ' AND financial_year IS NULL';
    }

    query += ' FOR UPDATE';

    const [rows] = await connection.query(query, params);

    if (rows.length === 0) {
      throw new Error(`No number series configured for module [${module}]. Run NumberSeriesSeeder.`);
    }

    const series = rows[0];
    const newNumber = series.current_number + 1;

    await connection.query('UPDATE number_series SET current_number = ? WHERE id = ?', [
      newNumber,
      series.id
    ]);

    return String(newNumber).padStart(series.padding, '0');
  }
};
