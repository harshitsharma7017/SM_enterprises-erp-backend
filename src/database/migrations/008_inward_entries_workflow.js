export async function up(connection) {
  await connection.query(`CREATE TABLE \`inward_entries\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`inward_no\` VARCHAR(255) NOT NULL,
  \`financial_year\` VARCHAR(10) NOT NULL,
  \`inward_date\` DATE NOT NULL,
  \`purchase_order_id\` BIGINT UNSIGNED NOT NULL,
  \`supplier_id\` BIGINT UNSIGNED NOT NULL,
  \`challan_no\` VARCHAR(255),
  \`challan_date\` DATE,
  \`remarks\` TEXT,
  \`status\` ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  \`qc_inspected_at\` TIMESTAMP,
  \`qc_inspected_by\` BIGINT UNSIGNED,
  \`created_by\` BIGINT UNSIGNED,
  \`updated_by\` BIGINT UNSIGNED,
  \`created_at\` TIMESTAMP,
  \`updated_at\` TIMESTAMP,
  \`deleted_at\` TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`inward_entries_inward_no_unique\` (\`inward_no\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);

  await connection.query(`CREATE TABLE \`inward_entry_items\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`inward_entry_id\` BIGINT UNSIGNED NOT NULL,
  \`purchase_order_item_id\` BIGINT UNSIGNED NOT NULL,
  \`product_id\` BIGINT UNSIGNED,
  \`sort_order\` INT UNSIGNED NOT NULL DEFAULT 0,
  \`description\` TEXT,
  \`unit\` VARCHAR(50),
  \`ordered_qty\` INT UNSIGNED NOT NULL DEFAULT 0,
  \`received_qty\` INT UNSIGNED NOT NULL DEFAULT 0,
  \`passed_qty\` INT UNSIGNED NOT NULL DEFAULT 0,
  \`rejected_qty\` INT UNSIGNED NOT NULL DEFAULT 0,
  \`remarks\` TEXT,
  \`qc_remarks\` TEXT,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);


  await connection.query(`ALTER TABLE \`inward_entries\` ADD CONSTRAINT \`inward_entries_purchase_order_id_foreign\` FOREIGN KEY (\`purchase_order_id\`) REFERENCES \`purchase_orders\` (\`id\`) ON DELETE RESTRICT;`);
  await connection.query(`ALTER TABLE \`inward_entries\` ADD CONSTRAINT \`inward_entries_supplier_id_foreign\` FOREIGN KEY (\`supplier_id\`) REFERENCES \`suppliers\` (\`id\`) ON DELETE RESTRICT;`);
  await connection.query(`ALTER TABLE \`inward_entries\` ADD CONSTRAINT \`inward_entries_qc_inspected_by_foreign\` FOREIGN KEY (\`qc_inspected_by\`) REFERENCES \`users\` (\`id\`) ON DELETE SET NULL;`);
  await connection.query(`ALTER TABLE \`inward_entries\` ADD CONSTRAINT \`inward_entries_created_by_foreign\` FOREIGN KEY (\`created_by\`) REFERENCES \`users\` (\`id\`) ON DELETE SET NULL;`);
  await connection.query(`ALTER TABLE \`inward_entries\` ADD CONSTRAINT \`inward_entries_updated_by_foreign\` FOREIGN KEY (\`updated_by\`) REFERENCES \`users\` (\`id\`) ON DELETE SET NULL;`);
  await connection.query(`ALTER TABLE \`inward_entry_items\` ADD CONSTRAINT \`inward_entry_items_inward_entry_id_foreign\` FOREIGN KEY (\`inward_entry_id\`) REFERENCES \`inward_entries\` (\`id\`) ON DELETE CASCADE;`);
  await connection.query(`ALTER TABLE \`inward_entry_items\` ADD CONSTRAINT \`inward_entry_items_purchase_order_item_id_foreign\` FOREIGN KEY (\`purchase_order_item_id\`) REFERENCES \`purchase_order_items\` (\`id\`) ON DELETE RESTRICT;`);
  await connection.query(`ALTER TABLE \`inward_entry_items\` ADD CONSTRAINT \`inward_entry_items_product_id_foreign\` FOREIGN KEY (\`product_id\`) REFERENCES \`products\` (\`id\`) ON DELETE SET NULL;`);

}

export async function down(connection) {
await connection.query('SET FOREIGN_KEY_CHECKS = 0;');
  await connection.query('DROP TABLE IF EXISTS `inward_entry_items`;');
  await connection.query('DROP TABLE IF EXISTS `inward_entries`;');
  await connection.query('SET FOREIGN_KEY_CHECKS = 1;');

}
