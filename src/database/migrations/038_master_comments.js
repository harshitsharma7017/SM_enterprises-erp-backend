/**
 * Master fields the forms already send but the schema could not store, added
 * as in the original ERP.
 *
 * 1. "Comments" 
 * (2026_08_05_140000_add_comments_to_master_tables, 2026_08_12_000200_add_client_to_suppliers_table):
 * buyers / suppliers / products / agents get a free-text `comments` column
 * after `remarks`, and suppliers get `client_details` (the jobber's "Buyer
 * Details" text).
 *
 * 2. Buyer (2026_07_30_000900 states/cities, 2026_08_01_000200 expand,
 *    2026_08_10_130000 contact designation): state_id / city_id (cascading
 *    from country_id), the advance / at-sight split, and the contact person's
 *    designation. payment_terms.has_split says which terms open the split.
 */
const COMMENT_TABLES = ['buyers', 'suppliers', 'products', 'agents'];

const hasColumn = async (connection, table, column) => {
  const [rows] = await connection.query(
    'SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?',
    [table, column]
  );
  return rows.length > 0;
};

export async function up(connection) {
  for (const table of COMMENT_TABLES) {
    if (!(await hasColumn(connection, table, 'comments'))) {
      await connection.query(`ALTER TABLE \`${table}\` ADD COLUMN \`comments\` TEXT NULL AFTER \`remarks\``);
    }
  }
  if (!(await hasColumn(connection, 'suppliers', 'client_details'))) {
    await connection.query('ALTER TABLE `suppliers` ADD COLUMN `client_details` TEXT NULL AFTER `comments`');
  }

  if (!(await hasColumn(connection, 'buyers', 'state_id'))) {
    await connection.query(`ALTER TABLE \`buyers\`
      ADD COLUMN \`state_id\` BIGINT UNSIGNED NULL AFTER \`country_id\`,
      ADD COLUMN \`city_id\` BIGINT UNSIGNED NULL AFTER \`state_id\`,
      ADD COLUMN \`contact_designation_id\` BIGINT UNSIGNED NULL AFTER \`contact_person\`,
      ADD COLUMN \`advance_percent\` DECIMAL(5,2) NULL AFTER \`payment_term_id\`,
      ADD COLUMN \`sight_percent\` DECIMAL(5,2) NULL AFTER \`advance_percent\`,
      ADD CONSTRAINT \`buyers_state_id_foreign\` FOREIGN KEY (\`state_id\`) REFERENCES \`states\` (\`id\`) ON DELETE SET NULL,
      ADD CONSTRAINT \`buyers_city_id_foreign\` FOREIGN KEY (\`city_id\`) REFERENCES \`cities\` (\`id\`) ON DELETE SET NULL,
      ADD CONSTRAINT \`buyers_contact_designation_id_foreign\` FOREIGN KEY (\`contact_designation_id\`) REFERENCES \`designations\` (\`id\`) ON DELETE SET NULL`);
  }

  if (!(await hasColumn(connection, 'payment_terms', 'has_split'))) {
    await connection.query('ALTER TABLE `payment_terms` ADD COLUMN `has_split` TINYINT(1) NOT NULL DEFAULT 0 AFTER `days`');
    // The original's split terms (LookupSeeder) plus any "NN%" term.
    await connection.query(
      "UPDATE `payment_terms` SET `has_split` = 1 WHERE `name` IN ('50% Advance, 50% on Delivery', 'Part Advance & Part at Sight') OR `name` LIKE '%\\%%'"
    );
  }
}

export async function down(connection) {
  if (await hasColumn(connection, 'payment_terms', 'has_split')) {
    await connection.query('ALTER TABLE `payment_terms` DROP COLUMN `has_split`');
  }
  if (await hasColumn(connection, 'buyers', 'state_id')) {
    await connection.query(`ALTER TABLE \`buyers\`
      DROP FOREIGN KEY \`buyers_state_id_foreign\`, DROP FOREIGN KEY \`buyers_city_id_foreign\`,
      DROP FOREIGN KEY \`buyers_contact_designation_id_foreign\``);
    await connection.query('ALTER TABLE `buyers` DROP COLUMN `state_id`, DROP COLUMN `city_id`, DROP COLUMN `contact_designation_id`, DROP COLUMN `advance_percent`, DROP COLUMN `sight_percent`');
  }
  if (await hasColumn(connection, 'suppliers', 'client_details')) {
    await connection.query('ALTER TABLE `suppliers` DROP COLUMN `client_details`');
  }
  for (const table of COMMENT_TABLES) {
    if (await hasColumn(connection, table, 'comments')) {
      await connection.query(`ALTER TABLE \`${table}\` DROP COLUMN \`comments\``);
    }
  }
}
