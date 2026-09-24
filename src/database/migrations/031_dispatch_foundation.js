/**
 * Dispatch & delivery foundation — one dispatch system, two types.
 *
 * dispatches (header)
 *   - STOCK_DISPATCH: finished material leaving ERP stock against a CONFIRMED
 *     order (order_confirmation_id, source location_id). Each posted line
 *     writes one DISPATCH OUT movement in the Phase 7 ledger.
 *   - DIRECT_SUPPLIER_DISPATCH: the mill ships a PO's material straight to
 *     the customer / vendor (purchase_order_id, supplier_id). The material
 *     never enters ERP stock, so no stock movement and no GRN are created.
 *   draft (reserves nothing) → posted (immutable), or draft → cancelled.
 *   Destination (buyer and/or a named vendor/address), transport and
 *   document / invoice references are recorded as entered.
 *
 * dispatch_items (lines)
 *   Stock line: order_confirmation_item_id + finished lot. Direct line:
 *   purchase_order_item_id (+ the order item the PO line was raised from,
 *   when there is one). Product, UOM and unit are derived server-side.
 *
 * stock_movements (extended)
 *   movement_type + 'DISPATCH' (OUT), source_type + 'dispatch',
 *   dispatch_item_id (RESTRICT) with UNIQUE (movement_type, dispatch_item_id);
 *   the source-consistency CHECK is re-created; immutability triggers untouched.
 *
 * Permissions dispatch.view/create/edit/post/cancel (group Dispatch), Super
 * Admin and Admin only.
 */

const PERMISSIONS = ['dispatch.view', 'dispatch.create', 'dispatch.edit', 'dispatch.post', 'dispatch.cancel'];
const GRANTED_ROLES = ['Super Admin', 'Admin'];

const CHECK_P9 = `(
  (\`movement_type\` = 'QC_ACCEPTED_RECEIPT' AND \`direction\` = 'in' AND \`source_type\` = 'quality_inspection' AND \`quality_inspection_id\` IS NOT NULL AND \`material_issue_item_id\` IS NULL AND \`processing_record_id\` IS NULL)
  OR (\`movement_type\` = 'STOCK_ADJUSTMENT' AND \`source_type\` = 'stock_adjustment' AND \`quality_inspection_id\` IS NULL AND \`material_issue_item_id\` IS NULL AND \`processing_record_id\` IS NULL AND \`reason\` IS NOT NULL)
  OR (\`movement_type\` = 'MATERIAL_ISSUE' AND \`direction\` = 'out' AND \`source_type\` = 'material_issue' AND \`quality_inspection_id\` IS NULL AND \`material_issue_item_id\` IS NOT NULL AND \`processing_record_id\` IS NULL)
  OR (\`movement_type\` = 'PRODUCTION_OUTPUT' AND \`direction\` = 'in' AND \`source_type\` = 'processing_record' AND \`quality_inspection_id\` IS NULL AND \`material_issue_item_id\` IS NULL AND \`processing_record_id\` IS NOT NULL)
)`;

const fk = (t, c, ref, action = 'RESTRICT') => `CONSTRAINT \`${t}_${c}_foreign\` FOREIGN KEY (\`${c}\`) REFERENCES \`${ref}\` (\`id\`) ON DELETE ${action}`;

export async function up(connection) {
  await connection.query(`CREATE TABLE \`dispatches\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`company_id\` BIGINT UNSIGNED NOT NULL,
  \`dispatch_no\` VARCHAR(40) NOT NULL,
  \`financial_year\` VARCHAR(10) NOT NULL,
  \`dispatch_date\` DATE NOT NULL,
  \`dispatch_type\` ENUM('STOCK_DISPATCH', 'DIRECT_SUPPLIER_DISPATCH') NOT NULL,
  \`buyer_id\` BIGINT UNSIGNED NULL,
  \`order_confirmation_id\` BIGINT UNSIGNED NULL,
  \`purchase_order_id\` BIGINT UNSIGNED NULL,
  \`supplier_id\` BIGINT UNSIGNED NULL,
  \`location_id\` BIGINT UNSIGNED NULL,
  \`destination_name\` VARCHAR(200),
  \`destination_address\` TEXT,
  \`transporter\` VARCHAR(150),
  \`vehicle_no\` VARCHAR(50),
  \`document_reference\` VARCHAR(100),
  \`invoice_reference\` VARCHAR(100),
  \`remarks\` TEXT,
  \`status\` ENUM('draft', 'posted', 'cancelled') NOT NULL DEFAULT 'draft',
  \`posted_at\` TIMESTAMP NULL,
  \`posted_by\` BIGINT UNSIGNED NULL,
  \`cancelled_at\` TIMESTAMP NULL,
  \`cancelled_by\` BIGINT UNSIGNED NULL,
  \`cancellation_reason\` VARCHAR(500),
  \`created_by\` BIGINT UNSIGNED,
  \`updated_by\` BIGINT UNSIGNED,
  \`created_at\` TIMESTAMP,
  \`updated_at\` TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`dispatches_dispatch_no_unique\` (\`dispatch_no\`),
  INDEX \`dispatches_company_id_status_index\` (\`company_id\`, \`status\`),
  INDEX \`dispatches_dispatch_date_index\` (\`dispatch_date\`),
  INDEX \`dispatches_dispatch_type_index\` (\`dispatch_type\`),
  INDEX \`dispatches_buyer_id_index\` (\`buyer_id\`),
  INDEX \`dispatches_order_confirmation_id_index\` (\`order_confirmation_id\`),
  INDEX \`dispatches_purchase_order_id_index\` (\`purchase_order_id\`),
  INDEX \`dispatches_supplier_id_index\` (\`supplier_id\`),
  CONSTRAINT \`dispatches_type_source_consistent\` CHECK (
    (\`dispatch_type\` = 'STOCK_DISPATCH' AND \`order_confirmation_id\` IS NOT NULL AND \`location_id\` IS NOT NULL AND \`purchase_order_id\` IS NULL)
    OR (\`dispatch_type\` = 'DIRECT_SUPPLIER_DISPATCH' AND \`purchase_order_id\` IS NOT NULL AND \`supplier_id\` IS NOT NULL AND \`location_id\` IS NULL)
  ),
  ${fk('dispatches', 'company_id', 'companies')},
  ${fk('dispatches', 'buyer_id', 'buyers')},
  ${fk('dispatches', 'order_confirmation_id', 'order_confirmations')},
  ${fk('dispatches', 'purchase_order_id', 'purchase_orders')},
  ${fk('dispatches', 'supplier_id', 'suppliers')},
  ${fk('dispatches', 'location_id', 'stock_locations')},
  ${fk('dispatches', 'posted_by', 'users', 'SET NULL')},
  ${fk('dispatches', 'cancelled_by', 'users', 'SET NULL')},
  ${fk('dispatches', 'created_by', 'users', 'SET NULL')},
  ${fk('dispatches', 'updated_by', 'users', 'SET NULL')}
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);

  await connection.query(`CREATE TABLE \`dispatch_items\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`dispatch_id\` BIGINT UNSIGNED NOT NULL,
  \`sort_order\` INT UNSIGNED NOT NULL DEFAULT 0,
  \`order_confirmation_item_id\` BIGINT UNSIGNED NULL,
  \`lot_id\` BIGINT UNSIGNED NULL,
  \`purchase_order_item_id\` BIGINT UNSIGNED NULL,
  \`product_id\` BIGINT UNSIGNED NOT NULL,
  \`uom_id\` BIGINT UNSIGNED NULL,
  \`unit\` VARCHAR(20),
  \`quantity\` DECIMAL(18, 6) NOT NULL,
  \`remarks\` TEXT,
  PRIMARY KEY (\`id\`),
  INDEX \`dispatch_items_dispatch_id_index\` (\`dispatch_id\`),
  INDEX \`dispatch_items_order_confirmation_item_id_index\` (\`order_confirmation_item_id\`),
  INDEX \`dispatch_items_lot_id_index\` (\`lot_id\`),
  INDEX \`dispatch_items_purchase_order_item_id_index\` (\`purchase_order_item_id\`),
  INDEX \`dispatch_items_product_id_index\` (\`product_id\`),
  CONSTRAINT \`dispatch_items_quantity_positive\` CHECK (\`quantity\` > 0),
  CONSTRAINT \`dispatch_items_source_consistent\` CHECK (
    (\`lot_id\` IS NOT NULL AND \`order_confirmation_item_id\` IS NOT NULL AND \`purchase_order_item_id\` IS NULL)
    OR (\`lot_id\` IS NULL AND \`purchase_order_item_id\` IS NOT NULL)
  ),
  ${fk('dispatch_items', 'dispatch_id', 'dispatches')},
  ${fk('dispatch_items', 'order_confirmation_item_id', 'order_confirmation_items')},
  ${fk('dispatch_items', 'lot_id', 'lots')},
  ${fk('dispatch_items', 'purchase_order_item_id', 'purchase_order_items')},
  ${fk('dispatch_items', 'product_id', 'products')},
  ${fk('dispatch_items', 'uom_id', 'uoms')}
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);

  // Ledger extension (additive). ALTER does not fire the immutability triggers.
  await connection.query(`ALTER TABLE \`stock_movements\`
    MODIFY \`movement_type\` ENUM('QC_ACCEPTED_RECEIPT', 'STOCK_ADJUSTMENT', 'MATERIAL_ISSUE', 'PRODUCTION_OUTPUT', 'DISPATCH') NOT NULL,
    MODIFY \`source_type\` ENUM('quality_inspection', 'stock_adjustment', 'material_issue', 'processing_record', 'dispatch') NOT NULL,
    ADD COLUMN \`dispatch_item_id\` BIGINT UNSIGNED NULL AFTER \`processing_record_id\`,
    ADD UNIQUE KEY \`stock_movements_type_dispatch_item_unique\` (\`movement_type\`, \`dispatch_item_id\`),
    ADD CONSTRAINT \`stock_movements_dispatch_item_id_foreign\` FOREIGN KEY (\`dispatch_item_id\`) REFERENCES \`dispatch_items\` (\`id\`) ON DELETE RESTRICT,
    DROP CHECK \`stock_movements_source_consistent\`;`);
  await connection.query(`ALTER TABLE \`stock_movements\`
    ADD CONSTRAINT \`stock_movements_source_consistent\` CHECK (
      (\`movement_type\` = 'QC_ACCEPTED_RECEIPT' AND \`direction\` = 'in' AND \`source_type\` = 'quality_inspection' AND \`quality_inspection_id\` IS NOT NULL AND \`material_issue_item_id\` IS NULL AND \`processing_record_id\` IS NULL AND \`dispatch_item_id\` IS NULL)
      OR (\`movement_type\` = 'STOCK_ADJUSTMENT' AND \`source_type\` = 'stock_adjustment' AND \`quality_inspection_id\` IS NULL AND \`material_issue_item_id\` IS NULL AND \`processing_record_id\` IS NULL AND \`dispatch_item_id\` IS NULL AND \`reason\` IS NOT NULL)
      OR (\`movement_type\` = 'MATERIAL_ISSUE' AND \`direction\` = 'out' AND \`source_type\` = 'material_issue' AND \`quality_inspection_id\` IS NULL AND \`material_issue_item_id\` IS NOT NULL AND \`processing_record_id\` IS NULL AND \`dispatch_item_id\` IS NULL)
      OR (\`movement_type\` = 'PRODUCTION_OUTPUT' AND \`direction\` = 'in' AND \`source_type\` = 'processing_record' AND \`quality_inspection_id\` IS NULL AND \`material_issue_item_id\` IS NULL AND \`processing_record_id\` IS NOT NULL AND \`dispatch_item_id\` IS NULL)
      OR (\`movement_type\` = 'DISPATCH' AND \`direction\` = 'out' AND \`source_type\` = 'dispatch' AND \`quality_inspection_id\` IS NULL AND \`material_issue_item_id\` IS NULL AND \`processing_record_id\` IS NULL AND \`dispatch_item_id\` IS NOT NULL)
    );`);

  for (const name of PERMISSIONS) {
    await connection.query('INSERT IGNORE INTO `permissions` (name, group_name) VALUES (?, ?)', [name, 'Dispatch']);
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
  await connection.query(`ALTER TABLE \`stock_movements\`
    DROP CHECK \`stock_movements_source_consistent\`,
    DROP FOREIGN KEY \`stock_movements_dispatch_item_id_foreign\`;`);
  await connection.query(`ALTER TABLE \`stock_movements\`
    DROP INDEX \`stock_movements_type_dispatch_item_unique\`,
    DROP COLUMN \`dispatch_item_id\`,
    MODIFY \`movement_type\` ENUM('QC_ACCEPTED_RECEIPT', 'STOCK_ADJUSTMENT', 'MATERIAL_ISSUE', 'PRODUCTION_OUTPUT') NOT NULL,
    MODIFY \`source_type\` ENUM('quality_inspection', 'stock_adjustment', 'material_issue', 'processing_record') NOT NULL,
    ADD CONSTRAINT \`stock_movements_source_consistent\` CHECK ${CHECK_P9};`);
  await connection.query('DROP TABLE IF EXISTS `dispatch_items`;');
  await connection.query('DROP TABLE IF EXISTS `dispatches`;');
}
