export async function up(connection) {
  console.log('--- Executing Migration 013: RBAC Tables ---');
  
  // 1. Create Roles Table
  await connection.query(`
    CREATE TABLE \`roles\` (
      \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      \`name\` VARCHAR(255) NOT NULL,
      \`created_at\` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`roles_name_unique\` (\`name\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 2. Create Permissions Table
  await connection.query(`
    CREATE TABLE \`permissions\` (
      \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      \`name\` VARCHAR(255) NOT NULL,
      \`created_at\` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`permissions_name_unique\` (\`name\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 3. Create Role Permissions Table
  await connection.query(`
    CREATE TABLE \`role_permissions\` (
      \`role_id\` BIGINT UNSIGNED NOT NULL,
      \`permission_id\` BIGINT UNSIGNED NOT NULL,
      PRIMARY KEY (\`role_id\`, \`permission_id\`),
      KEY \`role_permissions_permission_id_index\` (\`permission_id\`),
      CONSTRAINT \`role_permissions_role_id_foreign\` FOREIGN KEY (\`role_id\`) REFERENCES \`roles\` (\`id\`) ON DELETE CASCADE,
      CONSTRAINT \`role_permissions_permission_id_foreign\` FOREIGN KEY (\`permission_id\`) REFERENCES \`permissions\` (\`id\`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 4. Create User Roles Table
  await connection.query(`
    CREATE TABLE \`user_roles\` (
      \`user_id\` BIGINT UNSIGNED NOT NULL,
      \`role_id\` BIGINT UNSIGNED NOT NULL,
      PRIMARY KEY (\`user_id\`, \`role_id\`),
      KEY \`user_roles_role_id_index\` (\`role_id\`),
      CONSTRAINT \`user_roles_user_id_foreign\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE,
      CONSTRAINT \`user_roles_role_id_foreign\` FOREIGN KEY (\`role_id\`) REFERENCES \`roles\` (\`id\`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
}

export async function down(connection) {
  console.log('--- Reverting Migration 013: RBAC Tables ---');
  await connection.query('SET FOREIGN_KEY_CHECKS = 0;');
  await connection.query('DROP TABLE IF EXISTS \`user_roles\`;');
  await connection.query('DROP TABLE IF EXISTS \`role_permissions\`;');
  await connection.query('DROP TABLE IF EXISTS \`permissions\`;');
  await connection.query('DROP TABLE IF EXISTS \`roles\`;');
  await connection.query('SET FOREIGN_KEY_CHECKS = 1;');
}
