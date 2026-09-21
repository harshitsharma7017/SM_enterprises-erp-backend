/**
 * Reconciles the locked `inquiries`/`inquiry_items` schema with Laravel's
 * current source (guru-traders-erp). Migration 011 had aligned these two
 * tables to an earlier Laravel snapshot (plain active/inactive status, a
 * free-text `source` column, no cost_price/custom_values) — Laravel's
 * source has since moved past that point. This migration catches Node up:
 *
 *   1. inquiries.status / inquiry_items.status -> the 6-stage pipeline enum
 *      (draft, price_working, quote_sent, confirmed, converted_to_oc, lost)
 *   2. inquiries.source (free text) -> inquiries.source_id (FK, nullable,
 *      restrictOnDelete), matching Laravel's final design exactly
 *   3. inquiry_items.cost_price, inquiry_items.custom_values added
 *   4. inquiries.buyer_id/category_id/document_format_id/currency_id made
 *      nullable so a genuine draft (mode=draft) can be saved without those
 *      fields — Laravel's own migration leaves these NOT NULL even though
 *      InquiryRequest's `required_unless:mode,draft` permits blank
 *      submission in draft mode; this is a real inconsistency in the
 *      Laravel source, and Node needs draft mode to actually work.
 *   5. inquiry_sources / currencies seeded with the baseline rows Laravel's
 *      own migration/seeder define (inquiry_sources: the 6 names from
 *      2026_08_12_000500_create_inquiry_sources_table.php; currencies: the
 *      8 rows from database/seeders/LookupSeeder.php) — both tables exist
 *      but were never populated on the Node side.
 *
 * Status enum changes use widen -> remap -> narrow so any existing
 * active/inactive row is carried forward rather than silently blanked:
 * active -> draft (open/in-progress), inactive -> lost (closed out).
 * No `inquiries`/`inquiry_items` rows exist as of writing, so this is
 * precautionary, not a live data migration.
 */

export async function up(connection) {
  // --- 1. inquiries.status: active/inactive -> 6-stage pipeline ---
  await connection.query(`ALTER TABLE \`inquiries\` MODIFY COLUMN \`status\` ENUM('active','inactive','draft','price_working','quote_sent','confirmed','converted_to_oc','lost') NOT NULL DEFAULT 'draft';`);
  await connection.query(`UPDATE \`inquiries\` SET \`status\` = 'draft' WHERE \`status\` = 'active';`);
  await connection.query(`UPDATE \`inquiries\` SET \`status\` = 'lost' WHERE \`status\` = 'inactive';`);
  await connection.query(`ALTER TABLE \`inquiries\` MODIFY COLUMN \`status\` ENUM('draft','price_working','quote_sent','confirmed','converted_to_oc','lost') NOT NULL DEFAULT 'draft';`);

  // --- 1b. inquiry_items.status: same pipeline, same remap ---
  await connection.query(`ALTER TABLE \`inquiry_items\` MODIFY COLUMN \`status\` ENUM('active','inactive','draft','price_working','quote_sent','confirmed','converted_to_oc','lost') NOT NULL DEFAULT 'draft';`);
  await connection.query(`UPDATE \`inquiry_items\` SET \`status\` = 'draft' WHERE \`status\` = 'active';`);
  await connection.query(`UPDATE \`inquiry_items\` SET \`status\` = 'lost' WHERE \`status\` = 'inactive';`);
  await connection.query(`ALTER TABLE \`inquiry_items\` MODIFY COLUMN \`status\` ENUM('draft','price_working','quote_sent','confirmed','converted_to_oc','lost') NOT NULL DEFAULT 'draft';`);

  // --- 4. Draft-mode NOT NULL conflict: make the four header FKs nullable ---
  await connection.query(`ALTER TABLE \`inquiries\` MODIFY COLUMN \`buyer_id\` BIGINT UNSIGNED NULL;`);
  await connection.query(`ALTER TABLE \`inquiries\` MODIFY COLUMN \`category_id\` BIGINT UNSIGNED NULL;`);
  await connection.query(`ALTER TABLE \`inquiries\` MODIFY COLUMN \`document_format_id\` BIGINT UNSIGNED NULL;`);
  await connection.query(`ALTER TABLE \`inquiries\` MODIFY COLUMN \`currency_id\` BIGINT UNSIGNED NULL;`);

  // --- 2. source (string) -> source_id (FK) ---
  await connection.query(`ALTER TABLE \`inquiries\` ADD COLUMN \`source_id\` BIGINT UNSIGNED NULL AFTER \`source\`;`);
  await connection.query(`ALTER TABLE \`inquiries\` ADD CONSTRAINT \`inquiries_source_id_foreign\` FOREIGN KEY (\`source_id\`) REFERENCES \`inquiry_sources\` (\`id\`) ON DELETE RESTRICT;`);
  // Backfill by name match before dropping the old column (no-op today, no existing rows).
  await connection.query(`UPDATE \`inquiries\` i JOIN \`inquiry_sources\` s ON LOWER(TRIM(i.source)) = LOWER(s.name) SET i.source_id = s.id WHERE i.source IS NOT NULL;`);
  await connection.query(`ALTER TABLE \`inquiries\` DROP COLUMN \`source\`;`);

  // --- 3. inquiry_items: cost_price, custom_values ---
  await connection.query(`ALTER TABLE \`inquiry_items\` ADD COLUMN \`cost_price\` DECIMAL(12,2) NULL AFTER \`price\`;`);
  await connection.query(`ALTER TABLE \`inquiry_items\` ADD COLUMN \`custom_values\` JSON NULL AFTER \`remarks\`;`);

  // --- 5. Baseline lookup data (idempotent; unique keys already exist on both tables) ---
  await connection.query(`INSERT IGNORE INTO \`inquiry_sources\` (\`name\`, \`status\`, \`created_at\`, \`updated_at\`) VALUES
    ('Direct', 'active', NOW(), NOW()),
    ('Through Agent', 'active', NOW(), NOW()),
    ('Referral', 'active', NOW(), NOW()),
    ('Exhibition', 'active', NOW(), NOW()),
    ('Website / Email', 'active', NOW(), NOW()),
    ('Other', 'active', NOW(), NOW());`);

  await connection.query(`INSERT IGNORE INTO \`currencies\` (\`iso_code\`, \`name\`, \`symbol\`, \`status\`, \`created_at\`, \`updated_at\`) VALUES
    ('INR', 'Indian Rupee', '₹', 'active', NOW(), NOW()),
    ('USD', 'US Dollar', '$', 'active', NOW(), NOW()),
    ('EUR', 'Euro', '€', 'active', NOW(), NOW()),
    ('GBP', 'Pound Sterling', '£', 'active', NOW(), NOW()),
    ('AED', 'UAE Dirham', 'د.إ', 'active', NOW(), NOW()),
    ('AUD', 'Australian Dollar', 'A$', 'active', NOW(), NOW()),
    ('CAD', 'Canadian Dollar', 'C$', 'active', NOW(), NOW()),
    ('JPY', 'Japanese Yen', '¥', 'active', NOW(), NOW());`);
}

export async function down(connection) {
  await connection.query(`DELETE FROM \`currencies\` WHERE \`iso_code\` IN ('INR','USD','EUR','GBP','AED','AUD','CAD','JPY');`);
  await connection.query(`DELETE FROM \`inquiry_sources\` WHERE \`name\` IN ('Direct','Through Agent','Referral','Exhibition','Website / Email','Other');`);

  await connection.query(`ALTER TABLE \`inquiry_items\` DROP COLUMN \`custom_values\`;`);
  await connection.query(`ALTER TABLE \`inquiry_items\` DROP COLUMN \`cost_price\`;`);

  await connection.query(`ALTER TABLE \`inquiries\` ADD COLUMN \`source\` VARCHAR(255) NULL AFTER \`buyer_ref\`;`);
  await connection.query(`UPDATE \`inquiries\` i JOIN \`inquiry_sources\` s ON i.source_id = s.id SET i.source = s.name;`);
  await connection.query(`ALTER TABLE \`inquiries\` DROP FOREIGN KEY \`inquiries_source_id_foreign\`;`);
  await connection.query(`ALTER TABLE \`inquiries\` DROP COLUMN \`source_id\`;`);

  await connection.query(`ALTER TABLE \`inquiries\` MODIFY COLUMN \`buyer_id\` BIGINT UNSIGNED NOT NULL;`);
  await connection.query(`ALTER TABLE \`inquiries\` MODIFY COLUMN \`category_id\` BIGINT UNSIGNED NOT NULL;`);
  await connection.query(`ALTER TABLE \`inquiries\` MODIFY COLUMN \`document_format_id\` BIGINT UNSIGNED NOT NULL;`);
  await connection.query(`ALTER TABLE \`inquiries\` MODIFY COLUMN \`currency_id\` BIGINT UNSIGNED NOT NULL;`);

  await connection.query(`ALTER TABLE \`inquiry_items\` MODIFY COLUMN \`status\` ENUM('draft','price_working','quote_sent','confirmed','converted_to_oc','lost','active','inactive') NOT NULL DEFAULT 'active';`);
  await connection.query(`UPDATE \`inquiry_items\` SET \`status\` = 'active' WHERE \`status\` IN ('draft','price_working','quote_sent');`);
  await connection.query(`UPDATE \`inquiry_items\` SET \`status\` = 'inactive' WHERE \`status\` IN ('confirmed','converted_to_oc','lost');`);
  await connection.query(`ALTER TABLE \`inquiry_items\` MODIFY COLUMN \`status\` ENUM('active','inactive') NOT NULL DEFAULT 'active';`);

  await connection.query(`ALTER TABLE \`inquiries\` MODIFY COLUMN \`status\` ENUM('draft','price_working','quote_sent','confirmed','converted_to_oc','lost','active','inactive') NOT NULL DEFAULT 'active';`);
  await connection.query(`UPDATE \`inquiries\` SET \`status\` = 'active' WHERE \`status\` IN ('draft','price_working','quote_sent');`);
  await connection.query(`UPDATE \`inquiries\` SET \`status\` = 'inactive' WHERE \`status\` IN ('confirmed','converted_to_oc','lost');`);
  await connection.query(`ALTER TABLE \`inquiries\` MODIFY COLUMN \`status\` ENUM('active','inactive') NOT NULL DEFAULT 'active';`);
}
