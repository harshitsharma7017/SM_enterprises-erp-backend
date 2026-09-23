/**
 * Stock / inventory foundation.
 *
 * stock_locations
 *   Minimal company-owned location master (code, name, active/inactive) so
 *   posted stock records where it is physically held. The client names one
 *   "store"; no warehouse structure (bins, racks, transfers) is defined, so
 *   none is built.
 *
 * stock_movements — the stock ledger and the ONLY source of truth
 *   One immutable row per posted movement: company, location, lot, product,
 *   UOM (the lot's receipt UOM), positive quantity, direction, type, source.
 *   Balances are SUM(in) − SUM(out) per company/location/lot/product/UOM;
 *   there is no separate balance table that could disagree with it.
 *   - QC_ACCEPTED_RECEIPT: the accepted quantity of one completed QC, IN.
 *     UNIQUE (movement_type, quality_inspection_id) makes a second posting
 *     of the same inspection impossible at database level.
 *   - STOCK_ADJUSTMENT: restricted correction of an existing lot balance
 *     (reason required; never above the QC-accepted quantity, never below 0).
 *   Later phases add movement types (issue, consumption, …) to the enum.
 *   Triggers reject every UPDATE, and every DELETE unless the session sets
 *   @stock_ledger_maintenance = 1 (test/maintenance cleanup only).
 *
 * Permissions (group Inventory), granted to Super Admin and Admin only:
 *   stock.view, stock.ledger, stock.post, stock.adjust,
 *   stock-location.view, stock-location.create, stock-location.edit
 */

const PERMISSIONS = [
  'stock.view', 'stock.ledger', 'stock.post', 'stock.adjust',
  'stock-location.view', 'stock-location.create', 'stock-location.edit',
];
const GRANTED_ROLES = ['Super Admin', 'Admin'];

export async function up(connection) {
  await connection.query(`CREATE TABLE \`stock_locations\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`company_id\` BIGINT UNSIGNED NOT NULL,
  \`code\` VARCHAR(20) NOT NULL,
  \`name\` VARCHAR(100) NOT NULL,
  \`status\` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  \`remarks\` TEXT,
  \`created_by\` BIGINT UNSIGNED,
  \`updated_by\` BIGINT UNSIGNED,
  \`created_at\` TIMESTAMP,
  \`updated_at\` TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`stock_locations_company_id_code_unique\` (\`company_id\`, \`code\`),
  CONSTRAINT \`stock_locations_company_id_foreign\` FOREIGN KEY (\`company_id\`) REFERENCES \`companies\` (\`id\`) ON DELETE RESTRICT,
  CONSTRAINT \`stock_locations_created_by_foreign\` FOREIGN KEY (\`created_by\`) REFERENCES \`users\` (\`id\`) ON DELETE SET NULL,
  CONSTRAINT \`stock_locations_updated_by_foreign\` FOREIGN KEY (\`updated_by\`) REFERENCES \`users\` (\`id\`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);

  await connection.query(`CREATE TABLE \`stock_movements\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`company_id\` BIGINT UNSIGNED NOT NULL,
  \`movement_no\` VARCHAR(40) NOT NULL,
  \`financial_year\` VARCHAR(10) NOT NULL,
  \`movement_date\` DATE NOT NULL,
  \`movement_type\` ENUM('QC_ACCEPTED_RECEIPT', 'STOCK_ADJUSTMENT') NOT NULL,
  \`direction\` ENUM('in', 'out') NOT NULL,
  \`location_id\` BIGINT UNSIGNED NOT NULL,
  \`lot_id\` BIGINT UNSIGNED NOT NULL,
  \`product_id\` BIGINT UNSIGNED NOT NULL,
  \`uom_id\` BIGINT UNSIGNED NULL,
  \`unit\` VARCHAR(20),
  \`quantity\` DECIMAL(18, 6) NOT NULL,
  \`source_type\` ENUM('quality_inspection', 'stock_adjustment') NOT NULL,
  \`quality_inspection_id\` BIGINT UNSIGNED NULL,
  \`reason\` VARCHAR(255),
  \`remarks\` TEXT,
  \`created_by\` BIGINT UNSIGNED,
  \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`stock_movements_movement_no_unique\` (\`movement_no\`),
  UNIQUE KEY \`stock_movements_type_quality_inspection_unique\` (\`movement_type\`, \`quality_inspection_id\`),
  INDEX \`stock_movements_lot_id_location_id_index\` (\`lot_id\`, \`location_id\`),
  INDEX \`stock_movements_company_id_movement_date_index\` (\`company_id\`, \`movement_date\`),
  INDEX \`stock_movements_product_id_index\` (\`product_id\`),
  INDEX \`stock_movements_location_id_index\` (\`location_id\`),
  CONSTRAINT \`stock_movements_quantity_positive\` CHECK (\`quantity\` > 0),
  CONSTRAINT \`stock_movements_source_consistent\` CHECK (
    (\`movement_type\` = 'QC_ACCEPTED_RECEIPT' AND \`direction\` = 'in' AND \`source_type\` = 'quality_inspection' AND \`quality_inspection_id\` IS NOT NULL)
    OR (\`movement_type\` = 'STOCK_ADJUSTMENT' AND \`source_type\` = 'stock_adjustment' AND \`quality_inspection_id\` IS NULL AND \`reason\` IS NOT NULL)
  ),
  CONSTRAINT \`stock_movements_company_id_foreign\` FOREIGN KEY (\`company_id\`) REFERENCES \`companies\` (\`id\`) ON DELETE RESTRICT,
  CONSTRAINT \`stock_movements_location_id_foreign\` FOREIGN KEY (\`location_id\`) REFERENCES \`stock_locations\` (\`id\`) ON DELETE RESTRICT,
  CONSTRAINT \`stock_movements_lot_id_foreign\` FOREIGN KEY (\`lot_id\`) REFERENCES \`lots\` (\`id\`) ON DELETE RESTRICT,
  CONSTRAINT \`stock_movements_product_id_foreign\` FOREIGN KEY (\`product_id\`) REFERENCES \`products\` (\`id\`) ON DELETE RESTRICT,
  CONSTRAINT \`stock_movements_uom_id_foreign\` FOREIGN KEY (\`uom_id\`) REFERENCES \`uoms\` (\`id\`) ON DELETE RESTRICT,
  CONSTRAINT \`stock_movements_quality_inspection_id_foreign\` FOREIGN KEY (\`quality_inspection_id\`) REFERENCES \`quality_inspections\` (\`id\`) ON DELETE RESTRICT,
  CONSTRAINT \`stock_movements_created_by_foreign\` FOREIGN KEY (\`created_by\`) REFERENCES \`users\` (\`id\`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);

  // Posted movements are immutable history.
  await connection.query(`CREATE TRIGGER \`stock_movements_before_update\` BEFORE UPDATE ON \`stock_movements\`
    FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Stock movements are immutable.'`);
  await connection.query(`CREATE TRIGGER \`stock_movements_before_delete\` BEFORE DELETE ON \`stock_movements\`
    FOR EACH ROW BEGIN
      IF COALESCE(@stock_ledger_maintenance, 0) <> 1 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Stock movements are immutable.';
      END IF;
    END`);

  for (const name of PERMISSIONS) {
    await connection.query('INSERT IGNORE INTO `permissions` (name, group_name) VALUES (?, ?)', [name, 'Inventory']);
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
  await connection.query('DROP TRIGGER IF EXISTS `stock_movements_before_delete`;');
  await connection.query('DROP TRIGGER IF EXISTS `stock_movements_before_update`;');
  await connection.query('DROP TABLE IF EXISTS `stock_movements`;');
  await connection.query('DROP TABLE IF EXISTS `stock_locations`;');
}
