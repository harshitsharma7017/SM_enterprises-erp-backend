export async function up(connection) {
  await connection.query(`CREATE TABLE \`categories\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`code\` VARCHAR(20) NOT NULL,
  \`name\` VARCHAR(120) NOT NULL,
  \`description\` TEXT,
  \`status\` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  \`remarks\` TEXT,
  \`created_by\` BIGINT UNSIGNED,
  \`updated_by\` BIGINT UNSIGNED,
  \`created_at\` TIMESTAMP,
  \`updated_at\` TIMESTAMP,
  \`deleted_at\` TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`categories_code_unique\` (\`code\`),
  UNIQUE KEY \`categories_name_unique\` (\`name\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);

  await connection.query(`CREATE TABLE \`products\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`category_id\` BIGINT UNSIGNED NOT NULL,
  \`item_group_code\` VARCHAR(20) NOT NULL,
  \`name\` VARCHAR(200) NOT NULL,
  \`name_on_export_document\` VARCHAR(255),
  \`barcode\` VARCHAR(60),
  \`unit_po\` VARCHAR(20),
  \`unit_export\` VARCHAR(20),
  \`hsn_code\` VARCHAR(12),
  \`drawback_sr_no\` VARCHAR(20),
  \`price_band_id\` BIGINT UNSIGNED,
  \`gst_rate_id\` BIGINT UNSIGNED,
  \`fabric_length_mtr\` DECIMAL(10, 3),
  \`fabric_width_inch\` DECIMAL(10, 3),
  \`description\` TEXT,
  \`status\` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  \`remarks\` TEXT,
  \`created_by\` BIGINT UNSIGNED,
  \`updated_by\` BIGINT UNSIGNED,
  \`created_at\` TIMESTAMP,
  \`updated_at\` TIMESTAMP,
  \`deleted_at\` TIMESTAMP,
  \`comments\` TEXT,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`products_item_group_code_unique\` (\`item_group_code\`),
  UNIQUE KEY \`products_name_unique\` (\`name\`),
  INDEX \`products_category_id_status_index\` (\`category_id\`, \`status\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);

  await connection.query(`CREATE TABLE \`product_incentives\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`product_id\` BIGINT UNSIGNED NOT NULL,
  \`scheme\` ENUM('drawback', 'rosctl', 'rodtep') NOT NULL,
  \`percent_1\` DECIMAL(6, 3),
  \`percent_2\` DECIMAL(6, 3),
  \`cap_value\` DECIMAL(12, 4),
  \`created_at\` TIMESTAMP,
  \`updated_at\` TIMESTAMP,
  \`calculation_basis_id\` BIGINT UNSIGNED,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`product_incentives_product_id_scheme_unique\` (\`product_id\`, \`scheme\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);

  await connection.query(`CREATE TABLE \`product_bom_items\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`product_id\` BIGINT UNSIGNED NOT NULL,
  \`sort_order\` INT UNSIGNED NOT NULL DEFAULT 0,
  \`component_name\` VARCHAR(200) NOT NULL,
  \`qty\` DECIMAL(12, 4) NOT NULL DEFAULT 1,
  \`unit\` VARCHAR(20),
  \`is_custom\` TINYINT(1) NOT NULL DEFAULT 1,
  \`remarks\` VARCHAR(500),
  \`created_at\` TIMESTAMP,
  \`updated_at\` TIMESTAMP,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);

  await connection.query(`CREATE TABLE \`category_format\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`category_id\` BIGINT UNSIGNED NOT NULL,
  \`document_format_id\` BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`category_format_category_id_document_format_id_unique\` (\`category_id\`, \`document_format_id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);

  await connection.query(`CREATE TABLE \`document_format_units\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`document_format_id\` BIGINT UNSIGNED NOT NULL,
  \`name\` VARCHAR(20) NOT NULL,
  \`sort_order\` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`document_format_units_document_format_id_name_unique\` (\`document_format_id\`, \`name\`),
  INDEX \`document_format_units_document_format_id_sort_order_index\` (\`document_format_id\`, \`sort_order\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);

  await connection.query(`CREATE TABLE \`document_format_columns\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`document_format_id\` BIGINT UNSIGNED NOT NULL,
  \`key\` VARCHAR(40) NOT NULL,
  \`label\` VARCHAR(60) NOT NULL,
  \`is_enabled\` TINYINT(1) NOT NULL DEFAULT 1,
  \`is_custom\` TINYINT(1) NOT NULL DEFAULT 0,
  \`print_only\` TINYINT(1) NOT NULL DEFAULT 0,
  \`sort_order\` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  \`is_mandatory\` TINYINT(1) NOT NULL DEFAULT 0,
  \`sub_columns\` JSON,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`document_format_columns_document_format_id_key_unique\` (\`document_format_id\`, \`key\`),
  INDEX \`document_format_columns_document_format_id_sort_order_index\` (\`document_format_id\`, \`sort_order\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);

  await connection.query(`CREATE TABLE \`document_format_images\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`document_format_id\` BIGINT UNSIGNED NOT NULL,
  \`path\` VARCHAR(255) NOT NULL,
  \`original_name\` VARCHAR(160),
  \`sort_order\` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  \`created_at\` TIMESTAMP,
  \`updated_at\` TIMESTAMP,
  PRIMARY KEY (\`id\`),
  INDEX \`document_format_images_document_format_id_sort_order_index\` (\`document_format_id\`, \`sort_order\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);


  await connection.query(`ALTER TABLE \`categories\` ADD CONSTRAINT \`categories_created_by_foreign\` FOREIGN KEY (\`created_by\`) REFERENCES \`users\` (\`id\`) ON DELETE SET NULL;`);
  await connection.query(`ALTER TABLE \`categories\` ADD CONSTRAINT \`categories_updated_by_foreign\` FOREIGN KEY (\`updated_by\`) REFERENCES \`users\` (\`id\`) ON DELETE SET NULL;`);
  await connection.query(`ALTER TABLE \`products\` ADD CONSTRAINT \`products_category_id_foreign\` FOREIGN KEY (\`category_id\`) REFERENCES \`categories\` (\`id\`) ON DELETE RESTRICT;`);
  await connection.query(`ALTER TABLE \`products\` ADD CONSTRAINT \`products_price_band_id_foreign\` FOREIGN KEY (\`price_band_id\`) REFERENCES \`price_bands\` (\`id\`) ON DELETE SET NULL;`);
  await connection.query(`ALTER TABLE \`products\` ADD CONSTRAINT \`products_gst_rate_id_foreign\` FOREIGN KEY (\`gst_rate_id\`) REFERENCES \`gst_rates\` (\`id\`) ON DELETE SET NULL;`);
  await connection.query(`ALTER TABLE \`products\` ADD CONSTRAINT \`products_created_by_foreign\` FOREIGN KEY (\`created_by\`) REFERENCES \`users\` (\`id\`) ON DELETE SET NULL;`);
  await connection.query(`ALTER TABLE \`products\` ADD CONSTRAINT \`products_updated_by_foreign\` FOREIGN KEY (\`updated_by\`) REFERENCES \`users\` (\`id\`) ON DELETE SET NULL;`);
  await connection.query(`ALTER TABLE \`product_incentives\` ADD CONSTRAINT \`product_incentives_product_id_foreign\` FOREIGN KEY (\`product_id\`) REFERENCES \`products\` (\`id\`) ON DELETE CASCADE;`);
  await connection.query(`ALTER TABLE \`product_incentives\` ADD CONSTRAINT \`product_incentives_calculation_basis_id_foreign\` FOREIGN KEY (\`calculation_basis_id\`) REFERENCES \`calculation_bases\` (\`id\`) ON DELETE SET NULL;`);
  await connection.query(`ALTER TABLE \`product_bom_items\` ADD CONSTRAINT \`product_bom_items_product_id_foreign\` FOREIGN KEY (\`product_id\`) REFERENCES \`products\` (\`id\`) ON DELETE CASCADE;`);
  await connection.query(`ALTER TABLE \`category_format\` ADD CONSTRAINT \`category_format_category_id_foreign\` FOREIGN KEY (\`category_id\`) REFERENCES \`categories\` (\`id\`) ON DELETE CASCADE;`);
  await connection.query(`ALTER TABLE \`category_format\` ADD CONSTRAINT \`category_format_document_format_id_foreign\` FOREIGN KEY (\`document_format_id\`) REFERENCES \`document_formats\` (\`id\`) ON DELETE RESTRICT;`);
  await connection.query(`ALTER TABLE \`document_format_units\` ADD CONSTRAINT \`document_format_units_document_format_id_foreign\` FOREIGN KEY (\`document_format_id\`) REFERENCES \`document_formats\` (\`id\`) ON DELETE CASCADE;`);
  await connection.query(`ALTER TABLE \`document_format_columns\` ADD CONSTRAINT \`document_format_columns_document_format_id_foreign\` FOREIGN KEY (\`document_format_id\`) REFERENCES \`document_formats\` (\`id\`) ON DELETE CASCADE;`);
  await connection.query(`ALTER TABLE \`document_format_images\` ADD CONSTRAINT \`document_format_images_document_format_id_foreign\` FOREIGN KEY (\`document_format_id\`) REFERENCES \`document_formats\` (\`id\`) ON DELETE CASCADE;`);

}

export async function down(connection) {
await connection.query('SET FOREIGN_KEY_CHECKS = 0;');
  await connection.query('DROP TABLE IF EXISTS `document_format_images`;');
  await connection.query('DROP TABLE IF EXISTS `document_format_columns`;');
  await connection.query('DROP TABLE IF EXISTS `document_format_units`;');
  await connection.query('DROP TABLE IF EXISTS `category_format`;');
  await connection.query('DROP TABLE IF EXISTS `product_bom_items`;');
  await connection.query('DROP TABLE IF EXISTS `product_incentives`;');
  await connection.query('DROP TABLE IF EXISTS `products`;');
  await connection.query('DROP TABLE IF EXISTS `categories`;');
  await connection.query('SET FOREIGN_KEY_CHECKS = 1;');

}
