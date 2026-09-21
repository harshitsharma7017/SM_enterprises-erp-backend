import { rbacRepository } from '../repositories/rbac.repository.js';

export const rbacService = {
  /**
   * Evaluates if a user has a specific permission.
   * Includes the global Super Admin bypass logic.
   * 
   * @param {number} userId - The ID of the authenticated user
   * @param {string} permissionName - The required permission (e.g., 'user.view')
   * @returns {Promise<boolean>} True if authorized, false otherwise. Does NOT throw HTTP errors.
   */
  hasPermission: async (userId, permissionName) => {
    // 1. Validate inputs
    if (!userId) {
      return false;
    }
    
    if (!permissionName || typeof permissionName !== 'string' || permissionName.trim() === '') {
      return false;
    }

    try {
      // 2. Super Admin Bypass check
      const isSuperAdmin = await rbacRepository.hasSuperAdminRole(userId);
      if (isSuperAdmin) {
        return true;
      }

      // 3. Regular role-permission check
      const hasPerm = await rbacRepository.hasPermission(userId, permissionName);
      return hasPerm;
    } catch (error) {
      // Log unexpected database errors, but return false to deny access safely.
      console.error('RBAC Service Error during permission evaluation:', error);
      return false;
    }
  }
};
