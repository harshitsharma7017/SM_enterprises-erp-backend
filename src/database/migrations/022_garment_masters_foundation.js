/**
 * Garment masters foundation.
 *
 * 1. `uoms` — global unit-of-measure master (units are not company-specific).
 *    Seeded ONLY with the unit codes that already exist in this database
 *    (document_format_units: DOZ, KGS, MTR, PAIR, PCS, SET). `decimal_places`
 *    records how many decimals a quantity in that unit may carry, so metre-
 *    based materials (pocketing, elastic) can later hold fractional
 *    quantities. No conversion factors/formulas — out of scope.
 *
 * 2. `material_types` — company-owned product/material groups. Seeded with
 *    the groups named in the client requirements:
 *      SM Enterprises (1):           Pocketing, Waistband, Elastic,
 *                                    Silicon Badge, Metal Badge
 *      Mahindra Gupta & Company (2): Drawcord, Silicon Printing,
 *                                    Normal Printing, Other Printing
 *    Kept separate from `categories`, which are global and drive order
 *    formats and supplier/buyer cascades in the existing workflow.
 *
 * 3. `brands` — company-owned brand master (no seed data).
 *
 * 4. products.material_type_id / products.uom_id — nullable FKs. Existing
 *    products are left NULL (not guessed); the API validates new values.
 *    No brand column on products: one material can serve many brands with
 *    brand-specific specifications, which belongs to a later phase.
 *
 * 5. brand.* / material-type.* / uom.* permissions (group Masters), granted
 *    to Super Admin and Admin — the roles holding the other master permissions.
 *
 * Purely additive: no existing table is dropped or recreated and no existing
 * row is updated or deleted.
 */

const UOMS = [
  { code: 'DOZ', name: 'Dozen', decimal_places: 0 },
  { code: 'KGS', name: 'Kilograms', decimal_places: 3 },
  { code: 'MTR', name: 'Metre', decimal_places: 2 },
  { code: 'PAIR', name: 'Pair', decimal_places: 0 },
  { code: 'PCS', name: 'Pieces', decimal_places: 0 },
  { code: 'SET', name: 'Set', decimal_places: 0 },
];

const MATERIAL_TYPES = [
  { company_id: 1, code: 'POCKETING', name: 'Pocketing' },
  { company_id: 1, code: 'WAISTBAND', name: 'Waistband' },
  { company_id: 1, code: 'ELASTIC', name: 'Elastic' },
  { company_id: 1, code: 'SILBADGE', name: 'Silicon Badge' },
  { company_id: 1, code: 'METBADGE', name: 'Metal Badge' },
  { company_id: 2, code: 'DRAWCORD', name: 'Drawcord' },
  { company_id: 2, code: 'SILPRINT', name: 'Silicon Printing' },
  { company_id: 2, code: 'NORPRINT', name: 'Normal Printing' },
  { company_id: 2, code: 'OTHPRINT', name: 'Other Printing' },
];

const PERMISSIONS = [
  'brand.view', 'brand.create', 'brand.edit', 'brand.delete',
  'material-type.view', 'material-type.create', 'material-type.edit', 'material-type.delete',
  'uom.view', 'uom.create', 'uom.edit', 'uom.delete',
];
const GRANTED_ROLES = ['Super Admin', 'Admin'];

const auditColumns = () => `
  \`status\` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  \`created_by\` BIGINT UNSIGNED,
  \`updated_by\` BIGINT UNSIGNED,
  \`created_at\` TIMESTAMP,
  \`updated_at\` TIMESTAMP,
  \`deleted_at\` TIMESTAMP,`;

const auditForeignKeys = (table) => `
  CONSTRAINT \`${table}_created_by_foreign\` FOREIGN KEY (\`created_by\`) REFERENCES \`users\` (\`id\`) ON DELETE SET NULL,
  CONSTRAINT \`${table}_updated_by_foreign\` FOREIGN KEY (\`updated_by\`) REFERENCES \`users\` (\`id\`) ON DELETE SET NULL`;

export async function up(connection) {
  await connection.query(`CREATE TABLE \`uoms\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`code\` VARCHAR(20) NOT NULL,
  \`name\` VARCHAR(60) NOT NULL,
  \`decimal_places\` TINYINT UNSIGNED NOT NULL DEFAULT 0,${auditColumns()}
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uoms_code_unique\` (\`code\`),
  UNIQUE KEY \`uoms_name_unique\` (\`name\`),${auditForeignKeys('uoms')}
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);

  for (const table of ['material_types', 'brands']) {
    await connection.query(`CREATE TABLE \`${table}\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`company_id\` BIGINT UNSIGNED NOT NULL,
  \`code\` VARCHAR(10) NOT NULL,
  \`name\` VARCHAR(120) NOT NULL,${auditColumns()}
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`${table}_company_id_code_unique\` (\`company_id\`, \`code\`),
  UNIQUE KEY \`${table}_company_id_name_unique\` (\`company_id\`, \`name\`),
  INDEX \`${table}_company_id_status_index\` (\`company_id\`, \`status\`),
  CONSTRAINT \`${table}_company_id_foreign\` FOREIGN KEY (\`company_id\`) REFERENCES \`companies\` (\`id\`) ON DELETE RESTRICT,${auditForeignKeys(table)}
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);
  }

  for (const u of UOMS) {
    await connection.query(
      'INSERT INTO `uoms` (code, name, decimal_places, status, created_at, updated_at) VALUES (?, ?, ?, \'active\', NOW(), NOW())',
      [u.code, u.name, u.decimal_places]
    );
  }

  for (const m of MATERIAL_TYPES) {
    await connection.query(
      'INSERT INTO `material_types` (company_id, code, name, status, created_at, updated_at) VALUES (?, ?, ?, \'active\', NOW(), NOW())',
      [m.company_id, m.code, m.name]
    );
  }

  await connection.query('ALTER TABLE `products` ADD COLUMN `material_type_id` BIGINT UNSIGNED NULL AFTER `category_id`;');
  await connection.query('ALTER TABLE `products` ADD COLUMN `uom_id` BIGINT UNSIGNED NULL AFTER `material_type_id`;');
  await connection.query('ALTER TABLE `products` ADD INDEX `products_material_type_id_index` (`material_type_id`);');
  await connection.query('ALTER TABLE `products` ADD INDEX `products_uom_id_index` (`uom_id`);');
  await connection.query('ALTER TABLE `products` ADD CONSTRAINT `products_material_type_id_foreign` FOREIGN KEY (`material_type_id`) REFERENCES `material_types` (`id`) ON DELETE RESTRICT;');
  await connection.query('ALTER TABLE `products` ADD CONSTRAINT `products_uom_id_foreign` FOREIGN KEY (`uom_id`) REFERENCES `uoms` (`id`) ON DELETE RESTRICT;');

  for (const name of PERMISSIONS) {
    await connection.query('INSERT IGNORE INTO `permissions` (name, group_name) VALUES (?, ?)', [name, 'Masters']);
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

  await connection.query('ALTER TABLE `products` DROP FOREIGN KEY `products_uom_id_foreign`;');
  await connection.query('ALTER TABLE `products` DROP FOREIGN KEY `products_material_type_id_foreign`;');
  await connection.query('ALTER TABLE `products` DROP INDEX `products_uom_id_index`;');
  await connection.query('ALTER TABLE `products` DROP INDEX `products_material_type_id_index`;');
  await connection.query('ALTER TABLE `products` DROP COLUMN `uom_id`;');
  await connection.query('ALTER TABLE `products` DROP COLUMN `material_type_id`;');

  await connection.query('DROP TABLE IF EXISTS `brands`;');
  await connection.query('DROP TABLE IF EXISTS `material_types`;');
  await connection.query('DROP TABLE IF EXISTS `uoms`;');
}
