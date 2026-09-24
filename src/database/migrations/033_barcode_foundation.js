/**
 * Barcode & scanner foundation — identification of existing lots.
 *
 * barcodes
 *   One generated, globally unique value per lot (barcode_type 'lot'; the
 *   ENUM leaves room for roll / bundle / item once the client decides). The
 *   lot stays authoritative: product, quantity, width, stock and trace are
 *   read from it, never copied here. At most one ACTIVE barcode per lot
 *   (unique generated column); a damaged / lost sticker is retired (with a
 *   reason) and replaced, never deleted or reused.
 *
 * barcode_scans
 *   Immutable scan history (triggers block UPDATE, and DELETE unless
 *   @barcode_scan_maintenance = 1, like the stock ledger). Every scan is
 *   recorded in the company it was made in — found, not found (unknown or
 *   another company's value) or retired — with the scan context, optional
 *   location, and whether the same barcode was already scanned in that
 *   context (is_duplicate + previous_scan_id). A scan changes nothing else:
 *   no stock movement, no lot status.
 *
 * Permissions barcode.view / barcode.create / barcode.scan (group Barcode),
 * Super Admin and Admin only.
 */

const PERMISSIONS = ['barcode.view', 'barcode.create', 'barcode.scan'];
const GRANTED_ROLES = ['Super Admin', 'Admin'];

const fk = (t, c, ref, action = 'RESTRICT') => `CONSTRAINT \`${t}_${c}_foreign\` FOREIGN KEY (\`${c}\`) REFERENCES \`${ref}\` (\`id\`) ON DELETE ${action}`;

export async function up(connection) {
  await connection.query(`CREATE TABLE \`barcodes\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`company_id\` BIGINT UNSIGNED NOT NULL,
  \`barcode_value\` VARCHAR(40) NOT NULL,
  \`barcode_type\` ENUM('lot') NOT NULL DEFAULT 'lot',
  \`lot_id\` BIGINT UNSIGNED NOT NULL,
  \`status\` ENUM('active', 'retired') NOT NULL DEFAULT 'active',
  \`active_lot_id\` BIGINT UNSIGNED AS (IF(\`status\` = 'active', \`lot_id\`, NULL)) STORED,
  \`retired_at\` TIMESTAMP NULL,
  \`retired_by\` BIGINT UNSIGNED NULL,
  \`retirement_reason\` VARCHAR(500),
  \`created_by\` BIGINT UNSIGNED,
  \`created_at\` TIMESTAMP,
  \`updated_at\` TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`barcodes_barcode_value_unique\` (\`barcode_value\`),
  UNIQUE KEY \`barcodes_active_lot_unique\` (\`active_lot_id\`),
  INDEX \`barcodes_company_id_status_index\` (\`company_id\`, \`status\`),
  INDEX \`barcodes_lot_id_index\` (\`lot_id\`),
  INDEX \`barcodes_created_at_index\` (\`created_at\`),
  CONSTRAINT \`barcodes_retired_consistent\` CHECK (
    (\`status\` = 'active' AND \`retired_at\` IS NULL) OR (\`status\` = 'retired' AND \`retired_at\` IS NOT NULL)
  ),
  ${fk('barcodes', 'company_id', 'companies')},
  ${fk('barcodes', 'lot_id', 'lots')},
  ${fk('barcodes', 'retired_by', 'users', 'SET NULL')},
  ${fk('barcodes', 'created_by', 'users', 'SET NULL')}
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);

  // scanned_by has no FK (as stock_movements.created_by): the history is immutable,
  // so a user deletion must not try to rewrite it.
  await connection.query(`CREATE TABLE \`barcode_scans\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`company_id\` BIGINT UNSIGNED NOT NULL,
  \`barcode_value\` VARCHAR(100) NOT NULL,
  \`barcode_id\` BIGINT UNSIGNED NULL,
  \`lot_id\` BIGINT UNSIGNED NULL,
  \`context\` ENUM('lookup', 'material_issue', 'dispatch') NOT NULL DEFAULT 'lookup',
  \`location_id\` BIGINT UNSIGNED NULL,
  \`result\` ENUM('found', 'not_found', 'retired') NOT NULL,
  \`is_duplicate\` TINYINT(1) NOT NULL DEFAULT 0,
  \`previous_scan_id\` BIGINT UNSIGNED NULL,
  \`scanned_by\` BIGINT UNSIGNED NULL,
  \`scanned_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  INDEX \`barcode_scans_company_id_scanned_at_index\` (\`company_id\`, \`scanned_at\`),
  INDEX \`barcode_scans_barcode_context_index\` (\`barcode_id\`, \`context\`, \`result\`),
  INDEX \`barcode_scans_lot_id_index\` (\`lot_id\`),
  INDEX \`barcode_scans_barcode_value_index\` (\`barcode_value\`),
  INDEX \`barcode_scans_scanned_by_index\` (\`scanned_by\`),
  CONSTRAINT \`barcode_scans_result_consistent\` CHECK (
    (\`result\` = 'found' AND \`barcode_id\` IS NOT NULL AND \`lot_id\` IS NOT NULL)
    OR (\`result\` = 'retired' AND \`barcode_id\` IS NOT NULL AND \`lot_id\` IS NOT NULL AND \`is_duplicate\` = 0)
    OR (\`result\` = 'not_found' AND \`barcode_id\` IS NULL AND \`lot_id\` IS NULL AND \`is_duplicate\` = 0)
  ),
  ${fk('barcode_scans', 'company_id', 'companies')},
  ${fk('barcode_scans', 'barcode_id', 'barcodes')},
  ${fk('barcode_scans', 'lot_id', 'lots')},
  ${fk('barcode_scans', 'location_id', 'stock_locations')},
  ${fk('barcode_scans', 'previous_scan_id', 'barcode_scans')}
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);

  await connection.query(`CREATE TRIGGER \`barcode_scans_before_update\` BEFORE UPDATE ON \`barcode_scans\`
    FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Barcode scan history is immutable.'`);
  await connection.query(`CREATE TRIGGER \`barcode_scans_before_delete\` BEFORE DELETE ON \`barcode_scans\`
    FOR EACH ROW BEGIN
      IF COALESCE(@barcode_scan_maintenance, 0) <> 1 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Barcode scan history is immutable.';
      END IF;
    END`);

  for (const name of PERMISSIONS) {
    await connection.query('INSERT IGNORE INTO `permissions` (name, group_name) VALUES (?, ?)', [name, 'Barcode']);
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
  await connection.query('DROP TRIGGER IF EXISTS `barcode_scans_before_delete`;');
  await connection.query('DROP TRIGGER IF EXISTS `barcode_scans_before_update`;');
  await connection.query('DROP TABLE IF EXISTS `barcode_scans`;');
  await connection.query('DROP TABLE IF EXISTS `barcodes`;');
}
