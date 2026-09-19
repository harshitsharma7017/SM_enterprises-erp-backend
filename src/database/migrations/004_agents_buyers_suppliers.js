export async function up(connection) {
  await connection.query(`CREATE TABLE \`agents\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`agent_type\` ENUM('supplier', 'buyer', 'jobber') NOT NULL,
  \`name\` VARCHAR(200) NOT NULL,
  \`display_code\` VARCHAR(5) NOT NULL,
  \`calculation_basis_id\` BIGINT UNSIGNED,
  \`status\` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  \`remarks\` TEXT,
  \`created_by\` BIGINT UNSIGNED,
  \`updated_by\` BIGINT UNSIGNED,
  \`created_at\` TIMESTAMP,
  \`updated_at\` TIMESTAMP,
  \`deleted_at\` TIMESTAMP,
  \`phone\` VARCHAR(30),
  \`city\` VARCHAR(80),
  \`address\` VARCHAR(255),
  \`gst_number\` VARCHAR(15),
  \`pan_number\` VARCHAR(10),
  \`bank_name\` VARCHAR(120),
  \`account_number\` VARCHAR(40),
  \`ifsc_code\` VARCHAR(11),
  \`swift_code\` VARCHAR(20),
  \`payment_term_custom\` VARCHAR(255),
  \`comments\` TEXT,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`agents_display_code_unique\` (\`display_code\`),
  INDEX \`agents_agent_type_status_index\` (\`agent_type\`, \`status\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);

  await connection.query(`CREATE TABLE \`agent_category\` (
  \`agent_id\` BIGINT UNSIGNED NOT NULL,
  \`category_id\` BIGINT UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);

  await connection.query(`CREATE TABLE \`agent_commissions\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`agent_id\` BIGINT UNSIGNED NOT NULL,
  \`commission_type\` ENUM('percent', 'fixed') NOT NULL,
  \`amount\` DECIMAL(12, 4) NOT NULL,
  \`currency_id\` BIGINT UNSIGNED,
  \`sort_order\` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  \`created_at\` TIMESTAMP,
  \`updated_at\` TIMESTAMP,
  PRIMARY KEY (\`id\`),
  INDEX \`agent_commissions_agent_id_sort_order_index\` (\`agent_id\`, \`sort_order\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);

  await connection.query(`CREATE TABLE \`buyers\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`display_code\` VARCHAR(5) NOT NULL,
  \`company_name\` VARCHAR(200) NOT NULL,
  \`name_on_export_invoice\` VARCHAR(200),
  \`contact_person\` VARCHAR(120),
  \`email\` VARCHAR(150),
  \`mobile\` VARCHAR(30),
  \`gst_vat_no\` VARCHAR(30),
  \`address\` VARCHAR(255),
  \`country_id\` BIGINT UNSIGNED,
  \`pincode\` VARCHAR(20),
  \`port_id\` BIGINT UNSIGNED,
  \`agent_id\` BIGINT UNSIGNED,
  \`agent_commission_type\` ENUM('percent', 'amount'),
  \`agent_commission_value\` DECIMAL(12, 4),
  \`payment_term_id\` BIGINT UNSIGNED,
  \`incoterm_id\` BIGINT UNSIGNED,
  \`currency_id\` BIGINT UNSIGNED,
  \`bank_name\` VARCHAR(120),
  \`account_number\` VARCHAR(40),
  \`swift_code\` VARCHAR(20),
  \`status\` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  \`remarks\` TEXT,
  \`created_by\` BIGINT UNSIGNED,
  \`updated_by\` BIGINT UNSIGNED,
  \`created_at\` TIMESTAMP,
  \`updated_at\` TIMESTAMP,
  \`deleted_at\` TIMESTAMP,
  \`state_id\` BIGINT UNSIGNED,
  \`city_id\` BIGINT UNSIGNED,
  \`advance_percent\` DECIMAL(5, 2),
  \`sight_percent\` DECIMAL(5, 2),
  \`shipment_method\` VARCHAR(120),
  \`comments\` TEXT,
  \`contact_designation_id\` BIGINT UNSIGNED,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`buyers_display_code_unique\` (\`display_code\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);

  await connection.query(`CREATE TABLE \`buyer_category\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`buyer_id\` BIGINT UNSIGNED NOT NULL,
  \`category_id\` BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`buyer_category_buyer_id_category_id_unique\` (\`buyer_id\`, \`category_id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);

  await connection.query(`CREATE TABLE \`buyer_carton_markings\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`buyer_id\` BIGINT UNSIGNED NOT NULL,
  \`line_no\` TINYINT UNSIGNED NOT NULL,
  \`label\` VARCHAR(60) NOT NULL,
  \`value\` VARCHAR(120),
  \`is_required\` TINYINT(1) NOT NULL DEFAULT 0,
  \`created_at\` TIMESTAMP,
  \`updated_at\` TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`buyer_carton_markings_buyer_id_line_no_unique\` (\`buyer_id\`, \`line_no\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);

  await connection.query(`CREATE TABLE \`buyer_contacts\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`buyer_id\` BIGINT UNSIGNED NOT NULL,
  \`name\` VARCHAR(120) NOT NULL,
  \`designation_id\` BIGINT UNSIGNED,
  \`mobile\` VARCHAR(30),
  \`email\` VARCHAR(150),
  \`created_at\` TIMESTAMP,
  \`updated_at\` TIMESTAMP,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);

  await connection.query(`CREATE TABLE \`supplier_types\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`code\` VARCHAR(30) NOT NULL,
  \`name\` VARCHAR(80) NOT NULL,
  \`is_registered\` TINYINT(1) NOT NULL DEFAULT 0,
  \`status\` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  \`created_at\` TIMESTAMP,
  \`updated_at\` TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`supplier_types_code_unique\` (\`code\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);

  await connection.query(`CREATE TABLE \`suppliers\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`display_code\` VARCHAR(5) NOT NULL,
  \`party_type\` ENUM('supplier', 'jobber', 'both') NOT NULL DEFAULT 'supplier',
  \`company_name\` VARCHAR(200) NOT NULL,
  \`name_on_bill\` VARCHAR(200),
  \`supplier_type_id\` BIGINT UNSIGNED,
  \`gst_number\` VARCHAR(15),
  \`pan_number\` VARCHAR(10),
  \`is_msme\` TINYINT(1) NOT NULL DEFAULT 0,
  \`msme_registration_no\` VARCHAR(40),
  \`address\` VARCHAR(255),
  \`country_id\` BIGINT UNSIGNED,
  \`state_id\` BIGINT UNSIGNED,
  \`city_id\` BIGINT UNSIGNED,
  \`pincode\` VARCHAR(20),
  \`discount_percent\` DECIMAL(4, 2),
  \`credit_days\` SMALLINT UNSIGNED,
  \`bank_name\` VARCHAR(120),
  \`account_number\` VARCHAR(40),
  \`ifsc_code\` VARCHAR(11),
  \`agent_id\` BIGINT UNSIGNED,
  \`agent_commission_type\` ENUM('percent', 'amount'),
  \`agent_commission_value\` DECIMAL(12, 4),
  \`we_supply_material\` TINYINT(1) NOT NULL DEFAULT 0,
  \`requires_sample_approval\` TINYINT(1) NOT NULL DEFAULT 0,
  \`status\` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  \`remarks\` TEXT,
  \`created_by\` BIGINT UNSIGNED,
  \`updated_by\` BIGINT UNSIGNED,
  \`created_at\` TIMESTAMP,
  \`updated_at\` TIMESTAMP,
  \`deleted_at\` TIMESTAMP,
  \`comments\` TEXT,
  \`client_details\` TEXT,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`suppliers_display_code_unique\` (\`display_code\`),
  INDEX \`suppliers_party_type_status_index\` (\`party_type\`, \`status\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);

  await connection.query(`CREATE TABLE \`supplier_category\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`supplier_id\` BIGINT UNSIGNED NOT NULL,
  \`category_id\` BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`supplier_category_supplier_id_category_id_unique\` (\`supplier_id\`, \`category_id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);

  await connection.query(`CREATE TABLE \`supplier_contacts\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`supplier_id\` BIGINT UNSIGNED NOT NULL,
  \`name\` VARCHAR(120) NOT NULL,
  \`designation_id\` BIGINT UNSIGNED,
  \`mobile\` VARCHAR(30),
  \`email\` VARCHAR(150),
  \`is_primary\` TINYINT(1) NOT NULL DEFAULT 0,
  \`created_at\` TIMESTAMP,
  \`updated_at\` TIMESTAMP,
  PRIMARY KEY (\`id\`),
  INDEX \`supplier_contacts_supplier_id_is_primary_index\` (\`supplier_id\`, \`is_primary\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);

  await connection.query(`CREATE TABLE \`supplier_product\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`supplier_id\` BIGINT UNSIGNED NOT NULL,
  \`product_id\` BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`supplier_product_supplier_id_product_id_unique\` (\`supplier_id\`, \`product_id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);

  await connection.query(`CREATE TABLE \`supplier_buyer\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`supplier_id\` BIGINT UNSIGNED NOT NULL,
  \`buyer_id\` BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`supplier_buyer_supplier_id_buyer_id_unique\` (\`supplier_id\`, \`buyer_id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);

  await connection.query(`CREATE TABLE \`default_markups\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`name\` VARCHAR(120) NOT NULL,
  \`markup_percent\` DECIMAL(5, 2) NOT NULL,
  \`status\` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  \`created_at\` TIMESTAMP,
  \`updated_at\` TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`default_markups_name_unique\` (\`name\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);

  await connection.query(`CREATE TABLE \`markups\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`supplier_id\` BIGINT UNSIGNED NOT NULL,
  \`buyer_id\` BIGINT UNSIGNED NOT NULL,
  \`record_date\` DATE NOT NULL,
  \`markup_percent\` DECIMAL(5, 2) NOT NULL,
  \`status\` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  \`remarks\` TEXT,
  \`created_by\` BIGINT UNSIGNED,
  \`updated_by\` BIGINT UNSIGNED,
  \`created_at\` TIMESTAMP,
  \`updated_at\` TIMESTAMP,
  \`deleted_at\` TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`markups_supplier_id_buyer_id_unique\` (\`supplier_id\`, \`buyer_id\`),
  INDEX \`markups_status_record_date_index\` (\`status\`, \`record_date\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);


  await connection.query(`ALTER TABLE \`agents\` ADD CONSTRAINT \`agents_calculation_basis_id_foreign\` FOREIGN KEY (\`calculation_basis_id\`) REFERENCES \`calculation_bases\` (\`id\`) ON DELETE SET NULL;`);
  await connection.query(`ALTER TABLE \`agents\` ADD CONSTRAINT \`agents_created_by_foreign\` FOREIGN KEY (\`created_by\`) REFERENCES \`users\` (\`id\`) ON DELETE SET NULL;`);
  await connection.query(`ALTER TABLE \`agents\` ADD CONSTRAINT \`agents_updated_by_foreign\` FOREIGN KEY (\`updated_by\`) REFERENCES \`users\` (\`id\`) ON DELETE SET NULL;`);
  await connection.query(`ALTER TABLE \`agent_category\` ADD CONSTRAINT \`agent_category_agent_id_foreign\` FOREIGN KEY (\`agent_id\`) REFERENCES \`agents\` (\`id\`) ON DELETE CASCADE;`);
  await connection.query(`ALTER TABLE \`agent_category\` ADD CONSTRAINT \`agent_category_category_id_foreign\` FOREIGN KEY (\`category_id\`) REFERENCES \`categories\` (\`id\`) ON DELETE CASCADE;`);
  await connection.query(`ALTER TABLE \`agent_commissions\` ADD CONSTRAINT \`agent_commissions_agent_id_foreign\` FOREIGN KEY (\`agent_id\`) REFERENCES \`agents\` (\`id\`) ON DELETE CASCADE;`);
  await connection.query(`ALTER TABLE \`agent_commissions\` ADD CONSTRAINT \`agent_commissions_currency_id_foreign\` FOREIGN KEY (\`currency_id\`) REFERENCES \`currencies\` (\`id\`) ON DELETE SET NULL;`);
  await connection.query(`ALTER TABLE \`buyers\` ADD CONSTRAINT \`buyers_country_id_foreign\` FOREIGN KEY (\`country_id\`) REFERENCES \`countries\` (\`id\`) ON DELETE SET NULL;`);
  await connection.query(`ALTER TABLE \`buyers\` ADD CONSTRAINT \`buyers_port_id_foreign\` FOREIGN KEY (\`port_id\`) REFERENCES \`ports\` (\`id\`) ON DELETE SET NULL;`);
  await connection.query(`ALTER TABLE \`buyers\` ADD CONSTRAINT \`buyers_agent_id_foreign\` FOREIGN KEY (\`agent_id\`) REFERENCES \`agents\` (\`id\`) ON DELETE SET NULL;`);
  await connection.query(`ALTER TABLE \`buyers\` ADD CONSTRAINT \`buyers_payment_term_id_foreign\` FOREIGN KEY (\`payment_term_id\`) REFERENCES \`payment_terms\` (\`id\`) ON DELETE SET NULL;`);
  await connection.query(`ALTER TABLE \`buyers\` ADD CONSTRAINT \`buyers_incoterm_id_foreign\` FOREIGN KEY (\`incoterm_id\`) REFERENCES \`incoterms\` (\`id\`) ON DELETE SET NULL;`);
  await connection.query(`ALTER TABLE \`buyers\` ADD CONSTRAINT \`buyers_currency_id_foreign\` FOREIGN KEY (\`currency_id\`) REFERENCES \`currencies\` (\`id\`) ON DELETE SET NULL;`);
  await connection.query(`ALTER TABLE \`buyers\` ADD CONSTRAINT \`buyers_created_by_foreign\` FOREIGN KEY (\`created_by\`) REFERENCES \`users\` (\`id\`) ON DELETE SET NULL;`);
  await connection.query(`ALTER TABLE \`buyers\` ADD CONSTRAINT \`buyers_updated_by_foreign\` FOREIGN KEY (\`updated_by\`) REFERENCES \`users\` (\`id\`) ON DELETE SET NULL;`);
  await connection.query(`ALTER TABLE \`buyers\` ADD CONSTRAINT \`buyers_state_id_foreign\` FOREIGN KEY (\`state_id\`) REFERENCES \`states\` (\`id\`) ON DELETE SET NULL;`);
  await connection.query(`ALTER TABLE \`buyers\` ADD CONSTRAINT \`buyers_city_id_foreign\` FOREIGN KEY (\`city_id\`) REFERENCES \`cities\` (\`id\`) ON DELETE SET NULL;`);
  await connection.query(`ALTER TABLE \`buyers\` ADD CONSTRAINT \`buyers_contact_designation_id_foreign\` FOREIGN KEY (\`contact_designation_id\`) REFERENCES \`designations\` (\`id\`) ON DELETE SET NULL;`);
  await connection.query(`ALTER TABLE \`buyer_category\` ADD CONSTRAINT \`buyer_category_buyer_id_foreign\` FOREIGN KEY (\`buyer_id\`) REFERENCES \`buyers\` (\`id\`) ON DELETE CASCADE;`);
  await connection.query(`ALTER TABLE \`buyer_category\` ADD CONSTRAINT \`buyer_category_category_id_foreign\` FOREIGN KEY (\`category_id\`) REFERENCES \`categories\` (\`id\`) ON DELETE RESTRICT;`);
  await connection.query(`ALTER TABLE \`buyer_carton_markings\` ADD CONSTRAINT \`buyer_carton_markings_buyer_id_foreign\` FOREIGN KEY (\`buyer_id\`) REFERENCES \`buyers\` (\`id\`) ON DELETE CASCADE;`);
  await connection.query(`ALTER TABLE \`buyer_contacts\` ADD CONSTRAINT \`buyer_contacts_buyer_id_foreign\` FOREIGN KEY (\`buyer_id\`) REFERENCES \`buyers\` (\`id\`) ON DELETE CASCADE;`);
  await connection.query(`ALTER TABLE \`buyer_contacts\` ADD CONSTRAINT \`buyer_contacts_designation_id_foreign\` FOREIGN KEY (\`designation_id\`) REFERENCES \`designations\` (\`id\`) ON DELETE SET NULL;`);
  await connection.query(`ALTER TABLE \`suppliers\` ADD CONSTRAINT \`suppliers_supplier_type_id_foreign\` FOREIGN KEY (\`supplier_type_id\`) REFERENCES \`supplier_types\` (\`id\`) ON DELETE SET NULL;`);
  await connection.query(`ALTER TABLE \`suppliers\` ADD CONSTRAINT \`suppliers_country_id_foreign\` FOREIGN KEY (\`country_id\`) REFERENCES \`countries\` (\`id\`) ON DELETE SET NULL;`);
  await connection.query(`ALTER TABLE \`suppliers\` ADD CONSTRAINT \`suppliers_state_id_foreign\` FOREIGN KEY (\`state_id\`) REFERENCES \`states\` (\`id\`) ON DELETE SET NULL;`);
  await connection.query(`ALTER TABLE \`suppliers\` ADD CONSTRAINT \`suppliers_city_id_foreign\` FOREIGN KEY (\`city_id\`) REFERENCES \`cities\` (\`id\`) ON DELETE SET NULL;`);
  await connection.query(`ALTER TABLE \`suppliers\` ADD CONSTRAINT \`suppliers_agent_id_foreign\` FOREIGN KEY (\`agent_id\`) REFERENCES \`agents\` (\`id\`) ON DELETE SET NULL;`);
  await connection.query(`ALTER TABLE \`suppliers\` ADD CONSTRAINT \`suppliers_created_by_foreign\` FOREIGN KEY (\`created_by\`) REFERENCES \`users\` (\`id\`) ON DELETE SET NULL;`);
  await connection.query(`ALTER TABLE \`suppliers\` ADD CONSTRAINT \`suppliers_updated_by_foreign\` FOREIGN KEY (\`updated_by\`) REFERENCES \`users\` (\`id\`) ON DELETE SET NULL;`);
  await connection.query(`ALTER TABLE \`supplier_category\` ADD CONSTRAINT \`supplier_category_supplier_id_foreign\` FOREIGN KEY (\`supplier_id\`) REFERENCES \`suppliers\` (\`id\`) ON DELETE CASCADE;`);
  await connection.query(`ALTER TABLE \`supplier_category\` ADD CONSTRAINT \`supplier_category_category_id_foreign\` FOREIGN KEY (\`category_id\`) REFERENCES \`categories\` (\`id\`) ON DELETE RESTRICT;`);
  await connection.query(`ALTER TABLE \`supplier_contacts\` ADD CONSTRAINT \`supplier_contacts_supplier_id_foreign\` FOREIGN KEY (\`supplier_id\`) REFERENCES \`suppliers\` (\`id\`) ON DELETE CASCADE;`);
  await connection.query(`ALTER TABLE \`supplier_contacts\` ADD CONSTRAINT \`supplier_contacts_designation_id_foreign\` FOREIGN KEY (\`designation_id\`) REFERENCES \`designations\` (\`id\`) ON DELETE SET NULL;`);
  await connection.query(`ALTER TABLE \`supplier_product\` ADD CONSTRAINT \`supplier_product_supplier_id_foreign\` FOREIGN KEY (\`supplier_id\`) REFERENCES \`suppliers\` (\`id\`) ON DELETE CASCADE;`);
  await connection.query(`ALTER TABLE \`supplier_product\` ADD CONSTRAINT \`supplier_product_product_id_foreign\` FOREIGN KEY (\`product_id\`) REFERENCES \`products\` (\`id\`) ON DELETE RESTRICT;`);
  await connection.query(`ALTER TABLE \`supplier_buyer\` ADD CONSTRAINT \`supplier_buyer_supplier_id_foreign\` FOREIGN KEY (\`supplier_id\`) REFERENCES \`suppliers\` (\`id\`) ON DELETE CASCADE;`);
  await connection.query(`ALTER TABLE \`supplier_buyer\` ADD CONSTRAINT \`supplier_buyer_buyer_id_foreign\` FOREIGN KEY (\`buyer_id\`) REFERENCES \`buyers\` (\`id\`) ON DELETE RESTRICT;`);
  await connection.query(`ALTER TABLE \`markups\` ADD CONSTRAINT \`markups_supplier_id_foreign\` FOREIGN KEY (\`supplier_id\`) REFERENCES \`suppliers\` (\`id\`) ON DELETE RESTRICT;`);
  await connection.query(`ALTER TABLE \`markups\` ADD CONSTRAINT \`markups_buyer_id_foreign\` FOREIGN KEY (\`buyer_id\`) REFERENCES \`buyers\` (\`id\`) ON DELETE RESTRICT;`);
  await connection.query(`ALTER TABLE \`markups\` ADD CONSTRAINT \`markups_created_by_foreign\` FOREIGN KEY (\`created_by\`) REFERENCES \`users\` (\`id\`) ON DELETE SET NULL;`);
  await connection.query(`ALTER TABLE \`markups\` ADD CONSTRAINT \`markups_updated_by_foreign\` FOREIGN KEY (\`updated_by\`) REFERENCES \`users\` (\`id\`) ON DELETE SET NULL;`);

}

export async function down(connection) {
await connection.query('SET FOREIGN_KEY_CHECKS = 0;');
  await connection.query('DROP TABLE IF EXISTS `markups`;');
  await connection.query('DROP TABLE IF EXISTS `default_markups`;');
  await connection.query('DROP TABLE IF EXISTS `supplier_buyer`;');
  await connection.query('DROP TABLE IF EXISTS `supplier_product`;');
  await connection.query('DROP TABLE IF EXISTS `supplier_contacts`;');
  await connection.query('DROP TABLE IF EXISTS `supplier_category`;');
  await connection.query('DROP TABLE IF EXISTS `suppliers`;');
  await connection.query('DROP TABLE IF EXISTS `supplier_types`;');
  await connection.query('DROP TABLE IF EXISTS `buyer_contacts`;');
  await connection.query('DROP TABLE IF EXISTS `buyer_carton_markings`;');
  await connection.query('DROP TABLE IF EXISTS `buyer_category`;');
  await connection.query('DROP TABLE IF EXISTS `buyers`;');
  await connection.query('DROP TABLE IF EXISTS `agent_commissions`;');
  await connection.query('DROP TABLE IF EXISTS `agent_category`;');
  await connection.query('DROP TABLE IF EXISTS `agents`;');
  await connection.query('SET FOREIGN_KEY_CHECKS = 1;');

}
