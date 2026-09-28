/**
 * Production planning (client requirement 12): once material requirements are
 * finalised, plan what to produce — planned quantity, material availability,
 * produced quantity, pending quantity and production status.
 *
 *   production_plans        company-scoped header (PP/<FY>/nnn), draft →
 *                           planned → completed, or cancelled.
 *   production_plan_items   what to produce: a finished product of the plan's
 *                           company, its planned quantity (in the product's UOM)
 *                           and, optionally, the order line it is for.
 *   processing_records.production_plan_item_id
 *                           a processing record may be booked against a plan
 *                           line; its posted output is that line's produced
 *                           quantity. Nothing else is derived or enforced.
 *
 * Permissions production-plan.* go to Super Admin and Admin only.
 */
const PERMISSIONS = ['production-plan.view', 'production-plan.create', 'production-plan.edit', 'production-plan.delete'];
const GRANTED_ROLES = ['Super Admin', 'Admin'];

export async function up(connection) {
  await connection.query(`CREATE TABLE IF NOT EXISTS \`production_plans\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`company_id\` BIGINT UNSIGNED NOT NULL,
  \`plan_no\` VARCHAR(40) NOT NULL,
  \`financial_year\` VARCHAR(10) NOT NULL,
  \`title\` VARCHAR(200) NOT NULL,
  \`plan_date\` DATE NOT NULL,
  \`target_date\` DATE NULL,
  \`status\` ENUM('draft', 'planned', 'completed', 'cancelled') NOT NULL DEFAULT 'draft',
  \`remarks\` TEXT NULL,
  \`planned_at\` TIMESTAMP NULL,
  \`planned_by\` BIGINT UNSIGNED NULL,
  \`closed_at\` TIMESTAMP NULL,
  \`closed_by\` BIGINT UNSIGNED NULL,
  \`cancellation_reason\` VARCHAR(500) NULL,
  \`created_by\` BIGINT UNSIGNED NULL,
  \`updated_by\` BIGINT UNSIGNED NULL,
  \`created_at\` TIMESTAMP NULL,
  \`updated_at\` TIMESTAMP NULL,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`production_plans_plan_no_unique\` (\`plan_no\`),
  INDEX \`production_plans_company_status_index\` (\`company_id\`, \`status\`),
  CONSTRAINT \`production_plans_company_id_foreign\` FOREIGN KEY (\`company_id\`) REFERENCES \`companies\` (\`id\`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);

  await connection.query(`CREATE TABLE IF NOT EXISTS \`production_plan_items\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`production_plan_id\` BIGINT UNSIGNED NOT NULL,
  \`sort_order\` INT UNSIGNED NOT NULL DEFAULT 0,
  \`product_id\` BIGINT UNSIGNED NOT NULL,
  \`uom_id\` BIGINT UNSIGNED NOT NULL,
  \`unit\` VARCHAR(20) NULL,
  \`planned_quantity\` DECIMAL(18,6) NOT NULL,
  \`order_confirmation_item_id\` BIGINT UNSIGNED NULL,
  \`remarks\` VARCHAR(1000) NULL,
  \`created_at\` TIMESTAMP NULL,
  \`updated_at\` TIMESTAMP NULL,
  PRIMARY KEY (\`id\`),
  INDEX \`ppi_product_id_index\` (\`product_id\`),
  CONSTRAINT \`ppi_plan_id_foreign\` FOREIGN KEY (\`production_plan_id\`) REFERENCES \`production_plans\` (\`id\`) ON DELETE CASCADE,
  CONSTRAINT \`ppi_product_id_foreign\` FOREIGN KEY (\`product_id\`) REFERENCES \`products\` (\`id\`) ON DELETE RESTRICT,
  CONSTRAINT \`ppi_uom_id_foreign\` FOREIGN KEY (\`uom_id\`) REFERENCES \`uoms\` (\`id\`) ON DELETE RESTRICT,
  CONSTRAINT \`ppi_oc_item_id_foreign\` FOREIGN KEY (\`order_confirmation_item_id\`) REFERENCES \`order_confirmation_items\` (\`id\`) ON DELETE SET NULL,
  CONSTRAINT \`ppi_planned_quantity_positive\` CHECK (\`planned_quantity\` > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);

  const [[col]] = await connection.query(
    "SELECT COUNT(*) AS n FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'processing_records' AND COLUMN_NAME = 'production_plan_item_id'"
  );
  if (!col.n) {
    await connection.query(`ALTER TABLE \`processing_records\`
      ADD COLUMN \`production_plan_item_id\` BIGINT UNSIGNED NULL AFTER \`material_issue_id\`,
      ADD CONSTRAINT \`processing_records_plan_item_foreign\` FOREIGN KEY (\`production_plan_item_id\`) REFERENCES \`production_plan_items\` (\`id\`) ON DELETE RESTRICT`);
  }

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
  const [[col]] = await connection.query(
    "SELECT COUNT(*) AS n FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'processing_records' AND COLUMN_NAME = 'production_plan_item_id'"
  );
  if (col.n) {
    await connection.query('ALTER TABLE `processing_records` DROP FOREIGN KEY `processing_records_plan_item_foreign`');
    await connection.query('ALTER TABLE `processing_records` DROP COLUMN `production_plan_item_id`');
  }
  await connection.query('DROP TABLE IF EXISTS `production_plan_items`');
  await connection.query('DROP TABLE IF EXISTS `production_plans`');
}
