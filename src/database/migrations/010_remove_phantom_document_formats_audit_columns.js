export async function up(connection) {
  // Remove phantom foreign keys and columns that were incorrectly added
  // due to a parsing hallucination in earlier phases.
  // We must drop the FKs first before we can drop the columns.
  
  await connection.query('ALTER TABLE `document_formats` DROP FOREIGN KEY `document_formats_created_by_foreign`;');
  await connection.query('ALTER TABLE `document_formats` DROP FOREIGN KEY `document_formats_updated_by_foreign`;');
  
  await connection.query('ALTER TABLE `document_formats` DROP COLUMN `created_by`;');
  await connection.query('ALTER TABLE `document_formats` DROP COLUMN `updated_by`;');
}

export async function down(connection) {
  // Restore the columns and FKs only for rollback consistency with the previous flawed implementation.
  // Note: These columns NEVER existed in the actual original ERP schema, this is strictly a technical rollback.
  
  await connection.query('ALTER TABLE `document_formats` ADD COLUMN `created_by` BIGINT UNSIGNED;');
  await connection.query('ALTER TABLE `document_formats` ADD COLUMN `updated_by` BIGINT UNSIGNED;');
  
  await connection.query('ALTER TABLE `document_formats` ADD CONSTRAINT `document_formats_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;');
  await connection.query('ALTER TABLE `document_formats` ADD CONSTRAINT `document_formats_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;');
}
