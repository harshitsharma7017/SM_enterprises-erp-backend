/**
 * Finished material: production output posted to stock.
 *
 * lots (extended) — the stock identity stays the lot
 *   The lot is what every Phase 7/8 stock query, balance, ledger row and
 *   adjustment keys on. Production output becomes its own lot rather than a
 *   second identity beside it:
 *   - source_type: 'grn' (every existing row — default) or 'production'.
 *   - processing_record_id (UNIQUE, RESTRICT): the processing record whose
 *     output the lot is — one output lot per processing record.
 *   - GRN/PO/supplier columns and width become NULLable; a CHECK keeps them
 *     mandatory for GRN lots and absent for production lots. Existing rows
 *     are untouched.
 *
 * processing_records (extended)
 *   output_posted_at / output_posted_by: completion and stock posting stay
 *   separate, explicit actions. The status enum is unchanged.
 *
 * stock_movements (extended)
 *   movement_type + 'PRODUCTION_OUTPUT' (IN), source_type + 'processing_record',
 *   processing_record_id (RESTRICT) with UNIQUE (movement_type,
 *   processing_record_id): a record's output can be posted exactly once. The
 *   source-consistency CHECK is re-created with the new branch; the
 *   immutability triggers are untouched.
 *
 * Permission processing.post (group Production), Super Admin and Admin only.
 */

const PERMISSIONS = ['processing.post'];
const GRANTED_ROLES = ['Super Admin', 'Admin'];

const CHECK_P8 = `(
  (\`movement_type\` = 'QC_ACCEPTED_RECEIPT' AND \`direction\` = 'in' AND \`source_type\` = 'quality_inspection' AND \`quality_inspection_id\` IS NOT NULL AND \`material_issue_item_id\` IS NULL)
  OR (\`movement_type\` = 'STOCK_ADJUSTMENT' AND \`source_type\` = 'stock_adjustment' AND \`quality_inspection_id\` IS NULL AND \`material_issue_item_id\` IS NULL AND \`reason\` IS NOT NULL)
  OR (\`movement_type\` = 'MATERIAL_ISSUE' AND \`direction\` = 'out' AND \`source_type\` = 'material_issue' AND \`quality_inspection_id\` IS NULL AND \`material_issue_item_id\` IS NOT NULL)
)`;

export async function up(connection) {
  await connection.query(`ALTER TABLE \`lots\`
    ADD COLUMN \`source_type\` ENUM('grn', 'production') NOT NULL DEFAULT 'grn' AFTER \`financial_year\`,
    ADD COLUMN \`processing_record_id\` BIGINT UNSIGNED NULL AFTER \`source_type\`,
    MODIFY \`inward_entry_id\` BIGINT UNSIGNED NULL,
    MODIFY \`inward_entry_item_id\` BIGINT UNSIGNED NULL,
    MODIFY \`purchase_order_id\` BIGINT UNSIGNED NULL,
    MODIFY \`purchase_order_item_id\` BIGINT UNSIGNED NULL,
    MODIFY \`supplier_id\` BIGINT UNSIGNED NULL,
    MODIFY \`width_inch\` DECIMAL(10, 3) NULL,
    ADD UNIQUE KEY \`lots_processing_record_id_unique\` (\`processing_record_id\`),
    ADD INDEX \`lots_source_type_index\` (\`source_type\`),
    ADD CONSTRAINT \`lots_processing_record_id_foreign\` FOREIGN KEY (\`processing_record_id\`) REFERENCES \`processing_records\` (\`id\`) ON DELETE RESTRICT;`);
  await connection.query(`ALTER TABLE \`lots\`
    ADD CONSTRAINT \`lots_source_consistent\` CHECK (
      (\`source_type\` = 'grn' AND \`processing_record_id\` IS NULL AND \`inward_entry_id\` IS NOT NULL AND \`inward_entry_item_id\` IS NOT NULL
        AND \`purchase_order_id\` IS NOT NULL AND \`purchase_order_item_id\` IS NOT NULL AND \`supplier_id\` IS NOT NULL AND \`width_inch\` IS NOT NULL)
      OR (\`source_type\` = 'production' AND \`processing_record_id\` IS NOT NULL AND \`inward_entry_id\` IS NULL AND \`inward_entry_item_id\` IS NULL
        AND \`purchase_order_id\` IS NULL AND \`purchase_order_item_id\` IS NULL AND \`supplier_id\` IS NULL)
    );`);

  await connection.query(`ALTER TABLE \`processing_records\`
    ADD COLUMN \`output_posted_at\` TIMESTAMP NULL AFTER \`completed_by\`,
    ADD COLUMN \`output_posted_by\` BIGINT UNSIGNED NULL AFTER \`output_posted_at\`,
    ADD CONSTRAINT \`processing_records_output_posted_by_foreign\` FOREIGN KEY (\`output_posted_by\`) REFERENCES \`users\` (\`id\`) ON DELETE SET NULL;`);

  // Ledger extension (additive). ALTER does not fire the immutability triggers.
  await connection.query(`ALTER TABLE \`stock_movements\`
    MODIFY \`movement_type\` ENUM('QC_ACCEPTED_RECEIPT', 'STOCK_ADJUSTMENT', 'MATERIAL_ISSUE', 'PRODUCTION_OUTPUT') NOT NULL,
    MODIFY \`source_type\` ENUM('quality_inspection', 'stock_adjustment', 'material_issue', 'processing_record') NOT NULL,
    ADD COLUMN \`processing_record_id\` BIGINT UNSIGNED NULL AFTER \`material_issue_item_id\`,
    ADD UNIQUE KEY \`stock_movements_type_processing_record_unique\` (\`movement_type\`, \`processing_record_id\`),
    ADD CONSTRAINT \`stock_movements_processing_record_id_foreign\` FOREIGN KEY (\`processing_record_id\`) REFERENCES \`processing_records\` (\`id\`) ON DELETE RESTRICT,
    DROP CHECK \`stock_movements_source_consistent\`;`);
  await connection.query(`ALTER TABLE \`stock_movements\`
    ADD CONSTRAINT \`stock_movements_source_consistent\` CHECK (
      (\`movement_type\` = 'QC_ACCEPTED_RECEIPT' AND \`direction\` = 'in' AND \`source_type\` = 'quality_inspection' AND \`quality_inspection_id\` IS NOT NULL AND \`material_issue_item_id\` IS NULL AND \`processing_record_id\` IS NULL)
      OR (\`movement_type\` = 'STOCK_ADJUSTMENT' AND \`source_type\` = 'stock_adjustment' AND \`quality_inspection_id\` IS NULL AND \`material_issue_item_id\` IS NULL AND \`processing_record_id\` IS NULL AND \`reason\` IS NOT NULL)
      OR (\`movement_type\` = 'MATERIAL_ISSUE' AND \`direction\` = 'out' AND \`source_type\` = 'material_issue' AND \`quality_inspection_id\` IS NULL AND \`material_issue_item_id\` IS NOT NULL AND \`processing_record_id\` IS NULL)
      OR (\`movement_type\` = 'PRODUCTION_OUTPUT' AND \`direction\` = 'in' AND \`source_type\` = 'processing_record' AND \`quality_inspection_id\` IS NULL AND \`material_issue_item_id\` IS NULL AND \`processing_record_id\` IS NOT NULL)
    );`);

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
  await connection.query(`ALTER TABLE \`stock_movements\`
    DROP CHECK \`stock_movements_source_consistent\`,
    DROP FOREIGN KEY \`stock_movements_processing_record_id_foreign\`;`);
  await connection.query(`ALTER TABLE \`stock_movements\`
    DROP INDEX \`stock_movements_type_processing_record_unique\`,
    DROP COLUMN \`processing_record_id\`,
    MODIFY \`movement_type\` ENUM('QC_ACCEPTED_RECEIPT', 'STOCK_ADJUSTMENT', 'MATERIAL_ISSUE') NOT NULL,
    MODIFY \`source_type\` ENUM('quality_inspection', 'stock_adjustment', 'material_issue') NOT NULL,
    ADD CONSTRAINT \`stock_movements_source_consistent\` CHECK ${CHECK_P8};`);
  await connection.query(`ALTER TABLE \`processing_records\`
    DROP FOREIGN KEY \`processing_records_output_posted_by_foreign\`,
    DROP COLUMN \`output_posted_by\`, DROP COLUMN \`output_posted_at\`;`);
  // Only possible while no production lots exist.
  await connection.query(`ALTER TABLE \`lots\`
    DROP CHECK \`lots_source_consistent\`,
    DROP FOREIGN KEY \`lots_processing_record_id_foreign\`;`);
  await connection.query(`ALTER TABLE \`lots\`
    DROP INDEX \`lots_source_type_index\`,
    DROP INDEX \`lots_processing_record_id_unique\`,
    DROP COLUMN \`processing_record_id\`, DROP COLUMN \`source_type\`,
    MODIFY \`inward_entry_id\` BIGINT UNSIGNED NOT NULL,
    MODIFY \`inward_entry_item_id\` BIGINT UNSIGNED NOT NULL,
    MODIFY \`purchase_order_id\` BIGINT UNSIGNED NOT NULL,
    MODIFY \`purchase_order_item_id\` BIGINT UNSIGNED NOT NULL,
    MODIFY \`supplier_id\` BIGINT UNSIGNED NOT NULL,
    MODIFY \`width_inch\` DECIMAL(10, 3) NOT NULL;`);
}
