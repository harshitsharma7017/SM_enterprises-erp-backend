import { rbacService } from '../services/rbac.service.js';

/**
 * Express middleware factory to protect routes based on RBAC permissions.
 * Assumes that `authenticate` middleware has already run and populated `req.user`.
 *
 * @param {string} permissionName - The required permission (e.g., 'user.view')
 * @returns {Function} Express middleware function
 */
export const requirePermission = (permissionName) => {
  return async (req, res, next) => {
    try {
      // 1. Verify that authentication middleware has already run and provided user context
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized: Authentication required before checking permissions'
        });
      }

      // 2. Delegate the authorization check to the RBAC service layer
      const hasAccess = await rbacService.hasPermission(req.user.id, permissionName);

      // 3. Evaluate the decision
      if (hasAccess) {
        return next();
      }

      // 4. Deny access cleanly
      return res.status(403).json({
        success: false,
        message: 'Forbidden'
      });
      
    } catch (error) {
      // Pass unexpected infrastructure/database errors to the global error handler.
      // We do not silently convert genuine failures into a 403 Forbidden.
      next(error);
    }
  };
};
