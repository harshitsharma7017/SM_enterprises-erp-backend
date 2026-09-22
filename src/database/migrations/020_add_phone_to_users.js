/**
 * Adds `users.phone` — required for the User Management screens' Phone
 * field (original ERP: `users.phone`, used by StoreUserRequest/
 * UpdateUserRequest and User::scopeSearch()).
 *
 * Phase A's audit assumed this column already existed, going off
 * migration 001_auth_tables.js's CREATE TABLE, which defines a `phone`
 * column — but the live `users` table was actually created without it
 * (`DESCRIBE users` confirms: id, name, email, email_verified_at,
 * password, is_active, created_at, updated_at, no phone). That migration
 * file no longer matches the deployed schema. Discovered while wiring up
 * phone validation in user.controller.js during Phase B.
 *
 * Purely additive — a nullable column, no existing data touched.
 */

export async function up(connection) {
  await connection.query('ALTER TABLE `users` ADD COLUMN `phone` VARCHAR(20) NULL AFTER `email`;');
}

export async function down(connection) {
  await connection.query('ALTER TABLE `users` DROP COLUMN `phone`;');
}
