/**
 * Material issue + internal processing (Store → Supervisor/Cutting → Foreman).
 *
 * material_issues / material_issue_items
 *   Issue of usable stock from ONE stock location, one line per lot. Draft
 *   (editable, reserves nothing) → issued (posted: one MATERIAL_ISSUE OUT
 *   movement per line in the Phase 7 ledger), or a draft → cancelled.
 *   Receiver, supervisor/cutting and foreman are existing users (no HR table).
 *   A posted issue is immutable — the ledger has no reversal yet.
 *
 * processing_records / processing_record_items
 *   One processing record per issued material issue: per issued lot the
 *   consumed / wastage / balance quantities (issued UOM), and for the job the
 *   produced quantity with its UOM and optionally an existing product (the
 *   hook for finished material later). Quantities are recorded, not derived:
 *   the client has defined no formula relating them. in_process → completed
 *   (then read-only).
 *
 * stock_movements (extended, additive)
 *   movement_type + 'MATERIAL_ISSUE', source_type + 'material_issue',
 *   material_issue_item_id (RESTRICT) with UNIQUE (movement_type,
 *   material_issue_item_id) so an issue line can be posted only once. The
 *   source-consistency CHECK is re-created with the new branch.
 *
 * Permissions (group Production), granted to Super Admin and Admin only:
 *   material-issue.view/create/edit/post/cancel, processing.view/create/edit/complete
 */

const PERMISSIONS = [
  'material-issue.view', 'material-issue.create', 'material-issue.edit', 'material-issue.post', 'material-issue.cancel',
  'processing.view', 'processing.create', 'processing.edit', 'processing.complete',
];
const GRANTED_ROLES = ['Super Admin', 'Admin'];

const OLD_CHECK = `(
    (\`movement_type\` = 'QC_ACCEPTED_RECEIPT' AND \`direction\` = 'in' AND \`source_type\` = 'quality_inspection' AND \`quality_inspection_id\` IS NOT NULL)
    OR (\`movement_type\` = 'STOCK_ADJUSTMENT' AND \`source_type\` = 'stock_adjustment' AND \`quality_inspection_id\` IS NULL AND \`reason\` IS NOT NULL)
  )`;

const userFk = (t, c) => `CONSTRAINT \`${t}_${c}_foreign\` FOREIGN KEY (\`${c}\`) REFERENCES \`users\` (\`id\`) ON DELETE RESTRICT`;
const auditFk = (t, c) => `CONSTRAINT \`${t}_${c}_foreign\` FOREIGN KEY (\`${c}\`) REFERENCES \`users\` (\`id\`) ON DELETE SET NULL`;

export async function up(connection) {
  await connection.query(`CREATE TABLE \`material_issues\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`company_id\` BIGINT UNSIGNED NOT NULL,
  \`issue_no\` VARCHAR(40) NOT NULL,
  \`financial_year\` VARCHAR(10) NOT NULL,
  \`issue_date\` DATE NOT NULL,
  \`location_id\` BIGINT UNSIGNED NOT NULL,
  \`job_reference\` VARCHAR(100),
  \`receiver_user_id\` BIGINT UNSIGNED NULL,
  \`supervisor_user_id\` BIGINT UNSIGNED NULL,
  \`foreman_user_id\` BIGINT UNSIGNED NULL,
  \`remarks\` TEXT,
  \`status\` ENUM('draft', 'issued', 'cancelled') NOT NULL DEFAULT 'draft',
  \`posted_at\` TIMESTAMP NULL,
  \`posted_by\` BIGINT UNSIGNED NULL,
  \`cancelled_at\` TIMESTAMP NULL,
  \`cancelled_by\` BIGINT UNSIGNED NULL,
  \`created_by\` BIGINT UNSIGNED,
  \`updated_by\` BIGINT UNSIGNED,
  \`created_at\` TIMESTAMP,
  \`updated_at\` TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`material_issues_issue_no_unique\` (\`issue_no\`),
  INDEX \`material_issues_company_id_status_index\` (\`company_id\`, \`status\`),
  INDEX \`material_issues_issue_date_index\` (\`issue_date\`),
  INDEX \`material_issues_location_id_index\` (\`location_id\`),
  CONSTRAINT \`material_issues_company_id_foreign\` FOREIGN KEY (\`company_id\`) REFERENCES \`companies\` (\`id\`) ON DELETE RESTRICT,
  CONSTRAINT \`material_issues_location_id_foreign\` FOREIGN KEY (\`location_id\`) REFERENCES \`stock_locations\` (\`id\`) ON DELETE RESTRICT,
  ${userFk('material_issues', 'receiver_user_id')},
  ${userFk('material_issues', 'supervisor_user_id')},
  ${userFk('material_issues', 'foreman_user_id')},
  ${auditFk('material_issues', 'posted_by')},
  ${auditFk('material_issues', 'cancelled_by')},
  ${auditFk('material_issues', 'created_by')},
  ${auditFk('material_issues', 'updated_by')}
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);

  await connection.query(`CREATE TABLE \`material_issue_items\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`material_issue_id\` BIGINT UNSIGNED NOT NULL,
  \`sort_order\` INT UNSIGNED NOT NULL DEFAULT 0,
  \`lot_id\` BIGINT UNSIGNED NOT NULL,
  \`product_id\` BIGINT UNSIGNED NOT NULL,
  \`uom_id\` BIGINT UNSIGNED NULL,
  \`unit\` VARCHAR(20),
  \`quantity\` DECIMAL(18, 6) NOT NULL,
  \`remarks\` TEXT,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`material_issue_items_issue_lot_unique\` (\`material_issue_id\`, \`lot_id\`),
  INDEX \`material_issue_items_lot_id_index\` (\`lot_id\`),
  CONSTRAINT \`material_issue_items_quantity_positive\` CHECK (\`quantity\` > 0),
  CONSTRAINT \`material_issue_items_material_issue_id_foreign\` FOREIGN KEY (\`material_issue_id\`) REFERENCES \`material_issues\` (\`id\`) ON DELETE RESTRICT,
  CONSTRAINT \`material_issue_items_lot_id_foreign\` FOREIGN KEY (\`lot_id\`) REFERENCES \`lots\` (\`id\`) ON DELETE RESTRICT,
  CONSTRAINT \`material_issue_items_product_id_foreign\` FOREIGN KEY (\`product_id\`) REFERENCES \`products\` (\`id\`) ON DELETE RESTRICT,
  CONSTRAINT \`material_issue_items_uom_id_foreign\` FOREIGN KEY (\`uom_id\`) REFERENCES \`uoms\` (\`id\`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);

  // Ledger extension (additive). ALTER does not fire the immutability triggers.
  await connection.query(`ALTER TABLE \`stock_movements\`
    MODIFY \`movement_type\` ENUM('QC_ACCEPTED_RECEIPT', 'STOCK_ADJUSTMENT', 'MATERIAL_ISSUE') NOT NULL,
    MODIFY \`source_type\` ENUM('quality_inspection', 'stock_adjustment', 'material_issue') NOT NULL,
    ADD COLUMN \`material_issue_item_id\` BIGINT UNSIGNED NULL AFTER \`quality_inspection_id\`,
    ADD UNIQUE KEY \`stock_movements_type_material_issue_item_unique\` (\`movement_type\`, \`material_issue_item_id\`),
    ADD CONSTRAINT \`stock_movements_material_issue_item_id_foreign\` FOREIGN KEY (\`material_issue_item_id\`) REFERENCES \`material_issue_items\` (\`id\`) ON DELETE RESTRICT,
    DROP CHECK \`stock_movements_source_consistent\`;`);
  await connection.query(`ALTER TABLE \`stock_movements\`
    ADD CONSTRAINT \`stock_movements_source_consistent\` CHECK (
      (\`movement_type\` = 'QC_ACCEPTED_RECEIPT' AND \`direction\` = 'in' AND \`source_type\` = 'quality_inspection' AND \`quality_inspection_id\` IS NOT NULL AND \`material_issue_item_id\` IS NULL)
      OR (\`movement_type\` = 'STOCK_ADJUSTMENT' AND \`source_type\` = 'stock_adjustment' AND \`quality_inspection_id\` IS NULL AND \`material_issue_item_id\` IS NULL AND \`reason\` IS NOT NULL)
      OR (\`movement_type\` = 'MATERIAL_ISSUE' AND \`direction\` = 'out' AND \`source_type\` = 'material_issue' AND \`quality_inspection_id\` IS NULL AND \`material_issue_item_id\` IS NOT NULL)
    );`);

  await connection.query(`CREATE TABLE \`processing_records\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`company_id\` BIGINT UNSIGNED NOT NULL,
  \`processing_no\` VARCHAR(40) NOT NULL,
  \`financial_year\` VARCHAR(10) NOT NULL,
  \`material_issue_id\` BIGINT UNSIGNED NOT NULL,
  \`start_date\` DATE NOT NULL,
  \`completion_date\` DATE NULL,
  \`produced_product_id\` BIGINT UNSIGNED NULL,
  \`produced_uom_id\` BIGINT UNSIGNED NULL,
  \`produced_unit\` VARCHAR(20),
  \`produced_quantity\` DECIMAL(18, 6) NULL,
  \`remarks\` TEXT,
  \`status\` ENUM('in_process', 'completed') NOT NULL DEFAULT 'in_process',
  \`completed_at\` TIMESTAMP NULL,
  \`completed_by\` BIGINT UNSIGNED NULL,
  \`created_by\` BIGINT UNSIGNED,
  \`updated_by\` BIGINT UNSIGNED,
  \`created_at\` TIMESTAMP,
  \`updated_at\` TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`processing_records_processing_no_unique\` (\`processing_no\`),
  UNIQUE KEY \`processing_records_material_issue_id_unique\` (\`material_issue_id\`),
  INDEX \`processing_records_company_id_status_index\` (\`company_id\`, \`status\`),
  CONSTRAINT \`processing_records_produced_quantity_non_negative\` CHECK (\`produced_quantity\` IS NULL OR \`produced_quantity\` >= 0),
  CONSTRAINT \`processing_records_company_id_foreign\` FOREIGN KEY (\`company_id\`) REFERENCES \`companies\` (\`id\`) ON DELETE RESTRICT,
  CONSTRAINT \`processing_records_material_issue_id_foreign\` FOREIGN KEY (\`material_issue_id\`) REFERENCES \`material_issues\` (\`id\`) ON DELETE RESTRICT,
  CONSTRAINT \`processing_records_produced_product_id_foreign\` FOREIGN KEY (\`produced_product_id\`) REFERENCES \`products\` (\`id\`) ON DELETE RESTRICT,
  CONSTRAINT \`processing_records_produced_uom_id_foreign\` FOREIGN KEY (\`produced_uom_id\`) REFERENCES \`uoms\` (\`id\`) ON DELETE RESTRICT,
  ${auditFk('processing_records', 'completed_by')},
  ${auditFk('processing_records', 'created_by')},
  ${auditFk('processing_records', 'updated_by')}
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);

  await connection.query(`CREATE TABLE \`processing_record_items\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`processing_record_id\` BIGINT UNSIGNED NOT NULL,
  \`material_issue_item_id\` BIGINT UNSIGNED NOT NULL,
  \`lot_id\` BIGINT UNSIGNED NOT NULL,
  \`product_id\` BIGINT UNSIGNED NOT NULL,
  \`uom_id\` BIGINT UNSIGNED NULL,
  \`unit\` VARCHAR(20),
  \`issued_quantity\` DECIMAL(18, 6) NOT NULL,
  \`consumed_quantity\` DECIMAL(18, 6) NULL,
  \`wastage_quantity\` DECIMAL(18, 6) NULL,
  \`balance_quantity\` DECIMAL(18, 6) NULL,
  \`remarks\` TEXT,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`processing_record_items_material_issue_item_unique\` (\`material_issue_item_id\`),
  INDEX \`processing_record_items_lot_id_index\` (\`lot_id\`),
  CONSTRAINT \`processing_record_items_quantities_non_negative\` CHECK (
    (\`consumed_quantity\` IS NULL OR \`consumed_quantity\` >= 0)
    AND (\`wastage_quantity\` IS NULL OR \`wastage_quantity\` >= 0)
    AND (\`balance_quantity\` IS NULL OR \`balance_quantity\` >= 0)
  ),
  CONSTRAINT \`processing_record_items_processing_record_id_foreign\` FOREIGN KEY (\`processing_record_id\`) REFERENCES \`processing_records\` (\`id\`) ON DELETE RESTRICT,
  CONSTRAINT \`processing_record_items_material_issue_item_id_foreign\` FOREIGN KEY (\`material_issue_item_id\`) REFERENCES \`material_issue_items\` (\`id\`) ON DELETE RESTRICT,
  CONSTRAINT \`processing_record_items_lot_id_foreign\` FOREIGN KEY (\`lot_id\`) REFERENCES \`lots\` (\`id\`) ON DELETE RESTRICT,
  CONSTRAINT \`processing_record_items_product_id_foreign\` FOREIGN KEY (\`product_id\`) REFERENCES \`products\` (\`id\`) ON DELETE RESTRICT,
  CONSTRAINT \`processing_record_items_uom_id_foreign\` FOREIGN KEY (\`uom_id\`) REFERENCES \`uoms\` (\`id\`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);

  for (const name of PERMISSIONS) {
    await connection.query('INSERT IGNORE INTO `permissions` (name, group_name) VALUES (?, ?)', [name, 'Production']);
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
  await connection.query('DROP TABLE IF EXISTS `processing_record_items`;');
  await connection.query('DROP TABLE IF EXISTS `processing_records`;');
  await connection.query(`ALTER TABLE \`stock_movements\`
    DROP CHECK \`stock_movements_source_consistent\`,
    DROP FOREIGN KEY \`stock_movements_material_issue_item_id_foreign\`;`);
  await connection.query(`ALTER TABLE \`stock_movements\`
    DROP INDEX \`stock_movements_type_material_issue_item_unique\`,
    DROP COLUMN \`material_issue_item_id\`,
    MODIFY \`movement_type\` ENUM('QC_ACCEPTED_RECEIPT', 'STOCK_ADJUSTMENT') NOT NULL,
    MODIFY \`source_type\` ENUM('quality_inspection', 'stock_adjustment') NOT NULL,
    ADD CONSTRAINT \`stock_movements_source_consistent\` CHECK ${OLD_CHECK};`);
  await connection.query('DROP TABLE IF EXISTS `material_issue_items`;');
  await connection.query('DROP TABLE IF EXISTS `material_issues`;');
}
