/**
 * Reports & Excel foundation — permissions only (no tables: reports read the
 * existing source-of-truth tables; imports go through the existing services).
 *
 * report.import (group Reports): run an Excel import. An import also needs
 * the entity's own create permission (brand.create / product.create /
 * brand-projection.create). Super Admin and Admin only; report.view and
 * report.export already exist and keep their current grants.
 */

const PERMISSIONS = ['report.import'];
const GRANTED_ROLES = ['Super Admin', 'Admin'];

export async function up(connection) {
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
}
