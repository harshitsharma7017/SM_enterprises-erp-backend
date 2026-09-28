/**
 * Brand-wise material specifications (client requirement 11): different
 * brands ask for the same material with a different design, quality, width,
 * colour or printing. One row per brand + product holds that brand's spec,
 * shown wherever the brand's material appears (projection lines, order items,
 * purchase orders and the PO document).
 *
 * All spec fields are free text: width is "44 inch" for pocketing but
 * "32 mm" for waistband/elastic, so no unit is imposed. Managed from the brand
 * master under the existing brand.view / brand.edit permissions.
 */

export async function up(connection) {
  await connection.query(`CREATE TABLE IF NOT EXISTS \`brand_product_specs\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`brand_id\` BIGINT UNSIGNED NOT NULL,
  \`product_id\` BIGINT UNSIGNED NOT NULL,
  \`design\` VARCHAR(150) NULL,
  \`quality\` VARCHAR(150) NULL,
  \`width\` VARCHAR(60) NULL,
  \`colour\` VARCHAR(100) NULL,
  \`printing\` VARCHAR(255) NULL,
  \`specification\` TEXT NULL,
  \`remarks\` TEXT NULL,
  \`status\` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  \`created_by\` BIGINT UNSIGNED NULL,
  \`updated_by\` BIGINT UNSIGNED NULL,
  \`created_at\` TIMESTAMP NULL,
  \`updated_at\` TIMESTAMP NULL,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`bps_brand_product_unique\` (\`brand_id\`, \`product_id\`),
  INDEX \`bps_product_id_index\` (\`product_id\`),
  CONSTRAINT \`bps_brand_id_foreign\` FOREIGN KEY (\`brand_id\`) REFERENCES \`brands\` (\`id\`) ON DELETE CASCADE,
  CONSTRAINT \`bps_product_id_foreign\` FOREIGN KEY (\`product_id\`) REFERENCES \`products\` (\`id\`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);
}

export async function down(connection) {
  await connection.query('DROP TABLE IF EXISTS `brand_product_specs`;');
}
