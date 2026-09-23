/**
 * GRN / receiving + lot foundation.
 *
 * The existing Goods Inward tables become the one GRN system for every PO
 * origin (order confirmation, material requirement, material plan):
 *
 * inward_entries (GRN header)
 *   - entry_type: 'legacy_inward' for rows created by the old integer inward
 *     flow (every existing row — a deterministic backfill), 'grn' for new
 *     receipts. Legacy rows stay readable history.
 *   - receipt_status: draft → posted, or cancelled. Existing rows are
 *     'posted' because the old flow counted a receipt as soon as it was saved.
 *     Only posted receipts count as received.
 *   - posted_at/by, cancelled_at/by.
 *   - `status` (pending/approved/rejected) keeps its existing QC meaning; QC
 *     is Phase 6 and is untouched here.
 *
 * inward_entry_items (GRN lines)
 *   - received_quantity DECIMAL(18,6): GRN quantity in the PO line's UOM
 *     (the legacy integer received_qty is left in place for legacy rows).
 *   - width_inch: mandatory on GRN lines (inches, the existing
 *     products.fabric_width_inch convention). One PO line may be received as
 *     several GRN lines with different widths.
 *   - supplier_lot_no: optional mill/supplier lot reference, so lines of one
 *     supplier lot with different widths stay grouped.
 *
 * lots (new)
 *   One lot per posted GRN line — the receipt identity later phases (QC,
 *   stock, production) will build on. Lot numbers come from the existing
 *   number-series mechanism. Status is only 'received' or 'cancelled'
 *   (QC statuses belong to Phase 6).
 *
 * Permission inward-entry.post (post/cancel a GRN), group Procurement,
 * granted to Super Admin and Admin only.
 */

const PERMISSIONS = ['inward-entry.post'];
const GRANTED_ROLES = ['Super Admin', 'Admin'];

export async function up(connection) {
  await connection.query(`ALTER TABLE \`inward_entries\`
    ADD COLUMN \`entry_type\` ENUM('legacy_inward', 'grn') NOT NULL DEFAULT 'legacy_inward' AFTER \`company_id\`,
    ADD COLUMN \`receipt_status\` ENUM('draft', 'posted', 'cancelled') NOT NULL DEFAULT 'posted' AFTER \`remarks\`,
    ADD COLUMN \`posted_at\` TIMESTAMP NULL AFTER \`receipt_status\`,
    ADD COLUMN \`posted_by\` BIGINT UNSIGNED NULL AFTER \`posted_at\`,
    ADD COLUMN \`cancelled_at\` TIMESTAMP NULL AFTER \`posted_by\`,
    ADD COLUMN \`cancelled_by\` BIGINT UNSIGNED NULL AFTER \`cancelled_at\`;`);

  // Existing rows took the backfill defaults above; new rows default to a draft GRN.
  await connection.query(`ALTER TABLE \`inward_entries\`
    ALTER COLUMN \`entry_type\` SET DEFAULT 'grn',
    ALTER COLUMN \`receipt_status\` SET DEFAULT 'draft';`);

  await connection.query(`ALTER TABLE \`inward_entries\`
    ADD INDEX \`inward_entries_company_id_receipt_status_index\` (\`company_id\`, \`receipt_status\`),
    ADD INDEX \`inward_entries_purchase_order_id_receipt_status_index\` (\`purchase_order_id\`, \`receipt_status\`),
    ADD CONSTRAINT \`inward_entries_posted_by_foreign\` FOREIGN KEY (\`posted_by\`) REFERENCES \`users\` (\`id\`) ON DELETE SET NULL,
    ADD CONSTRAINT \`inward_entries_cancelled_by_foreign\` FOREIGN KEY (\`cancelled_by\`) REFERENCES \`users\` (\`id\`) ON DELETE SET NULL;`);

  await connection.query(`ALTER TABLE \`inward_entry_items\`
    ADD COLUMN \`received_quantity\` DECIMAL(18, 6) NULL AFTER \`received_qty\`,
    ADD COLUMN \`width_inch\` DECIMAL(10, 3) NULL AFTER \`received_quantity\`,
    ADD COLUMN \`supplier_lot_no\` VARCHAR(60) NULL AFTER \`width_inch\`;`);

  await connection.query(`CREATE TABLE \`lots\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`company_id\` BIGINT UNSIGNED NOT NULL,
  \`lot_no\` VARCHAR(40) NOT NULL,
  \`financial_year\` VARCHAR(10) NOT NULL,
  \`inward_entry_id\` BIGINT UNSIGNED NOT NULL,
  \`inward_entry_item_id\` BIGINT UNSIGNED NOT NULL,
  \`purchase_order_id\` BIGINT UNSIGNED NOT NULL,
  \`purchase_order_item_id\` BIGINT UNSIGNED NOT NULL,
  \`supplier_id\` BIGINT UNSIGNED NOT NULL,
  \`product_id\` BIGINT UNSIGNED NOT NULL,
  \`uom_id\` BIGINT UNSIGNED NULL,
  \`unit\` VARCHAR(20),
  \`quantity\` DECIMAL(18, 6) NOT NULL,
  \`width_inch\` DECIMAL(10, 3) NOT NULL,
  \`supplier_lot_no\` VARCHAR(60),
  \`received_date\` DATE NOT NULL,
  \`status\` ENUM('received', 'cancelled') NOT NULL DEFAULT 'received',
  \`created_by\` BIGINT UNSIGNED,
  \`updated_by\` BIGINT UNSIGNED,
  \`created_at\` TIMESTAMP,
  \`updated_at\` TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`lots_lot_no_unique\` (\`lot_no\`),
  UNIQUE KEY \`lots_inward_entry_item_id_unique\` (\`inward_entry_item_id\`),
  INDEX \`lots_company_id_status_index\` (\`company_id\`, \`status\`),
  INDEX \`lots_inward_entry_id_index\` (\`inward_entry_id\`),
  INDEX \`lots_purchase_order_item_id_index\` (\`purchase_order_item_id\`),
  INDEX \`lots_product_id_index\` (\`product_id\`),
  CONSTRAINT \`lots_company_id_foreign\` FOREIGN KEY (\`company_id\`) REFERENCES \`companies\` (\`id\`) ON DELETE RESTRICT,
  CONSTRAINT \`lots_inward_entry_id_foreign\` FOREIGN KEY (\`inward_entry_id\`) REFERENCES \`inward_entries\` (\`id\`) ON DELETE RESTRICT,
  CONSTRAINT \`lots_inward_entry_item_id_foreign\` FOREIGN KEY (\`inward_entry_item_id\`) REFERENCES \`inward_entry_items\` (\`id\`) ON DELETE RESTRICT,
  CONSTRAINT \`lots_purchase_order_id_foreign\` FOREIGN KEY (\`purchase_order_id\`) REFERENCES \`purchase_orders\` (\`id\`) ON DELETE RESTRICT,
  CONSTRAINT \`lots_purchase_order_item_id_foreign\` FOREIGN KEY (\`purchase_order_item_id\`) REFERENCES \`purchase_order_items\` (\`id\`) ON DELETE RESTRICT,
  CONSTRAINT \`lots_supplier_id_foreign\` FOREIGN KEY (\`supplier_id\`) REFERENCES \`suppliers\` (\`id\`) ON DELETE RESTRICT,
  CONSTRAINT \`lots_product_id_foreign\` FOREIGN KEY (\`product_id\`) REFERENCES \`products\` (\`id\`) ON DELETE RESTRICT,
  CONSTRAINT \`lots_uom_id_foreign\` FOREIGN KEY (\`uom_id\`) REFERENCES \`uoms\` (\`id\`) ON DELETE RESTRICT,
  CONSTRAINT \`lots_created_by_foreign\` FOREIGN KEY (\`created_by\`) REFERENCES \`users\` (\`id\`) ON DELETE SET NULL,
  CONSTRAINT \`lots_updated_by_foreign\` FOREIGN KEY (\`updated_by\`) REFERENCES \`users\` (\`id\`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);

  for (const name of PERMISSIONS) {
    await connection.query('INSERT IGNORE INTO `permissions` (name, group_name) VALUES (?, ?)', [name, 'Procurement']);
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
  await connection.query('DROP TABLE IF EXISTS `lots`;');
  await connection.query(`ALTER TABLE \`inward_entry_items\`
    DROP COLUMN \`supplier_lot_no\`, DROP COLUMN \`width_inch\`, DROP COLUMN \`received_quantity\`;`);
  await connection.query(`ALTER TABLE \`inward_entries\`
    DROP FOREIGN KEY \`inward_entries_cancelled_by_foreign\`,
    DROP FOREIGN KEY \`inward_entries_posted_by_foreign\`;`);
  await connection.query(`ALTER TABLE \`inward_entries\`
    DROP INDEX \`inward_entries_purchase_order_id_receipt_status_index\`,
    DROP INDEX \`inward_entries_company_id_receipt_status_index\`,
    DROP COLUMN \`cancelled_by\`, DROP COLUMN \`cancelled_at\`,
    DROP COLUMN \`posted_by\`, DROP COLUMN \`posted_at\`,
    DROP COLUMN \`receipt_status\`, DROP COLUMN \`entry_type\`;`);
}
