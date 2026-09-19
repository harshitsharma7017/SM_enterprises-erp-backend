export async function up(connection) {
  await connection.query(`CREATE TABLE \`countries\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`iso_code\` CHAR(2) NOT NULL,
  \`name\` VARCHAR(100) NOT NULL,
  \`dial_code\` VARCHAR(10),
  \`status\` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  \`created_at\` TIMESTAMP,
  \`updated_at\` TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`countries_iso_code_unique\` (\`iso_code\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);

  await connection.query(`CREATE TABLE \`states\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`country_id\` BIGINT UNSIGNED NOT NULL,
  \`name\` VARCHAR(120) NOT NULL,
  \`code\` VARCHAR(10),
  \`status\` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  \`created_at\` TIMESTAMP,
  \`updated_at\` TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`states_country_id_name_unique\` (\`country_id\`, \`name\`),
  INDEX \`states_country_id_status_index\` (\`country_id\`, \`status\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);

  await connection.query(`CREATE TABLE \`cities\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`state_id\` BIGINT UNSIGNED NOT NULL,
  \`name\` VARCHAR(120) NOT NULL,
  \`status\` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  \`created_at\` TIMESTAMP,
  \`updated_at\` TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`cities_state_id_name_unique\` (\`state_id\`, \`name\`),
  INDEX \`cities_state_id_status_index\` (\`state_id\`, \`status\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);

  await connection.query(`CREATE TABLE \`currencies\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`iso_code\` CHAR(3) NOT NULL,
  \`name\` VARCHAR(60) NOT NULL,
  \`symbol\` VARCHAR(10),
  \`status\` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  \`created_at\` TIMESTAMP,
  \`updated_at\` TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`currencies_iso_code_unique\` (\`iso_code\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);

  await connection.query(`CREATE TABLE \`ports\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`country_id\` BIGINT UNSIGNED,
  \`code\` VARCHAR(20),
  \`name\` VARCHAR(120) NOT NULL,
  \`type\` ENUM('sea', 'air', 'land') NOT NULL DEFAULT 'sea',
  \`status\` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  \`created_at\` TIMESTAMP,
  \`updated_at\` TIMESTAMP,
  PRIMARY KEY (\`id\`),
  INDEX \`ports_country_id_status_index\` (\`country_id\`, \`status\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);

  await connection.query(`CREATE TABLE \`incoterms\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`code\` VARCHAR(10) NOT NULL,
  \`name\` VARCHAR(120) NOT NULL,
  \`description\` VARCHAR(255),
  \`status\` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  \`created_at\` TIMESTAMP,
  \`updated_at\` TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`incoterms_code_unique\` (\`code\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);

  await connection.query(`CREATE TABLE \`payment_terms\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`name\` VARCHAR(80) NOT NULL,
  \`days\` SMALLINT,
  \`applies_to\` ENUM('buyer', 'supplier', 'both') NOT NULL DEFAULT 'both',
  \`status\` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  \`created_at\` TIMESTAMP,
  \`updated_at\` TIMESTAMP,
  \`has_split\` TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`payment_terms_name_unique\` (\`name\`),
  INDEX \`payment_terms_applies_to_status_index\` (\`applies_to\`, \`status\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);

  await connection.query(`CREATE TABLE \`shipment_methods\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`name\` VARCHAR(60) NOT NULL,
  \`status\` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  \`created_at\` TIMESTAMP,
  \`updated_at\` TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`shipment_methods_name_unique\` (\`name\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);

  await connection.query(`CREATE TABLE \`designations\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`name\` VARCHAR(80) NOT NULL,
  \`status\` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  \`created_at\` TIMESTAMP,
  \`updated_at\` TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`designations_name_unique\` (\`name\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);

  await connection.query(`CREATE TABLE \`calculation_bases\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`name\` VARCHAR(60) NOT NULL,
  \`status\` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  \`created_at\` TIMESTAMP,
  \`updated_at\` TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`calculation_bases_name_unique\` (\`name\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);

  await connection.query(`CREATE TABLE \`price_bands\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`code\` VARCHAR(10) NOT NULL,
  \`name\` VARCHAR(60) NOT NULL,
  \`status\` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  \`created_at\` TIMESTAMP,
  \`updated_at\` TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`price_bands_code_unique\` (\`code\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);

  await connection.query(`CREATE TABLE \`gst_rates\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`rate\` DECIMAL(5, 2) NOT NULL,
  \`status\` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  \`created_at\` TIMESTAMP,
  \`updated_at\` TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`gst_rates_rate_unique\` (\`rate\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);

  await connection.query(`CREATE TABLE \`document_formats\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`name\` VARCHAR(120) NOT NULL,
  \`module\` VARCHAR(40) NOT NULL DEFAULT 'po',
  \`blade_view\` VARCHAR(160),
  \`status\` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  \`created_at\` TIMESTAMP,
  \`updated_at\` TIMESTAMP,
  \`description\` TEXT,
  \`allow_multiple_colours\` TINYINT(1) NOT NULL DEFAULT 0,
  \`delivery_details\` TEXT,
  \`packing_details\` TEXT,
  \`deleted_at\` TIMESTAMP,
  PRIMARY KEY (\`id\`),
  INDEX \`document_formats_module_status_index\` (\`module\`, \`status\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);

  await connection.query(`CREATE TABLE \`number_series\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`module\` VARCHAR(40) NOT NULL,
  \`prefix\` VARCHAR(20) NOT NULL DEFAULT '',
  \`financial_year\` VARCHAR(10),
  \`current_number\` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  \`padding\` TINYINT UNSIGNED NOT NULL DEFAULT 3,
  \`reset_yearly\` TINYINT(1) NOT NULL DEFAULT 0,
  \`created_at\` TIMESTAMP,
  \`updated_at\` TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`number_series_module_financial_year_unique\` (\`module\`, \`financial_year\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);

  await connection.query(`CREATE TABLE \`inquiry_sources\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`name\` VARCHAR(80) NOT NULL,
  \`status\` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  \`created_at\` TIMESTAMP,
  \`updated_at\` TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`inquiry_sources_name_unique\` (\`name\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);

  await connection.query(`CREATE TABLE \`document_checklist_types\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`code\` VARCHAR(60) NOT NULL,
  \`name\` VARCHAR(120) NOT NULL,
  \`description\` TEXT,
  \`category\` ENUM('generated', 'uploaded', 'manual') NOT NULL DEFAULT 'uploaded',
  \`variant_labels\` JSON,
  \`closes_shipment\` TINYINT(1) NOT NULL DEFAULT 0,
  \`sort_order\` INT UNSIGNED NOT NULL DEFAULT 0,
  \`status\` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  \`created_at\` TIMESTAMP,
  \`updated_at\` TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`document_checklist_types_code_unique\` (\`code\`),
  INDEX \`document_checklist_types_status_sort_order_index\` (\`status\`, \`sort_order\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);

  await connection.query(`CREATE TABLE \`fob_values\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`name\` VARCHAR(120) NOT NULL,
  \`status\` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  \`remarks\` TEXT,
  \`created_by\` BIGINT UNSIGNED,
  \`updated_by\` BIGINT UNSIGNED,
  \`created_at\` TIMESTAMP,
  \`updated_at\` TIMESTAMP,
  \`deleted_at\` TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`fob_values_name_unique\` (\`name\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);

  await connection.query(`CREATE TABLE \`company_profile\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`company_name\` VARCHAR(255) NOT NULL,
  \`tagline\` VARCHAR(255),
  \`address\` TEXT,
  \`phone\` VARCHAR(255),
  \`email\` VARCHAR(255),
  \`gstin\` VARCHAR(255),
  \`iec_code\` VARCHAR(255),
  \`bank_name\` VARCHAR(255),
  \`bank_account_number\` VARCHAR(255),
  \`bank_ifsc\` VARCHAR(255),
  \`bank_swift\` VARCHAR(255),
  \`signatory_name\` VARCHAR(255),
  \`signatory_designation\` VARCHAR(255),
  \`logo_path\` VARCHAR(255),
  \`created_at\` TIMESTAMP,
  \`updated_at\` TIMESTAMP,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);


  await connection.query(`ALTER TABLE \`states\` ADD CONSTRAINT \`states_country_id_foreign\` FOREIGN KEY (\`country_id\`) REFERENCES \`countries\` (\`id\`) ON DELETE CASCADE;`);
  await connection.query(`ALTER TABLE \`cities\` ADD CONSTRAINT \`cities_state_id_foreign\` FOREIGN KEY (\`state_id\`) REFERENCES \`states\` (\`id\`) ON DELETE CASCADE;`);
  await connection.query(`ALTER TABLE \`ports\` ADD CONSTRAINT \`ports_country_id_foreign\` FOREIGN KEY (\`country_id\`) REFERENCES \`countries\` (\`id\`) ON DELETE SET NULL;`);
  await connection.query(`ALTER TABLE \`fob_values\` ADD CONSTRAINT \`fob_values_created_by_foreign\` FOREIGN KEY (\`created_by\`) REFERENCES \`users\` (\`id\`) ON DELETE SET NULL;`);
  await connection.query(`ALTER TABLE \`fob_values\` ADD CONSTRAINT \`fob_values_updated_by_foreign\` FOREIGN KEY (\`updated_by\`) REFERENCES \`users\` (\`id\`) ON DELETE SET NULL;`);

}

export async function down(connection) {
await connection.query('SET FOREIGN_KEY_CHECKS = 0;');
  await connection.query('DROP TABLE IF EXISTS `company_profile`;');
  await connection.query('DROP TABLE IF EXISTS `fob_values`;');
  await connection.query('DROP TABLE IF EXISTS `document_checklist_types`;');
  await connection.query('DROP TABLE IF EXISTS `inquiry_sources`;');
  await connection.query('DROP TABLE IF EXISTS `number_series`;');
  await connection.query('DROP TABLE IF EXISTS `document_formats`;');
  await connection.query('DROP TABLE IF EXISTS `gst_rates`;');
  await connection.query('DROP TABLE IF EXISTS `price_bands`;');
  await connection.query('DROP TABLE IF EXISTS `calculation_bases`;');
  await connection.query('DROP TABLE IF EXISTS `designations`;');
  await connection.query('DROP TABLE IF EXISTS `shipment_methods`;');
  await connection.query('DROP TABLE IF EXISTS `payment_terms`;');
  await connection.query('DROP TABLE IF EXISTS `incoterms`;');
  await connection.query('DROP TABLE IF EXISTS `ports`;');
  await connection.query('DROP TABLE IF EXISTS `currencies`;');
  await connection.query('DROP TABLE IF EXISTS `cities`;');
  await connection.query('DROP TABLE IF EXISTS `states`;');
  await connection.query('DROP TABLE IF EXISTS `countries`;');
  await connection.query('SET FOREIGN_KEY_CHECKS = 1;');

}
