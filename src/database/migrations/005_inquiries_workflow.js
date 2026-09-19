export async function up(connection) {
  await connection.query(`CREATE TABLE \`inquiries\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`inquiry_no\` VARCHAR(255) NOT NULL,
  \`financial_year\` VARCHAR(10) NOT NULL,
  \`inquiry_date\` DATE NOT NULL,
  \`buyer_ref\` VARCHAR(255),
  \`buyer_id\` BIGINT UNSIGNED NOT NULL,
  \`category_id\` BIGINT UNSIGNED NOT NULL,
  \`document_format_id\` BIGINT UNSIGNED NOT NULL,
  \`agent_id\` BIGINT UNSIGNED,
  \`agent_commission_type\` ENUM('percent', 'flat'),
  \`agent_commission_value\` DECIMAL(12, 4),
  \`currency_id\` BIGINT UNSIGNED NOT NULL,
  \`exchange_rate\` DECIMAL(12, 4),
  \`expected_shipment_date\` DATE,
  \`delivery_details\` TEXT,
  \`packing_details\` TEXT,
  \`remarks\` TEXT,
  \`converted_at\` TIMESTAMP,
  \`created_by\` BIGINT UNSIGNED,
  \`updated_by\` BIGINT UNSIGNED,
  \`created_at\` TIMESTAMP,
  \`updated_at\` TIMESTAMP,
  \`deleted_at\` TIMESTAMP,
  \`source_id\` BIGINT UNSIGNED,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`inquiries_inquiry_no_unique\` (\`inquiry_no\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);

  await connection.query(`CREATE TABLE \`inquiry_items\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`inquiry_id\` BIGINT UNSIGNED NOT NULL,
  \`sort_order\` INT UNSIGNED NOT NULL DEFAULT 0,
  \`design_no\` VARCHAR(255),
  \`description\` TEXT,
  \`product_id\` BIGINT UNSIGNED,
  \`supplier_id\` BIGINT UNSIGNED,
  \`unit\` VARCHAR(255),
  \`fob_value_id\` BIGINT UNSIGNED,
  \`price\` DECIMAL(12, 2),
  \`qty\` INT UNSIGNED NOT NULL DEFAULT 0,
  \`amount\` DECIMAL(14, 2) NOT NULL DEFAULT 0,
  \`remarks\` TEXT,
  \`custom_values\` JSON,
  \`cost_price\` DECIMAL(12, 2),
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);

  await connection.query(`CREATE TABLE \`inquiry_item_colours\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`inquiry_item_id\` BIGINT UNSIGNED NOT NULL,
  \`colour\` VARCHAR(255),
  \`sort_order\` INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);

  await connection.query(`CREATE TABLE \`inquiry_item_sizes\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`inquiry_item_colour_id\` BIGINT UNSIGNED NOT NULL,
  \`size\` VARCHAR(20) NOT NULL,
  \`qty\` INT UNSIGNED NOT NULL DEFAULT 0,
  \`sort_order\` INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);

  await connection.query(`CREATE TABLE \`inquiry_follow_ups\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`inquiry_id\` BIGINT UNSIGNED NOT NULL,
  \`follow_up_date\` DATE NOT NULL,
  \`comment\` TEXT NOT NULL,
  \`created_by\` BIGINT UNSIGNED,
  \`created_at\` TIMESTAMP,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);

  await connection.query(`CREATE TABLE \`inquiry_item_bom_lines\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`inquiry_item_id\` BIGINT UNSIGNED NOT NULL,
  \`sort_order\` INT UNSIGNED NOT NULL DEFAULT 0,
  \`component_name\` VARCHAR(200) NOT NULL,
  \`qty\` DECIMAL(12, 4) NOT NULL DEFAULT 1,
  \`unit\` VARCHAR(20),
  \`is_custom\` TINYINT(1) NOT NULL DEFAULT 1,
  \`remarks\` VARCHAR(500),
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);


  await connection.query(`ALTER TABLE \`inquiries\` ADD CONSTRAINT \`inquiries_buyer_id_foreign\` FOREIGN KEY (\`buyer_id\`) REFERENCES \`buyers\` (\`id\`) ON DELETE RESTRICT;`);
  await connection.query(`ALTER TABLE \`inquiries\` ADD CONSTRAINT \`inquiries_category_id_foreign\` FOREIGN KEY (\`category_id\`) REFERENCES \`categories\` (\`id\`) ON DELETE RESTRICT;`);
  await connection.query(`ALTER TABLE \`inquiries\` ADD CONSTRAINT \`inquiries_document_format_id_foreign\` FOREIGN KEY (\`document_format_id\`) REFERENCES \`document_formats\` (\`id\`) ON DELETE RESTRICT;`);
  await connection.query(`ALTER TABLE \`inquiries\` ADD CONSTRAINT \`inquiries_agent_id_foreign\` FOREIGN KEY (\`agent_id\`) REFERENCES \`agents\` (\`id\`) ON DELETE SET NULL;`);
  await connection.query(`ALTER TABLE \`inquiries\` ADD CONSTRAINT \`inquiries_currency_id_foreign\` FOREIGN KEY (\`currency_id\`) REFERENCES \`currencies\` (\`id\`) ON DELETE RESTRICT;`);
  await connection.query(`ALTER TABLE \`inquiries\` ADD CONSTRAINT \`inquiries_created_by_foreign\` FOREIGN KEY (\`created_by\`) REFERENCES \`users\` (\`id\`) ON DELETE SET NULL;`);
  await connection.query(`ALTER TABLE \`inquiries\` ADD CONSTRAINT \`inquiries_updated_by_foreign\` FOREIGN KEY (\`updated_by\`) REFERENCES \`users\` (\`id\`) ON DELETE SET NULL;`);
  await connection.query(`ALTER TABLE \`inquiries\` ADD CONSTRAINT \`inquiries_source_id_foreign\` FOREIGN KEY (\`source_id\`) REFERENCES \`inquiry_sources\` (\`id\`) ON DELETE RESTRICT;`);
  await connection.query(`ALTER TABLE \`inquiry_items\` ADD CONSTRAINT \`inquiry_items_inquiry_id_foreign\` FOREIGN KEY (\`inquiry_id\`) REFERENCES \`inquiries\` (\`id\`) ON DELETE CASCADE;`);
  await connection.query(`ALTER TABLE \`inquiry_items\` ADD CONSTRAINT \`inquiry_items_product_id_foreign\` FOREIGN KEY (\`product_id\`) REFERENCES \`products\` (\`id\`) ON DELETE SET NULL;`);
  await connection.query(`ALTER TABLE \`inquiry_items\` ADD CONSTRAINT \`inquiry_items_supplier_id_foreign\` FOREIGN KEY (\`supplier_id\`) REFERENCES \`suppliers\` (\`id\`) ON DELETE SET NULL;`);
  await connection.query(`ALTER TABLE \`inquiry_items\` ADD CONSTRAINT \`inquiry_items_fob_value_id_foreign\` FOREIGN KEY (\`fob_value_id\`) REFERENCES \`fob_values\` (\`id\`) ON DELETE SET NULL;`);
  await connection.query(`ALTER TABLE \`inquiry_item_colours\` ADD CONSTRAINT \`inquiry_item_colours_inquiry_item_id_foreign\` FOREIGN KEY (\`inquiry_item_id\`) REFERENCES \`inquiry_items\` (\`id\`) ON DELETE CASCADE;`);
  await connection.query(`ALTER TABLE \`inquiry_item_sizes\` ADD CONSTRAINT \`inquiry_item_sizes_inquiry_item_colour_id_foreign\` FOREIGN KEY (\`inquiry_item_colour_id\`) REFERENCES \`inquiry_item_colours\` (\`id\`) ON DELETE CASCADE;`);
  await connection.query(`ALTER TABLE \`inquiry_follow_ups\` ADD CONSTRAINT \`inquiry_follow_ups_inquiry_id_foreign\` FOREIGN KEY (\`inquiry_id\`) REFERENCES \`inquiries\` (\`id\`) ON DELETE CASCADE;`);
  await connection.query(`ALTER TABLE \`inquiry_follow_ups\` ADD CONSTRAINT \`inquiry_follow_ups_created_by_foreign\` FOREIGN KEY (\`created_by\`) REFERENCES \`users\` (\`id\`) ON DELETE SET NULL;`);
  await connection.query(`ALTER TABLE \`inquiry_item_bom_lines\` ADD CONSTRAINT \`inquiry_item_bom_lines_inquiry_item_id_foreign\` FOREIGN KEY (\`inquiry_item_id\`) REFERENCES \`inquiry_items\` (\`id\`) ON DELETE CASCADE;`);

}

export async function down(connection) {
await connection.query('SET FOREIGN_KEY_CHECKS = 0;');
  await connection.query('DROP TABLE IF EXISTS `inquiry_item_bom_lines`;');
  await connection.query('DROP TABLE IF EXISTS `inquiry_follow_ups`;');
  await connection.query('DROP TABLE IF EXISTS `inquiry_item_sizes`;');
  await connection.query('DROP TABLE IF EXISTS `inquiry_item_colours`;');
  await connection.query('DROP TABLE IF EXISTS `inquiry_items`;');
  await connection.query('DROP TABLE IF EXISTS `inquiries`;');
  await connection.query('SET FOREIGN_KEY_CHECKS = 1;');

}
