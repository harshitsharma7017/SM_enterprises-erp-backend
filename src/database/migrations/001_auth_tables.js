export async function up(connection) {
  await connection.query(`CREATE TABLE \`users\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`name\` VARCHAR(255) NOT NULL,
  \`email\` VARCHAR(255) NOT NULL,
  \`email_verified_at\` TIMESTAMP,
  \`password\` VARCHAR(255) NOT NULL,
  \`created_at\` TIMESTAMP,
  \`updated_at\` TIMESTAMP,
  \`phone\` VARCHAR(255),
  \`status\` TINYINT(1) NOT NULL DEFAULT 1,
  \`created_by\` BIGINT UNSIGNED,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`users_email_unique\` (\`email\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);

  await connection.query(`CREATE TABLE \`password_reset_tokens\` (
  \`email\` VARCHAR(255) NOT NULL,
  \`token\` VARCHAR(255) NOT NULL,
  \`created_at\` TIMESTAMP,
  PRIMARY KEY (\`email\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);


  await connection.query(`ALTER TABLE \`users\` ADD CONSTRAINT \`users_created_by_foreign\` FOREIGN KEY (\`created_by\`) REFERENCES \`users\` (\`id\`) ON DELETE SET NULL;`);

}

export async function down(connection) {
await connection.query('SET FOREIGN_KEY_CHECKS = 0;');
  await connection.query('DROP TABLE IF EXISTS `password_reset_tokens`;');
  await connection.query('DROP TABLE IF EXISTS `users`;');
  await connection.query('SET FOREIGN_KEY_CHECKS = 1;');

}
