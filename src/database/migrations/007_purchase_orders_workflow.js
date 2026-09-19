export async function up(connection) {
  await connection.query(`CREATE TABLE \`purchase_orders\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`po_num\` VARCHAR(255) NOT NULL,
  \`financial_year\` VARCHAR(10) NOT NULL,
  \`order_confirmation_id\` BIGINT UNSIGNED NOT NULL,
  \`supplier_id\` BIGINT UNSIGNED NOT NULL,
  \`po_date\` DATE NOT NULL,
  \`dispatch_date\` DATE,
  \`delivery_details\` TEXT,
  \`packing_details\` TEXT,
  \`remarks\` TEXT,
  \`status\` ENUM('draft', 'raised', 'partial', 'received') NOT NULL DEFAULT 'draft',
  \`created_by\` BIGINT UNSIGNED,
  \`updated_by\` BIGINT UNSIGNED,
  \`created_at\` TIMESTAMP,
  \`updated_at\` TIMESTAMP,
  \`deleted_at\` TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`purchase_orders_po_num_unique\` (\`po_num\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);

  await connection.query(`CREATE TABLE \`purchase_order_items\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`purchase_order_id\` BIGINT UNSIGNED NOT NULL,
  \`order_confirmation_item_id\` BIGINT UNSIGNED,
  \`sort_order\` INT UNSIGNED NOT NULL DEFAULT 0,
  \`design_no\` VARCHAR(255),
  \`description\` TEXT,
  \`product_id\` BIGINT UNSIGNED,
  \`unit\` VARCHAR(255),
  \`cost_price\` DECIMAL(12, 2),
  \`qty\` INT UNSIGNED NOT NULL DEFAULT 0,
  \`amount\` DECIMAL(14, 2) NOT NULL DEFAULT 0,
  \`remarks\` TEXT,
  \`custom_values\` JSON,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);

  await connection.query(`CREATE TABLE \`purchase_order_item_colours\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`colour\` VARCHAR(255),
  \`sort_order\` INT UNSIGNED NOT NULL DEFAULT 0,
  \`purchase_order_item_id\` BIGINT UNSIGNED,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);

  await connection.query(`CREATE TABLE \`purchase_order_item_sizes\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`size\` VARCHAR(20) NOT NULL,
  \`qty\` INT UNSIGNED NOT NULL DEFAULT 0,
  \`sort_order\` INT UNSIGNED NOT NULL DEFAULT 0,
  \`purchase_order_item_colour_id\` BIGINT UNSIGNED,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);

  await connection.query(`CREATE TABLE \`purchase_order_timeline_entries\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`purchase_order_id\` BIGINT UNSIGNED NOT NULL,
  \`entry_date\` DATE NOT NULL,
  \`note\` VARCHAR(255) NOT NULL,
  \`qty\` INT UNSIGNED,
  \`sort_order\` INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);


  await connection.query(`ALTER TABLE \`order_confirmation_items\` ADD CONSTRAINT \`order_confirmation_items_purchase_order_id_foreign\` FOREIGN KEY (\`purchase_order_id\`) REFERENCES \`purchase_orders\` (\`id\`) ON DELETE SET NULL;`);
  await connection.query(`ALTER TABLE \`purchase_orders\` ADD CONSTRAINT \`purchase_orders_order_confirmation_id_foreign\` FOREIGN KEY (\`order_confirmation_id\`) REFERENCES \`order_confirmations\` (\`id\`) ON DELETE RESTRICT;`);
  await connection.query(`ALTER TABLE \`purchase_orders\` ADD CONSTRAINT \`purchase_orders_supplier_id_foreign\` FOREIGN KEY (\`supplier_id\`) REFERENCES \`suppliers\` (\`id\`) ON DELETE RESTRICT;`);
  await connection.query(`ALTER TABLE \`purchase_orders\` ADD CONSTRAINT \`purchase_orders_created_by_foreign\` FOREIGN KEY (\`created_by\`) REFERENCES \`users\` (\`id\`) ON DELETE SET NULL;`);
  await connection.query(`ALTER TABLE \`purchase_orders\` ADD CONSTRAINT \`purchase_orders_updated_by_foreign\` FOREIGN KEY (\`updated_by\`) REFERENCES \`users\` (\`id\`) ON DELETE SET NULL;`);
  await connection.query(`ALTER TABLE \`purchase_order_items\` ADD CONSTRAINT \`purchase_order_items_purchase_order_id_foreign\` FOREIGN KEY (\`purchase_order_id\`) REFERENCES \`purchase_orders\` (\`id\`) ON DELETE CASCADE;`);
  await connection.query(`ALTER TABLE \`purchase_order_items\` ADD CONSTRAINT \`purchase_order_items_order_confirmation_item_id_foreign\` FOREIGN KEY (\`order_confirmation_item_id\`) REFERENCES \`order_confirmation_items\` (\`id\`) ON DELETE SET NULL;`);
  await connection.query(`ALTER TABLE \`purchase_order_items\` ADD CONSTRAINT \`purchase_order_items_product_id_foreign\` FOREIGN KEY (\`product_id\`) REFERENCES \`products\` (\`id\`) ON DELETE SET NULL;`);
  await connection.query(`ALTER TABLE \`purchase_order_item_colours\` ADD CONSTRAINT \`purchase_order_item_colours_purchase_order_item_id_foreign\` FOREIGN KEY (\`purchase_order_item_id\`) REFERENCES \`purchase_order_items\` (\`id\`) ON DELETE CASCADE;`);
  await connection.query(`ALTER TABLE \`purchase_order_item_sizes\` ADD CONSTRAINT \`purchase_order_item_sizes_purchase_order_item_colour_id_foreign\` FOREIGN KEY (\`purchase_order_item_colour_id\`) REFERENCES \`purchase_order_item_colours\` (\`id\`) ON DELETE CASCADE;`);
  await connection.query(`ALTER TABLE \`purchase_order_timeline_entries\` ADD CONSTRAINT \`purchase_order_timeline_entries_purchase_order_id_foreign\` FOREIGN KEY (\`purchase_order_id\`) REFERENCES \`purchase_orders\` (\`id\`) ON DELETE CASCADE;`);

}

export async function down(connection) {
await connection.query('SET FOREIGN_KEY_CHECKS = 0;');
  await connection.query('DROP TABLE IF EXISTS `purchase_order_timeline_entries`;');
  await connection.query('DROP TABLE IF EXISTS `purchase_order_item_sizes`;');
  await connection.query('DROP TABLE IF EXISTS `purchase_order_item_colours`;');
  await connection.query('DROP TABLE IF EXISTS `purchase_order_items`;');
  await connection.query('DROP TABLE IF EXISTS `purchase_orders`;');
  await connection.query('SET FOREIGN_KEY_CHECKS = 1;');

}
