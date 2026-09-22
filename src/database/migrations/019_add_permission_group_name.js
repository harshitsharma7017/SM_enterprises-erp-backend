/**
 * Adds `permissions.group_name` — required for the Roles/Permissions screens'
 * permission matrix, grouped exactly like the original ERP's
 * `config/permissions.php` (7 groups, in this order): Masters, Sales,
 * Procurement, Export, Finance, Reports, Administration.
 *
 * Also fixes a live bug: role.controller.js's `show()` and `permissions()`
 * already query `p.group_name` / `ORDER BY group_name`, which has been
 * throwing `Unknown column 'group_name'` on every call since the column
 * never existed. This migration is what makes those queries work.
 *
 * Purely additive — a nullable column plus an UPDATE backfill by permission
 * name prefix. No existing rows, columns or other tables are touched.
 */

const GROUPS = {
  Masters: ['category', 'po-format', 'product', 'buyer', 'supplier', 'jobber', 'agent', 'fob-value', 'markup'],
  Sales: ['inquiry', 'order-confirmation'],
  Procurement: ['purchase-order', 'inward-entry'],
  Export: ['packing', 'export-document'],
  Finance: ['purchase-bill', 'debit-note', 'payment', 'foreign-payment', 'agent-commission'],
  Reports: ['outstanding', 'report'],
  Administration: ['user', 'role', 'permission', 'company-profile']
};

export async function up(connection) {
  await connection.query('ALTER TABLE `permissions` ADD COLUMN `group_name` VARCHAR(50) NULL AFTER `name`;');

  for (const [group, modules] of Object.entries(GROUPS)) {
    for (const moduleName of modules) {
      await connection.query('UPDATE `permissions` SET `group_name` = ? WHERE `name` LIKE ?', [group, `${moduleName}.%`]);
    }
  }
}

export async function down(connection) {
  await connection.query('ALTER TABLE `permissions` DROP COLUMN `group_name`;');
}
