/**
 * `authRepository.findUserById()` / `authService.login()` (src/repositories
 * /auth.repository.js, src/services/auth.service.js) both select/check
 * `users.is_active`, but no migration ever added that column — every
 * authenticated request throws a DB error inside `authenticate` middleware,
 * app-wide, across every module. Discovered while verifying Phase 16
 * (Inquiry)'s RBAC-gated routes, not caused by it — this restores the
 * column Auth's own code already assumes exists. Defaults existing and new
 * rows to active (1) so no current user is locked out by the fix itself.
 */

export async function up(connection) {
  await connection.query(`ALTER TABLE \`users\` ADD COLUMN \`is_active\` TINYINT(1) NOT NULL DEFAULT 1 AFTER \`password\`;`);
}

export async function down(connection) {
  await connection.query(`ALTER TABLE \`users\` DROP COLUMN \`is_active\`;`);
}
