export async function up(connection) {
  await connection.query(`CREATE TABLE \`export_documents\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`doc_num\` VARCHAR(255) NOT NULL,
  \`financial_year\` VARCHAR(10) NOT NULL,
  \`order_confirmation_id\` BIGINT UNSIGNED NOT NULL,
  \`buyer_id\` BIGINT UNSIGNED NOT NULL,
  \`currency_id\` BIGINT UNSIGNED NOT NULL,
  \`incoterm_id\` BIGINT UNSIGNED,
  \`port_of_loading_id\` BIGINT UNSIGNED,
  \`port_of_discharge_id\` BIGINT UNSIGNED,
  \`shipment_method_id\` BIGINT UNSIGNED,
  \`shipment_date\` DATE,
  \`status\` ENUM('draft', 'in_progress', 'closed') NOT NULL DEFAULT 'draft',
  \`remarks\` TEXT,
  \`created_by\` BIGINT UNSIGNED,
  \`updated_by\` BIGINT UNSIGNED,
  \`created_at\` TIMESTAMP,
  \`updated_at\` TIMESTAMP,
  \`deleted_at\` TIMESTAMP,
  \`invoice_no\` VARCHAR(255),
  \`invoice_date\` DATE,
  \`exporter_ref\` VARCHAR(255),
  \`forwarder_name\` VARCHAR(255),
  \`forwarder_address\` TEXT,
  \`vehicle_no\` VARCHAR(255),
  \`driver_cell\` VARCHAR(255),
  \`final_destination\` VARCHAR(255),
  \`marks_and_numbers\` TEXT,
  \`total_cartons\` INT UNSIGNED,
  \`package_kind\` VARCHAR(255) NOT NULL DEFAULT 'CARTONS',
  \`freight_amount\` DECIMAL(14, 2),
  \`insurance_amount\` DECIMAL(14, 2),
  \`gross_weight\` DECIMAL(12, 3),
  \`buyer_ref_no\` VARCHAR(255),
  \`buyer_ref_date\` DATE,
  \`other_reference\` VARCHAR(255),
  \`consignee_name\` VARCHAR(255),
  \`consignee_address\` TEXT,
  \`pre_carriage_by\` VARCHAR(255),
  \`place_of_receipt\` VARCHAR(255),
  \`vessel_flight_no\` VARCHAR(255),
  \`country_of_origin\` VARCHAR(255) NOT NULL DEFAULT 'INDIA',
  \`net_weight\` DECIMAL(12, 3),
  \`carton_dimensions\` VARCHAR(255),
  \`booking_no\` VARCHAR(255),
  \`bl_no\` VARCHAR(255),
  \`voyage_no\` VARCHAR(255),
  \`transshipment_port\` VARCHAR(255),
  \`notify_party_name\` VARCHAR(255),
  \`notify_party_address\` TEXT,
  \`goods_description\` TEXT,
  \`total_measurement\` DECIMAL(12, 3),
  \`ex_rate\` VARCHAR(255),
  \`freight_terms\` VARCHAR(255) NOT NULL DEFAULT 'PREPAID',
  \`freight_prepaid_at\` VARCHAR(255),
  \`freight_payable_at\` VARCHAR(255),
  \`total_prepaid_in\` VARCHAR(255),
  \`no_of_original_bls\` VARCHAR(255),
  \`bl_place_of_issue\` VARCHAR(255) NOT NULL DEFAULT 'MUMBAI',
  \`bl_date_of_issue\` DATE,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`export_documents_doc_num_unique\` (\`doc_num\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);

  await connection.query(`CREATE TABLE \`export_document_items\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`export_document_id\` BIGINT UNSIGNED NOT NULL,
  \`order_confirmation_item_id\` BIGINT UNSIGNED,
  \`sort_order\` INT UNSIGNED NOT NULL DEFAULT 0,
  \`design_no\` VARCHAR(255),
  \`description\` TEXT,
  \`product_id\` BIGINT UNSIGNED,
  \`unit\` VARCHAR(255),
  \`price\` DECIMAL(12, 2),
  \`qty\` INT UNSIGNED NOT NULL DEFAULT 0,
  \`amount\` DECIMAL(14, 2) NOT NULL DEFAULT 0,
  \`remarks\` TEXT,
  \`custom_values\` JSON,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);

  await connection.query(`CREATE TABLE \`export_document_item_colours\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`colour\` VARCHAR(255),
  \`sort_order\` INT UNSIGNED NOT NULL DEFAULT 0,
  \`export_document_item_id\` BIGINT UNSIGNED,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);

  await connection.query(`CREATE TABLE \`export_document_item_sizes\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`size\` VARCHAR(20) NOT NULL,
  \`qty\` INT UNSIGNED NOT NULL DEFAULT 0,
  \`sort_order\` INT UNSIGNED NOT NULL DEFAULT 0,
  \`export_document_item_colour_id\` BIGINT UNSIGNED,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);

  await connection.query(`CREATE TABLE \`export_document_checklists\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`export_document_id\` BIGINT UNSIGNED NOT NULL,
  \`document_checklist_type_id\` BIGINT UNSIGNED NOT NULL,
  \`variant_code\` VARCHAR(60),
  \`file_path\` VARCHAR(255),
  \`original_name\` VARCHAR(255),
  \`uploaded_at\` TIMESTAMP,
  \`generated_at\` TIMESTAMP,
  \`reference_no\` VARCHAR(255),
  \`amount\` DECIMAL(14, 2),
  \`remarks\` TEXT,
  \`created_by\` BIGINT UNSIGNED,
  \`updated_by\` BIGINT UNSIGNED,
  \`created_at\` TIMESTAMP,
  \`updated_at\` TIMESTAMP,
  \`status\` VARCHAR(20) NOT NULL DEFAULT 'pending',
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);

  await connection.query(`CREATE TABLE \`export_document_cartons\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`export_document_id\` BIGINT UNSIGNED NOT NULL,
  \`carton_no\` VARCHAR(40) NOT NULL,
  \`net_weight\` DECIMAL(10, 3),
  \`sort_order\` INT UNSIGNED NOT NULL DEFAULT 0,
  \`created_at\` TIMESTAMP,
  \`updated_at\` TIMESTAMP,
  \`gross_weight\` DECIMAL(10, 3),
  \`dimensions\` VARCHAR(60),
  PRIMARY KEY (\`id\`),
  INDEX \`export_document_cartons_export_document_id_sort_order_index\` (\`export_document_id\`, \`sort_order\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);

  await connection.query(`CREATE TABLE \`export_document_carton_lines\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`export_document_carton_id\` BIGINT UNSIGNED NOT NULL,
  \`description\` TEXT NOT NULL,
  \`unit\` VARCHAR(20) NOT NULL DEFAULT 'PCS',
  \`qty\` INT UNSIGNED NOT NULL,
  \`sort_order\` INT UNSIGNED NOT NULL DEFAULT 0,
  \`created_at\` TIMESTAMP,
  \`updated_at\` TIMESTAMP,
  PRIMARY KEY (\`id\`),
  INDEX \`export_document_carton_lines_export_document_carton_id__5272edfc\` (\`export_document_carton_id\`, \`sort_order\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);

  await connection.query(`CREATE TABLE \`containers\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`container_no\` VARCHAR(30) NOT NULL,
  \`seal_no\` VARCHAR(30),
  \`type\` ENUM('lcl', 'fcl') NOT NULL DEFAULT 'lcl',
  \`remarks\` TEXT,
  \`created_at\` TIMESTAMP,
  \`updated_at\` TIMESTAMP,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);

  await connection.query(`CREATE TABLE \`container_export_document\` (
  \`container_id\` BIGINT UNSIGNED NOT NULL,
  \`export_document_id\` BIGINT UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);


  await connection.query(`ALTER TABLE \`order_confirmation_items\` ADD CONSTRAINT \`order_confirmation_items_export_document_id_foreign\` FOREIGN KEY (\`export_document_id\`) REFERENCES \`export_documents\` (\`id\`) ON DELETE SET NULL;`);
  await connection.query(`ALTER TABLE \`export_documents\` ADD CONSTRAINT \`export_documents_order_confirmation_id_foreign\` FOREIGN KEY (\`order_confirmation_id\`) REFERENCES \`order_confirmations\` (\`id\`) ON DELETE RESTRICT;`);
  await connection.query(`ALTER TABLE \`export_documents\` ADD CONSTRAINT \`export_documents_buyer_id_foreign\` FOREIGN KEY (\`buyer_id\`) REFERENCES \`buyers\` (\`id\`) ON DELETE RESTRICT;`);
  await connection.query(`ALTER TABLE \`export_documents\` ADD CONSTRAINT \`export_documents_currency_id_foreign\` FOREIGN KEY (\`currency_id\`) REFERENCES \`currencies\` (\`id\`) ON DELETE RESTRICT;`);
  await connection.query(`ALTER TABLE \`export_documents\` ADD CONSTRAINT \`export_documents_incoterm_id_foreign\` FOREIGN KEY (\`incoterm_id\`) REFERENCES \`incoterms\` (\`id\`) ON DELETE SET NULL;`);
  await connection.query(`ALTER TABLE \`export_documents\` ADD CONSTRAINT \`export_documents_port_of_loading_id_foreign\` FOREIGN KEY (\`port_of_loading_id\`) REFERENCES \`ports\` (\`id\`) ON DELETE SET NULL;`);
  await connection.query(`ALTER TABLE \`export_documents\` ADD CONSTRAINT \`export_documents_port_of_discharge_id_foreign\` FOREIGN KEY (\`port_of_discharge_id\`) REFERENCES \`ports\` (\`id\`) ON DELETE SET NULL;`);
  await connection.query(`ALTER TABLE \`export_documents\` ADD CONSTRAINT \`export_documents_shipment_method_id_foreign\` FOREIGN KEY (\`shipment_method_id\`) REFERENCES \`shipment_methods\` (\`id\`) ON DELETE SET NULL;`);
  await connection.query(`ALTER TABLE \`export_documents\` ADD CONSTRAINT \`export_documents_created_by_foreign\` FOREIGN KEY (\`created_by\`) REFERENCES \`users\` (\`id\`) ON DELETE SET NULL;`);
  await connection.query(`ALTER TABLE \`export_documents\` ADD CONSTRAINT \`export_documents_updated_by_foreign\` FOREIGN KEY (\`updated_by\`) REFERENCES \`users\` (\`id\`) ON DELETE SET NULL;`);
  await connection.query(`ALTER TABLE \`export_document_items\` ADD CONSTRAINT \`export_document_items_export_document_id_foreign\` FOREIGN KEY (\`export_document_id\`) REFERENCES \`export_documents\` (\`id\`) ON DELETE CASCADE;`);
  await connection.query(`ALTER TABLE \`export_document_items\` ADD CONSTRAINT \`export_document_items_order_confirmation_item_id_foreign\` FOREIGN KEY (\`order_confirmation_item_id\`) REFERENCES \`order_confirmation_items\` (\`id\`) ON DELETE SET NULL;`);
  await connection.query(`ALTER TABLE \`export_document_items\` ADD CONSTRAINT \`export_document_items_product_id_foreign\` FOREIGN KEY (\`product_id\`) REFERENCES \`products\` (\`id\`) ON DELETE SET NULL;`);
  await connection.query(`ALTER TABLE \`export_document_item_colours\` ADD CONSTRAINT \`export_document_item_colours_export_document_item_id_foreign\` FOREIGN KEY (\`export_document_item_id\`) REFERENCES \`export_document_items\` (\`id\`) ON DELETE CASCADE;`);
  await connection.query(`ALTER TABLE \`export_document_item_sizes\` ADD CONSTRAINT \`export_document_item_sizes_export_document_item_colour__104c7e30\` FOREIGN KEY (\`export_document_item_colour_id\`) REFERENCES \`export_document_item_colours\` (\`id\`) ON DELETE CASCADE;`);
  await connection.query(`ALTER TABLE \`export_document_checklists\` ADD CONSTRAINT \`export_document_checklists_export_document_id_foreign\` FOREIGN KEY (\`export_document_id\`) REFERENCES \`export_documents\` (\`id\`) ON DELETE CASCADE;`);
  await connection.query(`ALTER TABLE \`export_document_checklists\` ADD CONSTRAINT \`export_document_checklists_document_checklist_type_id_foreign\` FOREIGN KEY (\`document_checklist_type_id\`) REFERENCES \`document_checklist_types\` (\`id\`) ON DELETE RESTRICT;`);
  await connection.query(`ALTER TABLE \`export_document_checklists\` ADD CONSTRAINT \`export_document_checklists_created_by_foreign\` FOREIGN KEY (\`created_by\`) REFERENCES \`users\` (\`id\`) ON DELETE SET NULL;`);
  await connection.query(`ALTER TABLE \`export_document_checklists\` ADD CONSTRAINT \`export_document_checklists_updated_by_foreign\` FOREIGN KEY (\`updated_by\`) REFERENCES \`users\` (\`id\`) ON DELETE SET NULL;`);
  await connection.query(`ALTER TABLE \`export_document_cartons\` ADD CONSTRAINT \`export_document_cartons_export_document_id_foreign\` FOREIGN KEY (\`export_document_id\`) REFERENCES \`export_documents\` (\`id\`) ON DELETE CASCADE;`);
  await connection.query(`ALTER TABLE \`export_document_carton_lines\` ADD CONSTRAINT \`export_document_carton_lines_export_document_carton_id_foreign\` FOREIGN KEY (\`export_document_carton_id\`) REFERENCES \`export_document_cartons\` (\`id\`) ON DELETE CASCADE;`);
  await connection.query(`ALTER TABLE \`container_export_document\` ADD CONSTRAINT \`container_export_document_container_id_foreign\` FOREIGN KEY (\`container_id\`) REFERENCES \`containers\` (\`id\`) ON DELETE CASCADE;`);
  await connection.query(`ALTER TABLE \`container_export_document\` ADD CONSTRAINT \`container_export_document_export_document_id_foreign\` FOREIGN KEY (\`export_document_id\`) REFERENCES \`export_documents\` (\`id\`) ON DELETE CASCADE;`);

}

export async function down(connection) {
await connection.query('SET FOREIGN_KEY_CHECKS = 0;');
  await connection.query('DROP TABLE IF EXISTS `container_export_document`;');
  await connection.query('DROP TABLE IF EXISTS `containers`;');
  await connection.query('DROP TABLE IF EXISTS `export_document_carton_lines`;');
  await connection.query('DROP TABLE IF EXISTS `export_document_cartons`;');
  await connection.query('DROP TABLE IF EXISTS `export_document_checklists`;');
  await connection.query('DROP TABLE IF EXISTS `export_document_item_sizes`;');
  await connection.query('DROP TABLE IF EXISTS `export_document_item_colours`;');
  await connection.query('DROP TABLE IF EXISTS `export_document_items`;');
  await connection.query('DROP TABLE IF EXISTS `export_documents`;');
  await connection.query('SET FOREIGN_KEY_CHECKS = 1;');

}
