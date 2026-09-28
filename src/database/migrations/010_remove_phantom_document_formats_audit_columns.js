import { hasColumn, hasForeignKey } from '../schema-helpers.js';

export async function up(connection) {
  // Remove phantom foreign keys and columns that were incorrectly added
  // due to a parsing hallucination in earlier phases.
  // We must drop the FKs first before we can drop the columns.
  // 002 no longer creates them, so on a fresh database there is nothing to drop.
  for (const fk of ['document_formats_created_by_foreign', 'document_formats_updated_by_foreign']) {
    if (await hasForeignKey(connection, 'document_formats', fk)) {
      await connection.query(`ALTER TABLE \`document_formats\` DROP FOREIGN KEY \`${fk}\`;`);
    }
  }
  for (const column of ['created_by', 'updated_by']) {
    if (await hasColumn(connection, 'document_formats', column)) {
      await connection.query(`ALTER TABLE \`document_formats\` DROP COLUMN \`${column}\`;`);
    }
  }
}

export async function down(connection) {
  // Restore the columns and FKs only for rollback consistency with the previous flawed implementation.
  // Note: These columns NEVER existed in the actual original ERP schema, this is strictly a technical rollback.
  
  await connection.query('ALTER TABLE `document_formats` ADD COLUMN `created_by` BIGINT UNSIGNED;');
  await connection.query('ALTER TABLE `document_formats` ADD COLUMN `updated_by` BIGINT UNSIGNED;');
  
  await connection.query('ALTER TABLE `document_formats` ADD CONSTRAINT `document_formats_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;');
  await connection.query('ALTER TABLE `document_formats` ADD CONSTRAINT `document_formats_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;');
}
