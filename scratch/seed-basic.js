import { pool } from '../src/config/database.js';

async function seed() {
  const c = await pool.getConnection();
  try {
    await c.query('INSERT IGNORE INTO buyers (company_name, display_code, status) VALUES ("Test Buyer", "TB", "active")');
    await c.query('INSERT IGNORE INTO categories (name, code, status) VALUES ("Test Cat", "TC", "active")');
    await c.query('INSERT IGNORE INTO document_formats (name) VALUES ("Test Format")');
    await c.query('INSERT IGNORE INTO suppliers (company_name, display_code, status) VALUES ("Supplier 1", "S1", "active"), ("Supplier 2", "S2", "active")');
    await c.query('INSERT IGNORE INTO currencies (name, symbol) VALUES ("US Dollar", "$")');
    console.log("Seeded");
  } catch (e) {
    console.error(e);
  } finally {
    c.release();
    process.exit(0);
  }
}
seed();
