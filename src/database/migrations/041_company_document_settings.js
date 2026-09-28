/**
 * Letterhead and document details per company (requirement 18): SM
 * Enterprises and Mahindra Gupta & Company each print their own logo, tax
 * numbers, bank details, signatory and — optionally — their own terms on the
 * documents the ERP generates. One row per company; every field optional (a
 * document simply leaves out what is not filled in). The single legacy
 * company_profile row is not used by these documents.
 */
export async function up(connection) {
  await connection.query(`CREATE TABLE IF NOT EXISTS \`company_document_settings\` (
  \`company_id\` BIGINT UNSIGNED NOT NULL,
  \`logo_path\` VARCHAR(255) NULL,
  \`tagline\` VARCHAR(200) NULL,
  \`pan\` VARCHAR(10) NULL,
  \`iec_code\` VARCHAR(20) NULL,
  \`website\` VARCHAR(150) NULL,
  \`bank_name\` VARCHAR(150) NULL,
  \`bank_branch\` VARCHAR(150) NULL,
  \`bank_account_name\` VARCHAR(200) NULL,
  \`bank_account_number\` VARCHAR(40) NULL,
  \`bank_ifsc\` VARCHAR(11) NULL,
  \`bank_swift\` VARCHAR(11) NULL,
  \`signatory_name\` VARCHAR(120) NULL,
  \`signatory_designation\` VARCHAR(120) NULL,
  \`purchase_terms\` TEXT NULL,
  \`sales_terms\` TEXT NULL,
  \`footer_note\` VARCHAR(255) NULL,
  \`updated_by\` BIGINT UNSIGNED NULL,
  \`created_at\` TIMESTAMP NULL,
  \`updated_at\` TIMESTAMP NULL,
  PRIMARY KEY (\`company_id\`),
  CONSTRAINT \`cds_company_id_foreign\` FOREIGN KEY (\`company_id\`) REFERENCES \`companies\` (\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);
}

export async function down(connection) {
  await connection.query('DROP TABLE IF EXISTS `company_document_settings`');
}
