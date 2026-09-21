# RBAC Implementation Plan

## 1. Source of Truth
The exact RBAC definitions originate from the original Guru Traders Laravel repository, specifically `config/permissions.php`. This includes:
- **8 predefined roles** (e.g., Super Admin, Admin, Accounts).
- **108 modular permissions** strictly using a `module.action` convention across 26 modules (e.g., `inquiry.view`, `inquiry.create`).
- A strict role-to-permission array mapping, including a global bypass for the `Super Admin` role.

## 2. Current Authentication Integration
The Node backend currently handles authentication using JSON Web Tokens (JWT) via `src/middleware/auth.middleware.js`. The token is issued on login and contains the user's identity. This existing JWT flow will remain the gatekeeper for authentication. The RBAC system will be purely an authorization layer that runs *after* successful authentication.

## 3. RBAC Data Model
To reproduce the role and permission checking mechanics found in `spatie/laravel-permission` without carrying over its polymorphic Laravel-specific concepts, we will implement a clean, normalized relational model:

- `roles`: Defines the available roles.
- `permissions`: Defines the exact `module.action` permissions.
- `role_permissions`: Maps permissions to a role.
- `user_roles`: Maps users to roles.

This creates the mapping chain:
`User` → `user_roles` → `Role` → `role_permissions` → `Permission`

## 4. New Tables Required
The following new tables will be implemented as **NEW RBAC TABLES**:
1. `roles`: `id` (BIGINT PK), `name` (VARCHAR 255, UNIQUE), timestamps.
2. `permissions`: `id` (BIGINT PK), `name` (VARCHAR 255, UNIQUE), timestamps.
3. `role_permissions`: `role_id` (FK), `permission_id` (FK), composite primary key.
4. `user_roles`: `user_id` (FK), `role_id` (FK), composite primary key.

## 5. Existing Tables Affected
- **`users`**: This table has already been validated in the locked database foundation. Its structure (`id` BIGINT PK, `name`, `email`, `password`, etc.) will **NOT** be modified. RBAC assignment is handled entirely by the new `user_roles` linking table.

## 6. Roles
The following 8 roles will be seeded exactly:
1. Super Admin
2. Admin
3. Merchandising & Manufacturing
4. Accounts
5. Export Documentation & Foreign Payment
6. Packing
7. Quality Checker
8. Jobworker

## 7. Permissions
Exactly 108 permissions using the `module.action` format across 26 modules (`category.view`, `inward-entry.approve`, etc.) will be seeded based on the original documentation. No new permissions will be invented.

## 8. Role → Permission Mapping
The mapping will be strictly seeded based on the original `config/permissions.php`:
- Super Admin receives all 108 permissions.
- Admin receives all operational permissions.
- Other roles receive specialized subsets (e.g., Packing only accesses `packing.view`, `packing.create`, etc.).

## 9. User → Role Mapping
Users receive roles via entries in the `user_roles` table. 
While a user in an ERP typically has a single role, the intermediate `user_roles` table supports multiple roles seamlessly. The authorization query will automatically check the combined permissions for all roles assigned to the authenticated user.

## 10. Middleware Architecture
A new `requirePermission` middleware factory will be introduced to cleanly integrate into Express routes.
```javascript
router.get(
  '/users',
  authenticate, // Existing JWT auth
  requirePermission('user.view'), // New RBAC check
  userController.index
);
```
The middleware will:
1. Extract `req.user.id` from the decoded JWT.
2. Delegate to an `AuthService`/`RbacService` to check if the user has the required permission.
3. Proceed if authorized, or throw a 403 response if forbidden.

## 11. Super Admin Bypass
To faithfully reproduce Laravel's `Gate::before`, the `RbacService` lookup logic will include a short-circuit bypass:
If the user is assigned the `Super Admin` role via `user_roles`, the service immediately returns `true` (authorized) without checking individual permissions. This logic lives securely in the backend service layer.

## 12. JWT Integration
The JWT structure will not be bloated with permissions. 
The token will continue to store only basic identity (`id`, `email`). Upon validation by `authenticate`, the `requirePermission` middleware will perform the authorization lookup against the MySQL database. This ensures permissions update in real-time if an administrator changes a user's role, avoiding stale claims in long-lived JWTs.

## 13. Permission Lookup Strategy
Given `user.id`:
1. Query `user_roles` joining `roles`.
2. If `roles.name` includes "Super Admin", grant access immediately.
3. Otherwise, join `role_permissions` and `permissions`.
4. Check if the provided `module.action` exists in the result set.
5. Grant or deny access.

*Note: The query will be optimized to check directly for the existence of the specific permission, rather than fetching all permissions into application memory.*

## 14. Seed Strategy
To ensure reproducible setup, all exact role and permission definitions will be extracted into a static configuration file (e.g., `src/config/rbac-seed-data.json`).
A dedicated, idempotent seed script (`scripts/seed-rbac.js` or via a specific migration) will parse this file and use `INSERT IGNORE` or upserts to reliably populate `roles`, `permissions`, and `role_permissions` without duplicating rows on multiple runs.

## 15. Error Contract
Consistent JSON error formatting will be enforced:
- **Unauthenticated (No/Invalid JWT)**: 
  ```json
  { "success": false, "message": "Unauthorized" } // 401
  ```
- **Authenticated but lacking permission**: 
  ```json
  { "success": false, "message": "Forbidden" } // 403
  ```

## 16. Indexing Strategy
To ensure fast permission checks on every request:
- `user_roles`: Composite PK `(user_id, role_id)`, plus an index on `role_id`.
- `role_permissions`: Composite PK `(role_id, permission_id)`, plus an index on `permission_id`.
- `permissions.name` and `roles.name`: `UNIQUE` indexes.

## 17. Testing Strategy
A robust test suite will be outlined (either automated or via Postman) covering:
- Valid JWT + valid permission (Accept).
- Valid JWT + missing permission (Reject 403).
- Invalid/Missing JWT (Reject 401).
- Super Admin global bypass check.
- Attempting to access non-existent permissions.
- Inactive/deleted user checking.

## 18. Jobworker Row-Level Authorization Gap
**KNOWN SOURCE GAP / UNDEFINED BUSINESS RULE:** 
The investigation revealed that while the original role description implies "Sees only their own purchase orders and deliveries", there is no corresponding row-level implementation (`where user_id = ?`) in the original source code. 
**Action:** We will NOT blindly implement an ownership filter like `created_by = user.id`. The backend will only enforce generic RBAC rules for now. This gap is deferred and must be handled separately when business rules for row-level segregation are formally defined.

## 19. Implementation Order
1. Define the exact roles and permissions in a static seed JSON file.
2. Create migration `013_rbac_tables.js` for the new RBAC schema.
3. Implement `rbac.repository.js` and `rbac.service.js` for permission resolution.
4. Implement the `requirePermission` middleware.
5. Create the RBAC seeder script.
6. Verify behavior using test HTTP calls.

## 20. Files Expected to Be Created/Modified
- `src/database/migrations/013_rbac_tables.js` (NEW)
- `src/config/rbac-seed.json` (NEW)
- `src/middleware/rbac.middleware.js` (NEW)
- `src/services/rbac.service.js` (NEW)
- `src/repositories/rbac.repository.js` (NEW)
- `scripts/seed-rbac.js` (NEW)

## 21. Risks / Open Questions
- **Performance:** Querying permissions on every single authenticated request via MySQL may introduce slight overhead. If this becomes a bottleneck, caching (e.g., Redis or in-memory map of user permissions) will be implemented as a future optimization.
- **Jobworker Row-Level Logic:** Requires explicit instructions from the product team later to define how external data scoping actually functions.
