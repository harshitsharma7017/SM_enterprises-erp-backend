# RBAC Route & Permission Matrix

This document maps the existing Express endpoints to their respective RBAC permissions according to the exact definitions found in `src/config/rbac-seed.json`.

| Method | Route | Controller | Permission | Authentication | RBAC |
|--------|-------|------------|------------|----------------|------|
| GET | `/api/health` | `checkHealth` | N/A | No | No (Public) |
| POST | `/api/auth/login` | `authController.login` | N/A | No | No (Public) |
| GET | `/api/auth/me` | `authController.me` | N/A | Yes | No (Auth Endpoint) |
| POST | `/api/auth/logout` | `authController.logout` | N/A | No | No (Public) |

## Audit Summary
- **Total Existing Routes**: 4
- **Routes Requiring RBAC**: 0
- **Unresolved Endpoints**: None. All existing routes are standard public/authentication endpoints that intentionally bypass RBAC authorization as per best practices and project instructions.
