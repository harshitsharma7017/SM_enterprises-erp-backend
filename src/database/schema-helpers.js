/**
 * Existence checks for migrations that must run both on the long-lived
 * database (created from the original schema) and on a brand-new one built
 * only from these migrations — a step that removes or renames something only
 * does so when it is actually there.
 */
const one = async (connection, sql, params) => {
  const [rows] = await connection.query(sql, params);
  return rows.length > 0;
};

export const hasTable = (connection, table) => one(connection,
  'SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?', [table]);

export const hasColumn = (connection, table, column) => one(connection,
  'SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?', [table, column]);

export const hasForeignKey = (connection, table, name) => one(connection,
  "SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND CONSTRAINT_NAME = ? AND CONSTRAINT_TYPE = 'FOREIGN KEY'", [table, name]);

export const hasIndex = (connection, table, name) => one(connection,
  'SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?', [table, name]);

export const hasCheck = (connection, table, name) => one(connection,
  "SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND CONSTRAINT_NAME = ? AND CONSTRAINT_TYPE = 'CHECK'", [table, name]);
