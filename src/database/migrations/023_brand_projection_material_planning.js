/**
 * Brand Projection → Material Requirement → Material Planning.
 *
 * brand_projections / brand_projection_items
 *   A company's manual seasonal projection for one brand. Items carry the
 *   product and a projected quantity; `uom_id` is set server-side from the
 *   product at save time and frozen on the line, so a later change to the
 *   product's UOM cannot silently change the meaning of a recorded quantity.
 *
 * material_requirements
 *   One row per finalized projection item (UNIQUE brand_projection_item_id).
 *   Product, UOM and required quantity are NOT copied — they are read through
 *   the source projection item, which is locked once the projection is
 *   finalized. Requirements are derived records and are hard-deleted (only
 *   while unplanned) so they can be regenerated.
 *
 * material_plans / material_plan_items
 *   Purchase-planning view over requirements. Plan items carry only the
 *   planned quantity; required quantity/product/UOM come from the requirement.
 *
 * Quantities are DECIMAL(18,6) so any UOM's configured decimal places fit.
 * Planning permissions go in a new "Planning" group, granted to Super Admin
 * and Admin. Purely additive — no existing table or row is modified.
 */

const PERMISSIONS = [
  'brand-projection.view', 'brand-projection.create', 'brand-projection.edit', 'brand-projection.delete',
  'material-requirement.view', 'material-requirement.create', 'material-requirement.edit', 'material-requirement.delete',
  'material-plan.view', 'material-plan.create', 'material-plan.edit', 'material-plan.delete',
];
const GRANTED_ROLES = ['Super Admin', 'Admin'];

const userForeignKeys = (table) => `
  CONSTRAINT \`${table}_created_by_foreign\` FOREIGN KEY (\`created_by\`) REFERENCES \`users\` (\`id\`) ON DELETE SET NULL,
  CONSTRAINT \`${table}_updated_by_foreign\` FOREIGN KEY (\`updated_by\`) REFERENCES \`users\` (\`id\`) ON DELETE SET NULL`;

export async function up(connection) {
  await connection.query(`CREATE TABLE \`brand_projections\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`company_id\` BIGINT UNSIGNED NOT NULL,
  \`brand_id\` BIGINT UNSIGNED NOT NULL,
  \`projection_no\` VARCHAR(40) NOT NULL,
  \`financial_year\` VARCHAR(10) NOT NULL,
  \`title\` VARCHAR(200) NOT NULL,
  \`period_start\` DATE NOT NULL,
  \`period_end\` DATE NOT NULL,
  \`status\` ENUM('draft', 'finalized') NOT NULL DEFAULT 'draft',
  \`remarks\` TEXT,
  \`finalized_at\` TIMESTAMP NULL,
  \`finalized_by\` BIGINT UNSIGNED,
  \`created_by\` BIGINT UNSIGNED,
  \`updated_by\` BIGINT UNSIGNED,
  \`created_at\` TIMESTAMP,
  \`updated_at\` TIMESTAMP,
  \`deleted_at\` TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`brand_projections_projection_no_unique\` (\`projection_no\`),
  INDEX \`brand_projections_company_id_status_index\` (\`company_id\`, \`status\`),
  INDEX \`brand_projections_brand_id_index\` (\`brand_id\`),
  INDEX \`brand_projections_period_index\` (\`period_start\`, \`period_end\`),
  CONSTRAINT \`brand_projections_company_id_foreign\` FOREIGN KEY (\`company_id\`) REFERENCES \`companies\` (\`id\`) ON DELETE RESTRICT,
  CONSTRAINT \`brand_projections_brand_id_foreign\` FOREIGN KEY (\`brand_id\`) REFERENCES \`brands\` (\`id\`) ON DELETE RESTRICT,
  CONSTRAINT \`brand_projections_finalized_by_foreign\` FOREIGN KEY (\`finalized_by\`) REFERENCES \`users\` (\`id\`) ON DELETE SET NULL,${userForeignKeys('brand_projections')}
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);

  await connection.query(`CREATE TABLE \`brand_projection_items\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`brand_projection_id\` BIGINT UNSIGNED NOT NULL,
  \`sort_order\` INT UNSIGNED NOT NULL DEFAULT 0,
  \`product_id\` BIGINT UNSIGNED NOT NULL,
  \`uom_id\` BIGINT UNSIGNED NOT NULL,
  \`quantity\` DECIMAL(18, 6) NOT NULL,
  \`remarks\` VARCHAR(500),
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`brand_projection_items_projection_product_unique\` (\`brand_projection_id\`, \`product_id\`),
  INDEX \`brand_projection_items_product_id_index\` (\`product_id\`),
  CONSTRAINT \`brand_projection_items_brand_projection_id_foreign\` FOREIGN KEY (\`brand_projection_id\`) REFERENCES \`brand_projections\` (\`id\`) ON DELETE CASCADE,
  CONSTRAINT \`brand_projection_items_product_id_foreign\` FOREIGN KEY (\`product_id\`) REFERENCES \`products\` (\`id\`) ON DELETE RESTRICT,
  CONSTRAINT \`brand_projection_items_uom_id_foreign\` FOREIGN KEY (\`uom_id\`) REFERENCES \`uoms\` (\`id\`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);

  await connection.query(`CREATE TABLE \`material_requirements\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`company_id\` BIGINT UNSIGNED NOT NULL,
  \`requirement_no\` VARCHAR(40) NOT NULL,
  \`financial_year\` VARCHAR(10) NOT NULL,
  \`brand_projection_id\` BIGINT UNSIGNED NOT NULL,
  \`brand_projection_item_id\` BIGINT UNSIGNED NOT NULL,
  \`status\` ENUM('open', 'planned', 'closed') NOT NULL DEFAULT 'open',
  \`remarks\` TEXT,
  \`created_by\` BIGINT UNSIGNED,
  \`updated_by\` BIGINT UNSIGNED,
  \`created_at\` TIMESTAMP,
  \`updated_at\` TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`material_requirements_requirement_no_unique\` (\`requirement_no\`),
  UNIQUE KEY \`material_requirements_projection_item_unique\` (\`brand_projection_item_id\`),
  INDEX \`material_requirements_company_id_status_index\` (\`company_id\`, \`status\`),
  INDEX \`material_requirements_brand_projection_id_index\` (\`brand_projection_id\`),
  CONSTRAINT \`material_requirements_company_id_foreign\` FOREIGN KEY (\`company_id\`) REFERENCES \`companies\` (\`id\`) ON DELETE RESTRICT,
  CONSTRAINT \`material_requirements_brand_projection_id_foreign\` FOREIGN KEY (\`brand_projection_id\`) REFERENCES \`brand_projections\` (\`id\`) ON DELETE RESTRICT,
  CONSTRAINT \`material_requirements_brand_projection_item_id_foreign\` FOREIGN KEY (\`brand_projection_item_id\`) REFERENCES \`brand_projection_items\` (\`id\`) ON DELETE RESTRICT,${userForeignKeys('material_requirements')}
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);

  await connection.query(`CREATE TABLE \`material_plans\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`company_id\` BIGINT UNSIGNED NOT NULL,
  \`plan_no\` VARCHAR(40) NOT NULL,
  \`financial_year\` VARCHAR(10) NOT NULL,
  \`title\` VARCHAR(200) NOT NULL,
  \`period_start\` DATE NOT NULL,
  \`period_end\` DATE NOT NULL,
  \`status\` ENUM('draft', 'planned', 'closed') NOT NULL DEFAULT 'draft',
  \`remarks\` TEXT,
  \`created_by\` BIGINT UNSIGNED,
  \`updated_by\` BIGINT UNSIGNED,
  \`created_at\` TIMESTAMP,
  \`updated_at\` TIMESTAMP,
  \`deleted_at\` TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`material_plans_plan_no_unique\` (\`plan_no\`),
  INDEX \`material_plans_company_id_status_index\` (\`company_id\`, \`status\`),
  INDEX \`material_plans_period_index\` (\`period_start\`, \`period_end\`),
  CONSTRAINT \`material_plans_company_id_foreign\` FOREIGN KEY (\`company_id\`) REFERENCES \`companies\` (\`id\`) ON DELETE RESTRICT,${userForeignKeys('material_plans')}
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);

  await connection.query(`CREATE TABLE \`material_plan_items\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`material_plan_id\` BIGINT UNSIGNED NOT NULL,
  \`sort_order\` INT UNSIGNED NOT NULL DEFAULT 0,
  \`material_requirement_id\` BIGINT UNSIGNED NOT NULL,
  \`planned_quantity\` DECIMAL(18, 6) NOT NULL,
  \`remarks\` VARCHAR(500),
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`material_plan_items_plan_requirement_unique\` (\`material_plan_id\`, \`material_requirement_id\`),
  INDEX \`material_plan_items_material_requirement_id_index\` (\`material_requirement_id\`),
  CONSTRAINT \`material_plan_items_material_plan_id_foreign\` FOREIGN KEY (\`material_plan_id\`) REFERENCES \`material_plans\` (\`id\`) ON DELETE CASCADE,
  CONSTRAINT \`material_plan_items_material_requirement_id_foreign\` FOREIGN KEY (\`material_requirement_id\`) REFERENCES \`material_requirements\` (\`id\`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);

  for (const name of PERMISSIONS) {
    await connection.query('INSERT IGNORE INTO `permissions` (name, group_name) VALUES (?, ?)', [name, 'Planning']);
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
  await connection.query('DROP TABLE IF EXISTS `material_plan_items`;');
  await connection.query('DROP TABLE IF EXISTS `material_plans`;');
  await connection.query('DROP TABLE IF EXISTS `material_requirements`;');
  await connection.query('DROP TABLE IF EXISTS `brand_projection_items`;');
  await connection.query('DROP TABLE IF EXISTS `brand_projections`;');
}
