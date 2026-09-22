/**
 * Restores columns that migration 011 ("correct schema mismatches") dropped
 * from `document_formats` / `document_format_columns` but that the Order
 * Format module's service/repository layer still computes and expects to
 * read/write: `document_formats.allow_multiple_colours` / `delivery_details`
 * / `packing_details`, and `document_format_columns.is_mandatory` /
 * `sub_columns`.
 *
 * Discovered while building the Inquiry/Order Confirmation frontend (Phase
 * 4A): those two modules' line-item UI depends on exactly these fields
 * (multi-colour "+ Add colour" button, mandatory-field asterisk, fixed
 * size-tag grid). Without them, `orderFormatService.create()`/`update()`
 * silently drop the values a user enters in the Format Master form (Phase
 * 3), and `findByIdIncludingRequiredRelations()` can never read them back —
 * confirmed against the live `garment_erp` schema (DESCRIBE showed neither
 * table has these columns) before writing this migration, not guessed from
 * migration-file history alone.
 *
 * Purely additive — existing `document_formats`/`document_format_columns`
 * rows get NULL/false defaults for the restored columns (which matches
 * their true, already-silently-dropped state), and no other column or
 * table is touched.
 */

export async function up(connection) {
  await connection.query(`ALTER TABLE \`document_formats\` ADD COLUMN \`allow_multiple_colours\` TINYINT(1) NOT NULL DEFAULT 0 AFTER \`status\`;`);
  await connection.query(`ALTER TABLE \`document_formats\` ADD COLUMN \`delivery_details\` TEXT NULL AFTER \`allow_multiple_colours\`;`);
  await connection.query(`ALTER TABLE \`document_formats\` ADD COLUMN \`packing_details\` TEXT NULL AFTER \`delivery_details\`;`);

  await connection.query(`ALTER TABLE \`document_format_columns\` ADD COLUMN \`is_mandatory\` TINYINT(1) NOT NULL DEFAULT 0 AFTER \`is_enabled\`;`);
  await connection.query(`ALTER TABLE \`document_format_columns\` ADD COLUMN \`sub_columns\` JSON NULL AFTER \`print_only\`;`);
}

export async function down(connection) {
  await connection.query(`ALTER TABLE \`document_format_columns\` DROP COLUMN \`sub_columns\`;`);
  await connection.query(`ALTER TABLE \`document_format_columns\` DROP COLUMN \`is_mandatory\`;`);

  await connection.query(`ALTER TABLE \`document_formats\` DROP COLUMN \`packing_details\`;`);
  await connection.query(`ALTER TABLE \`document_formats\` DROP COLUMN \`delivery_details\`;`);
  await connection.query(`ALTER TABLE \`document_formats\` DROP COLUMN \`allow_multiple_colours\`;`);
}
