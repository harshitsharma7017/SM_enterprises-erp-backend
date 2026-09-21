# RBAC Phase 3 Implementation Report

## Files Created
- `src/repositories/rbac.repository.js`
- `src/services/rbac.service.js`

## Files Modified
None. No existing source files, migrations, or database configurations were modified.

## Repository Methods
The `rbac.repository.js` exposes:
1. `hasSuperAdminRole(userId)`: Executes an optimized existence query specifically checking if the user is mapped to the exact `'Super Admin'` role.
2. `hasPermission(userId, permissionName)`: Executes an optimized existence query joining `user_roles`, `roles`, `role_permissions`, and `permissions` to assert if the user holds the specified exact permission.

## Service Methods
The `rbac.service.js` exposes:
- `hasPermission(userId, permissionName)`: Resolves the authorization question by returning a simple boolean (`true` or `false`). It enforces input validation and integrates the Super Admin bypass logic. 

## SQL Strategy
- We avoided ORMs and used parameterized SQL directly via `mysql2/promise`. 
- Instead of loading a user's entire permission array into application memory (which is inefficient), we rely on `SELECT EXISTS(...)` queries. This offloads the heavy filtering to the MySQL database engine, returning a rapid `1` or `0`.
- All SQL inputs (`userId`, `permissionName`) use parameterized placeholders (`?`) to completely mitigate SQL injection risks.

## Super Admin Behavior
The `hasPermission` service method faithfully reproduces the Laravel `Gate::before` semantic by checking for the `'Super Admin'` role *before* attempting specific permission lookups. 
If `hasSuperAdminRole(userId)` returns true, the service short-circuits and immediately returns `true` (authorized), without needing 108 dummy permission entries loaded into the database.

## Multiple Role Behavior
Because the SQL strategy queries across the `user_roles` linking table, the repository inherently supports users with multiple roles. The database will return `true` if *any* assigned role grants the required permission, successfully satisfying the union logic described in the design plan.

## Tests / Verification
Because the project does not currently employ a testing framework (e.g., Jest or Mocha), I did not introduce unnecessary new infrastructure for this phase alone. 

**Manual Verification Required for Phase 4:**
Once the RBAC seeder is run and the middleware is attached to Express routes, we will verify:
1. Normal user with assigned permission → Receives 200 OK.
2. Normal user without permission → Receives 403 Forbidden.
3. Super Admin without explicit permission row → Receives 200 OK (bypass triggered).
4. Unknown permission → Receives 403 Forbidden.

## Remaining Phase 4 Work
Phase 4 will implement the Express `requirePermission()` middleware, integrating this RBAC service directly with HTTP responses.
