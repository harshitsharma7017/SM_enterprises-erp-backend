export async function up(connection) {
  await connection.query(`CREATE TABLE \`order_confirmations\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`oc_num\` VARCHAR(255) NOT NULL,
  \`financial_year\` VARCHAR(10) NOT NULL,
  \`mode\` ENUM('oc', 'direct') NOT NULL DEFAULT 'oc',
  \`oc_date\` DATE NOT NULL,
  \`buyer_ref\` VARCHAR(255),
  \`source_inquiry_id\` BIGINT UNSIGNED,
  \`buyer_id\` BIGINT UNSIGNED NOT NULL,
  \`category_id\` BIGINT UNSIGNED NOT NULL,
  \`document_format_id\` BIGINT UNSIGNED NOT NULL,
  \`agent_id\` BIGINT UNSIGNED,
  \`agent_commission_type\` ENUM('percent', 'flat'),
  \`agent_commission_value\` DECIMAL(12, 4),
  \`currency_id\` BIGINT UNSIGNED NOT NULL,
  \`incoterm\` VARCHAR(255),
  \`ship_method\` VARCHAR(255),
  \`shipment_date\` VARCHAR(255),
  \`pol\` VARCHAR(255),
  \`pod\` VARCHAR(255),
  \`payment_terms\` VARCHAR(255),
  \`delivery_details\` TEXT,
  \`packing_details\` TEXT,
  \`remarks\` TEXT,
  \`status\` ENUM('draft', 'sent', 'confirmed') NOT NULL DEFAULT 'draft',
  \`created_by\` BIGINT UNSIGNED,
  \`updated_by\` BIGINT UNSIGNED,
  \`created_at\` TIMESTAMP,
  \`updated_at\` TIMESTAMP,
  \`deleted_at\` TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`order_confirmations_oc_num_unique\` (\`oc_num\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);

  await connection.query(`CREATE TABLE \`order_confirmation_items\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`order_confirmation_id\` BIGINT UNSIGNED NOT NULL,
  \`sort_order\` INT UNSIGNED NOT NULL DEFAULT 0,
  \`design_no\` VARCHAR(255),
  \`description\` TEXT,
  \`product_id\` BIGINT UNSIGNED,
  \`supplier_id\` BIGINT UNSIGNED,
  \`unit\` VARCHAR(255),
  \`fob_value_id\` BIGINT UNSIGNED,
  \`price\` DECIMAL(12, 2),
  \`cost_price\` DECIMAL(12, 2),
  \`qty\` INT UNSIGNED NOT NULL DEFAULT 0,
  \`amount\` DECIMAL(14, 2) NOT NULL DEFAULT 0,
  \`remarks\` TEXT,
  \`custom_values\` JSON,
  \`raised_at\` TIMESTAMP,
  \`shipped_at\` TIMESTAMP,
  \`purchase_order_id\` BIGINT UNSIGNED,
  \`export_document_id\` BIGINT UNSIGNED,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);

  await connection.query(`CREATE TABLE \`order_confirmation_item_colours\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`colour\` VARCHAR(255),
  \`sort_order\` INT UNSIGNED NOT NULL DEFAULT 0,
  \`order_confirmation_item_id\` BIGINT UNSIGNED,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);

  await connection.query(`CREATE TABLE \`order_confirmation_item_sizes\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`size\` VARCHAR(20) NOT NULL,
  \`qty\` INT UNSIGNED NOT NULL DEFAULT 0,
  \`sort_order\` INT UNSIGNED NOT NULL DEFAULT 0,
  \`order_confirmation_item_colour_id\` BIGINT UNSIGNED,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);


  await connection.query(`ALTER TABLE \`order_confirmations\` ADD CONSTRAINT \`order_confirmations_source_inquiry_id_foreign\` FOREIGN KEY (\`source_inquiry_id\`) REFERENCES \`inquiries\` (\`id\`) ON DELETE SET NULL;`);
  await connection.query(`ALTER TABLE \`order_confirmations\` ADD CONSTRAINT \`order_confirmations_buyer_id_foreign\` FOREIGN KEY (\`buyer_id\`) REFERENCES \`buyers\` (\`id\`) ON DELETE RESTRICT;`);
  await connection.query(`ALTER TABLE \`order_confirmations\` ADD CONSTRAINT \`order_confirmations_category_id_foreign\` FOREIGN KEY (\`category_id\`) REFERENCES \`categories\` (\`id\`) ON DELETE RESTRICT;`);
  await connection.query(`ALTER TABLE \`order_confirmations\` ADD CONSTRAINT \`order_confirmations_document_format_id_foreign\` FOREIGN KEY (\`document_format_id\`) REFERENCES \`document_formats\` (\`id\`) ON DELETE RESTRICT;`);
  await connection.query(`ALTER TABLE \`order_confirmations\` ADD CONSTRAINT \`order_confirmations_agent_id_foreign\` FOREIGN KEY (\`agent_id\`) REFERENCES \`agents\` (\`id\`) ON DELETE SET NULL;`);
  await connection.query(`ALTER TABLE \`order_confirmations\` ADD CONSTRAINT \`order_confirmations_currency_id_foreign\` FOREIGN KEY (\`currency_id\`) REFERENCES \`currencies\` (\`id\`) ON DELETE RESTRICT;`);
  await connection.query(`ALTER TABLE \`order_confirmations\` ADD CONSTRAINT \`order_confirmations_created_by_foreign\` FOREIGN KEY (\`created_by\`) REFERENCES \`users\` (\`id\`) ON DELETE SET NULL;`);
  await connection.query(`ALTER TABLE \`order_confirmations\` ADD CONSTRAINT \`order_confirmations_updated_by_foreign\` FOREIGN KEY (\`updated_by\`) REFERENCES \`users\` (\`id\`) ON DELETE SET NULL;`);
  await connection.query(`ALTER TABLE \`order_confirmation_items\` ADD CONSTRAINT \`order_confirmation_items_order_confirmation_id_foreign\` FOREIGN KEY (\`order_confirmation_id\`) REFERENCES \`order_confirmations\` (\`id\`) ON DELETE CASCADE;`);
  await connection.query(`ALTER TABLE \`order_confirmation_items\` ADD CONSTRAINT \`order_confirmation_items_product_id_foreign\` FOREIGN KEY (\`product_id\`) REFERENCES \`products\` (\`id\`) ON DELETE SET NULL;`);
  await connection.query(`ALTER TABLE \`order_confirmation_items\` ADD CONSTRAINT \`order_confirmation_items_supplier_id_foreign\` FOREIGN KEY (\`supplier_id\`) REFERENCES \`suppliers\` (\`id\`) ON DELETE SET NULL;`);
  await connection.query(`ALTER TABLE \`order_confirmation_items\` ADD CONSTRAINT \`order_confirmation_items_fob_value_id_foreign\` FOREIGN KEY (\`fob_value_id\`) REFERENCES \`fob_values\` (\`id\`) ON DELETE SET NULL;`);
  await connection.query(`ALTER TABLE \`order_confirmation_item_colours\` ADD CONSTRAINT \`order_confirmation_item_colours_order_confirmation_item_1bec4f52\` FOREIGN KEY (\`order_confirmation_item_id\`) REFERENCES \`order_confirmation_items\` (\`id\`) ON DELETE CASCADE;`);
  await connection.query(`ALTER TABLE \`order_confirmation_item_sizes\` ADD CONSTRAINT \`order_confirmation_item_sizes_order_confirmation_item_c_25c9df30\` FOREIGN KEY (\`order_confirmation_item_colour_id\`) REFERENCES \`order_confirmation_item_colours\` (\`id\`) ON DELETE CASCADE;`);

}

export async function down(connection) {
await connection.query('SET FOREIGN_KEY_CHECKS = 0;');
  await connection.query('DROP TABLE IF EXISTS `order_confirmation_item_sizes`;');
  await connection.query('DROP TABLE IF EXISTS `order_confirmation_item_colours`;');
  await connection.query('DROP TABLE IF EXISTS `order_confirmation_items`;');
  await connection.query('DROP TABLE IF EXISTS `order_confirmations`;');
  await connection.query('SET FOREIGN_KEY_CHECKS = 1;');

}
