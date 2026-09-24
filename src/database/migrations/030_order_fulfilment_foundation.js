/**
 * Customer-order fulfilment tracking on the existing Order Confirmation.
 *
 * The Order Confirmation already IS the customer order (company, buyer,
 * items with product and quantity, status); it is extended, not duplicated.
 *
 * order_confirmations (extended)
 *   - brand_id (NULLable, RESTRICT): the brand an order is for, where known.
 *   - status + 'cancelled', with cancelled_at / cancelled_by /
 *     cancellation_reason. draft / sent / confirmed are unchanged.
 *
 * order_item_production_allocations (new)
 *   Explicit link of finished production output (a Phase 9 production lot
 *   and its processing record) to an order item, with a decimal quantity.
 *   Nothing else links production to orders (OC purchase orders only feed raw
 *   material; job references are free text), and no allocation rule has
 *   been defined — so allocation is explicit and manual. One production lot
 *   may serve several orders; the active allocations of a lot never exceed
 *   its produced quantity. Cancelled allocations stay as history.
 *
 *   Order "produced" = active allocations. "Dispatched" has no source until
 *   a dispatch module exists (export documents are shipping paperwork, not
 *   a dispatch record).
 *
 * Permission order-confirmation.allocate (group Sales), Super Admin and Admin.
 */

const PERMISSIONS = ['order-confirmation.allocate'];
const GRANTED_ROLES = ['Super Admin', 'Admin'];

export async function up(connection) {
  await connection.query(`ALTER TABLE \`order_confirmations\`
    ADD COLUMN \`brand_id\` BIGINT UNSIGNED NULL AFTER \`buyer_id\`,
    MODIFY \`status\` ENUM('draft', 'sent', 'confirmed', 'cancelled') NOT NULL DEFAULT 'draft',
    ADD COLUMN \`cancelled_at\` TIMESTAMP NULL AFTER \`status\`,
    ADD COLUMN \`cancelled_by\` BIGINT UNSIGNED NULL AFTER \`cancelled_at\`,
    ADD COLUMN \`cancellation_reason\` VARCHAR(500) NULL AFTER \`cancelled_by\`,
    ADD INDEX \`order_confirmations_brand_id_index\` (\`brand_id\`),
    ADD INDEX \`order_confirmations_company_id_status_index\` (\`company_id\`, \`status\`),
    ADD CONSTRAINT \`order_confirmations_brand_id_foreign\` FOREIGN KEY (\`brand_id\`) REFERENCES \`brands\` (\`id\`) ON DELETE RESTRICT,
    ADD CONSTRAINT \`order_confirmations_cancelled_by_foreign\` FOREIGN KEY (\`cancelled_by\`) REFERENCES \`users\` (\`id\`) ON DELETE SET NULL;`);

  await connection.query(`CREATE TABLE \`order_item_production_allocations\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`company_id\` BIGINT UNSIGNED NOT NULL,
  \`order_confirmation_id\` BIGINT UNSIGNED NOT NULL,
  \`order_confirmation_item_id\` BIGINT UNSIGNED NOT NULL,
  \`processing_record_id\` BIGINT UNSIGNED NOT NULL,
  \`lot_id\` BIGINT UNSIGNED NOT NULL,
  \`product_id\` BIGINT UNSIGNED NOT NULL,
  \`uom_id\` BIGINT UNSIGNED NULL,
  \`unit\` VARCHAR(20),
  \`quantity\` DECIMAL(18, 6) NOT NULL,
  \`status\` ENUM('active', 'cancelled') NOT NULL DEFAULT 'active',
  \`remarks\` TEXT,
  \`created_by\` BIGINT UNSIGNED,
  \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`cancelled_at\` TIMESTAMP NULL,
  \`cancelled_by\` BIGINT UNSIGNED NULL,
  \`cancellation_reason\` VARCHAR(500),
  PRIMARY KEY (\`id\`),
  INDEX \`oipa_company_id_status_index\` (\`company_id\`, \`status\`),
  INDEX \`oipa_order_confirmation_id_index\` (\`order_confirmation_id\`),
  INDEX \`oipa_order_confirmation_item_id_index\` (\`order_confirmation_item_id\`),
  INDEX \`oipa_processing_record_id_index\` (\`processing_record_id\`),
  INDEX \`oipa_lot_id_status_index\` (\`lot_id\`, \`status\`),
  INDEX \`oipa_product_id_index\` (\`product_id\`),
  CONSTRAINT \`oipa_quantity_positive\` CHECK (\`quantity\` > 0),
  CONSTRAINT \`oipa_company_id_foreign\` FOREIGN KEY (\`company_id\`) REFERENCES \`companies\` (\`id\`) ON DELETE RESTRICT,
  CONSTRAINT \`oipa_order_confirmation_id_foreign\` FOREIGN KEY (\`order_confirmation_id\`) REFERENCES \`order_confirmations\` (\`id\`) ON DELETE RESTRICT,
  CONSTRAINT \`oipa_order_confirmation_item_id_foreign\` FOREIGN KEY (\`order_confirmation_item_id\`) REFERENCES \`order_confirmation_items\` (\`id\`) ON DELETE RESTRICT,
  CONSTRAINT \`oipa_processing_record_id_foreign\` FOREIGN KEY (\`processing_record_id\`) REFERENCES \`processing_records\` (\`id\`) ON DELETE RESTRICT,
  CONSTRAINT \`oipa_lot_id_foreign\` FOREIGN KEY (\`lot_id\`) REFERENCES \`lots\` (\`id\`) ON DELETE RESTRICT,
  CONSTRAINT \`oipa_product_id_foreign\` FOREIGN KEY (\`product_id\`) REFERENCES \`products\` (\`id\`) ON DELETE RESTRICT,
  CONSTRAINT \`oipa_uom_id_foreign\` FOREIGN KEY (\`uom_id\`) REFERENCES \`uoms\` (\`id\`) ON DELETE RESTRICT,
  CONSTRAINT \`oipa_created_by_foreign\` FOREIGN KEY (\`created_by\`) REFERENCES \`users\` (\`id\`) ON DELETE SET NULL,
  CONSTRAINT \`oipa_cancelled_by_foreign\` FOREIGN KEY (\`cancelled_by\`) REFERENCES \`users\` (\`id\`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);

  for (const name of PERMISSIONS) {
    await connection.query('INSERT IGNORE INTO `permissions` (name, group_name) VALUES (?, ?)', [name, 'Sales']);
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
  await connection.query('DROP TABLE IF EXISTS `order_item_production_allocations`;');
  // Only possible while no order is cancelled.
  await connection.query(`ALTER TABLE \`order_confirmations\`
    DROP FOREIGN KEY \`order_confirmations_cancelled_by_foreign\`,
    DROP FOREIGN KEY \`order_confirmations_brand_id_foreign\`;`);
  await connection.query(`ALTER TABLE \`order_confirmations\`
    DROP INDEX \`order_confirmations_company_id_status_index\`,
    DROP INDEX \`order_confirmations_brand_id_index\`,
    DROP COLUMN \`cancellation_reason\`, DROP COLUMN \`cancelled_by\`, DROP COLUMN \`cancelled_at\`,
    DROP COLUMN \`brand_id\`,
    MODIFY \`status\` ENUM('draft', 'sent', 'confirmed') NOT NULL DEFAULT 'draft';`);
}
