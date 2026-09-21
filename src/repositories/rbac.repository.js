import { pool } from '../config/database.js';

export const rbacRepository = {
  /**
   * Checks if a user is assigned the Super Admin role.
   * @param {number} userId 
   * @returns {Promise<boolean>}
   */
  hasSuperAdminRole: async (userId) => {
    const query = `
      SELECT EXISTS (
        SELECT 1 
        FROM user_roles ur
        INNER JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = ? AND r.name = 'Super Admin'
      ) AS has_role;
    `;
    const [rows] = await pool.query(query, [userId]);
    return !!rows[0].has_role;
  },

  /**
   * Checks if a user has a specific permission via their assigned roles.
   * This query naturally supports multiple roles and returns true if any role grants the permission.
   * @param {number} userId 
   * @param {string} permissionName 
   * @returns {Promise<boolean>}
   */
  hasPermission: async (userId, permissionName) => {
    const query = `
      SELECT EXISTS (
        SELECT 1
        FROM user_roles ur
        INNER JOIN roles r ON r.id = ur.role_id
        INNER JOIN role_permissions rp ON rp.role_id = r.id
        INNER JOIN permissions p ON p.id = rp.permission_id
        WHERE ur.user_id = ? AND p.name = ?
      ) AS has_permission;
    `;
    const [rows] = await pool.query(query, [userId, permissionName]);
    return !!rows[0].has_permission;
  }
};
