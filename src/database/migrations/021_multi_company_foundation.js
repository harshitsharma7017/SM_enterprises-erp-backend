/**
 * Multi-company foundation — one application / one database serving
 * SM Enterprises and Mahindra Gupta & Company.
 *
 * 1. Creates `companies` and seeds exactly the two client companies with
 *    stable ids/codes: 1 = SME (SM Enterprises), 2 = MGC (Mahindra Gupta &
 *    Company).
 *
 * 2. Adds a nullable `company_id` (FK -> companies.id, ON DELETE RESTRICT,
 *    indexed) to:
 *      - company-owned:  products, inquiries, order_confirmations,
 *                        purchase_orders, inward_entries, export_documents
 *      - optionally owned (NULL = shared by both companies):
 *                        buyers, suppliers (suppliers also holds jobbers)
 *    Line/child tables (items, colours, sizes, timelines, cartons,
 *    checklists) inherit company through their header and get no column.
 *
 *    The column is nullable on the company-owned tables ONLY because rows
 *    that predate multi-company support cannot be attributed safely: the
 *    existing data carries no field that identifies either company. Those
 *    rows are left NULL ("unassigned") rather than guessed; the API
 *    requires a company for every new record and allows a one-time
 *    assignment on legacy records.
 *
 * 3. Adds `company.view|create|edit|delete` permissions (group
 *    Administration) and grants them to Super Admin and Admin — the same
 *    roles that hold `company-profile.*`.
 *
 * Purely additive: no existing table is dropped or recreated, no existing
 * row is updated or deleted.
 */

const COMPANIES = [
  { id: 1, code: 'SME', name: 'SM Enterprises', short_name: 'SM Enterprises' },
  { id: 2, code: 'MGC', name: 'Mahindra Gupta & Company', short_name: 'Mahindra Gupta & Co.' },
];

const COMPANY_TABLES = [
  'products',
  'buyers',
  'suppliers',
  'inquiries',
  'order_confirmations',
  'purchase_orders',
  'inward_entries',
  'export_documents',
];

const PERMISSIONS = ['company.view', 'company.create', 'company.edit', 'company.delete'];
const GRANTED_ROLES = ['Super Admin', 'Admin'];

export async function up(connection) {
  await connection.query(`CREATE TABLE \`companies\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`code\` VARCHAR(10) NOT NULL,
  \`name\` VARCHAR(200) NOT NULL,
  \`short_name\` VARCHAR(60),
  \`address\` TEXT,
  \`phone\` VARCHAR(255),
  \`email\` VARCHAR(255),
  \`gstin\` VARCHAR(15),
  \`is_active\` TINYINT(1) NOT NULL DEFAULT 1,
  \`created_by\` BIGINT UNSIGNED,
  \`updated_by\` BIGINT UNSIGNED,
  \`created_at\` TIMESTAMP,
  \`updated_at\` TIMESTAMP,
  \`deleted_at\` TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`companies_code_unique\` (\`code\`),
  UNIQUE KEY \`companies_name_unique\` (\`name\`),
  CONSTRAINT \`companies_created_by_foreign\` FOREIGN KEY (\`created_by\`) REFERENCES \`users\` (\`id\`) ON DELETE SET NULL,
  CONSTRAINT \`companies_updated_by_foreign\` FOREIGN KEY (\`updated_by\`) REFERENCES \`users\` (\`id\`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);

  for (const c of COMPANIES) {
    await connection.query(
      `INSERT INTO \`companies\` (id, code, name, short_name, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, 1, NOW(), NOW())`,
      [c.id, c.code, c.name, c.short_name]
    );
  }

  for (const table of COMPANY_TABLES) {
    await connection.query(`ALTER TABLE \`${table}\` ADD COLUMN \`company_id\` BIGINT UNSIGNED NULL AFTER \`id\`;`);
    await connection.query(`ALTER TABLE \`${table}\` ADD INDEX \`${table}_company_id_index\` (\`company_id\`);`);
    await connection.query(`ALTER TABLE \`${table}\` ADD CONSTRAINT \`${table}_company_id_foreign\` FOREIGN KEY (\`company_id\`) REFERENCES \`companies\` (\`id\`) ON DELETE RESTRICT;`);
  }

  for (const name of PERMISSIONS) {
    await connection.query(
      'INSERT IGNORE INTO `permissions` (name, group_name) VALUES (?, ?)',
      [name, 'Administration']
    );
  }

  for (const role of GRANTED_ROLES) {
    await connection.query(
      `INSERT IGNORE INTO \`role_permissions\` (role_id, permission_id)
       SELECT r.id, p.id FROM \`roles\` r JOIN \`permissions\` p ON p.name IN (?)
       WHERE r.name = ?`,
      [PERMISSIONS, role]
    );
  }
}

export async function down(connection) {
  await connection.query('DELETE FROM `permissions` WHERE name IN (?)', [PERMISSIONS]);

  for (const table of COMPANY_TABLES) {
    await connection.query(`ALTER TABLE \`${table}\` DROP FOREIGN KEY \`${table}_company_id_foreign\`;`);
    await connection.query(`ALTER TABLE \`${table}\` DROP INDEX \`${table}_company_id_index\`;`);
    await connection.query(`ALTER TABLE \`${table}\` DROP COLUMN \`company_id\`;`);
  }

  await connection.query('DROP TABLE IF EXISTS `companies`;');
}
