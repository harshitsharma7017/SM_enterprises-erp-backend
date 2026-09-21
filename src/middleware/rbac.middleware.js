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

/**
 * Express middleware factory for routes reachable under more than one
 * permission (e.g. a quick-add endpoint usable from either a create or an
 * edit screen). Grants access if the user holds ANY of the supplied
 * permissions; denies only if none match.
 *
 * Delegates each check to the same `rbacService.hasPermission` used by
 * `requirePermission`, so the Super Admin bypass and error-handling
 * semantics stay identical — this does not weaken or duplicate that logic.
 *
 * @param {string[]} permissionNames - Permissions where holding any one is sufficient
 * @returns {Function} Express middleware function
 */
export const requireAnyPermission = (permissionNames) => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized: Authentication required before checking permissions'
        });
      }

      for (const permissionName of permissionNames) {
        const hasAccess = await rbacService.hasPermission(req.user.id, permissionName);
        if (hasAccess) {
          return next();
        }
      }

      return res.status(403).json({
        success: false,
        message: 'Forbidden'
      });

    } catch (error) {
      next(error);
    }
  };
};
