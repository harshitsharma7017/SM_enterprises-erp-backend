/**
 * Document archive (client requirement 18: documents generated and maintained
 * in the ERP, linked with their transactions for future reference).
 *
 * When a transaction reaches its final state its PDF is rendered once and kept
 * — PO confirmed, GRN posted, QC completed, supplier return posted, debit note
 * posted, material issue posted, processing output posted, proforma invoice
 * issued, invoice issued. The live /document endpoints still regenerate from
 * the record; the archived copy is what was issued, unchanged by later master
 * edits. Files live in the storage layer under documents/ (never served by
 * /storage) and are downloaded through the authenticated API.
 *
 * document.view (register + downloads) goes to Super Admin and Admin only.
 */
const PERMISSIONS = ['document.view'];
const GRANTED_ROLES = ['Super Admin', 'Admin'];

export async function up(connection) {
  await connection.query(`CREATE TABLE IF NOT EXISTS \`document_archive\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`company_id\` BIGINT UNSIGNED NULL,
  \`entity_type\` VARCHAR(40) NOT NULL,
  \`entity_id\` BIGINT UNSIGNED NOT NULL,
  \`document_type\` VARCHAR(60) NOT NULL,
  \`document_no\` VARCHAR(80) NOT NULL,
  \`event\` VARCHAR(40) NOT NULL,
  \`storage_key\` VARCHAR(512) NOT NULL,
  \`file_name\` VARCHAR(200) NOT NULL,
  \`file_size\` INT UNSIGNED NOT NULL,
  \`sha256\` CHAR(64) NOT NULL,
  \`created_by\` BIGINT UNSIGNED NULL,
  \`created_at\` TIMESTAMP NULL,
  PRIMARY KEY (\`id\`),
  INDEX \`document_archive_entity_index\` (\`entity_type\`, \`entity_id\`),
  INDEX \`document_archive_company_index\` (\`company_id\`, \`created_at\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);

  for (const name of PERMISSIONS) {
    await connection.query('INSERT IGNORE INTO `permissions` (name, group_name) VALUES (?, ?)', [name, 'Reports']);
  }
  for (const role of GRANTED_ROLES) {
    await connection.query(
      `INSERT IGNORE INTO \`role_permissions\` (role_id, permission_id)
       SELECT r.id, p.id FROM \`roles\` r JOIN \`permissions\` p ON p.name IN (?)
       WHERE r.name = ?`,
      [PERMISSIONS, role]
    );
  }
}

export async function down(connection) {
  await connection.query('DELETE FROM `permissions` WHERE name IN (?)', [PERMISSIONS]);
  await connection.query('DROP TABLE IF EXISTS `document_archive`');
}
