# Guru Traders ERP — RBAC Source Investigation

## 1. Executive Summary
This report details the Role-Based Access Control (RBAC) and authorization implementation found in the original Guru Traders Laravel repository. The system heavily relies on `spatie/laravel-permission` configured via a central registry (`config/permissions.php`) which dictates all roles and permissions dynamically. There are 8 explicitly defined roles mapped to 108 permissions covering standard CRUD and specific business actions (like `approve` and `export`). There are no Laravel Policies, and the only Gate is a global bypass for the "Super Admin" role.

## 2. Authorization Technology
- **Package:** `spatie/laravel-permission`
- **Version:** `^8.3` (from `composer.json`)
- **Middleware:** Spatie's middleware is not used in the route files directly for every action. Instead, Laravel 11/12's `HasMiddleware` interface is implemented inside controllers to map specific controller methods to Spatie's `permission:xxx` middleware (e.g., `new Middleware('permission:user.view', only: ['index', 'show'])`).
- **Policies:** None. The `app/Policies/` directory does not exist.
- **Gates:** A single global `Gate::before` is defined in `AppServiceProvider` to grant all permissions to the Super Admin.
- **Custom Authorization:** Very limited. Handled primarily through `FormRequest` `authorize()` methods, which just repeat the `can('permission')` checks.

## 3. Roles
The exact 8 roles found in the source configuration (`config/permissions.php`):
1. **Super Admin**: Full system access including permission management.
2. **Admin**: Full operational access. Cannot manage permissions.
3. **Merchandising & Manufacturing**: Handles inquiry to purchase order, suppliers and products.
4. **Accounts**: Bills, payments, commission and outstanding.
5. **Export Documentation & Foreign Payment**: Shipment, export documents and buyer payment realisation.
6. **Packing**: Packing lists, cartons and markings.
7. **Quality Checker**: Inspects goods inward and records pass/reject quantity.
8. **Jobworker**: External jobber. Sees only their own purchase orders and deliveries.

All these roles are actively defined and seeded by `Database\Seeders\RolesSeeder` using `Role::firstOrCreate`.

## 4. Permissions
Permissions follow a strict `module.action` naming convention (e.g., `inquiry.view`, `inquiry.create`). There are exactly 108 permissions generated from `config/permissions.php`.

The modules are: `category`, `po-format`, `product`, `buyer`, `supplier`, `jobber`, `agent`, `fob-value`, `markup`, `inquiry`, `order-confirmation`, `purchase-order`, `inward-entry`, `packing`, `export-document`, `purchase-bill`, `debit-note`, `payment`, `foreign-payment`, `agent-commission`, `outstanding`, `report`, `user`, `role`, `permission`, `company-profile`.

Standard actions are `['view', 'create', 'edit', 'delete']`. Some modules have extended actions like `approve`, `export`, `generate`, and `sync`.

## 5. Role → Permission Mapping
The mapping is strictly derived from `config/permissions.php`.

- **Super Admin**: All 108 permissions.
- **Admin**: All operational permissions (excluding `permission.view`, `permission.sync`, `role.create`, `role.edit`, `role.delete`).
- **Merchandising & Manufacturing**: 
  - `view`: category, po-format, buyer, agent, inward-entry, export-document, outstanding, report.
  - `all` (view/create/edit/delete): product, supplier, inquiry (plus `approve`, `export`), order-confirmation (plus `approve`, `export`), purchase-order (plus `approve`, `export`).
  - `report.export`.
- **Accounts**:
  - `view`: product, buyer, supplier, agent, markup, purchase-order, inward-entry, export-document, report.
  - `all`: purchase-bill, debit-note (plus `approve`), payment (plus `approve`), foreign-payment (plus `approve`), agent-commission, outstanding.
  - `report.export`.
- **Export Documentation & Foreign Payment**:
  - `view`: category, product, buyer, order-confirmation, packing, outstanding, report.
  - `all`: export-document (plus `generate`, `export`), foreign-payment (plus `approve`).
  - `report.export`.
- **Packing**:
  - `view`: product, buyer, order-confirmation, purchase-order, inward-entry, report.
  - `all`: packing.
- **Quality Checker**:
  - `view`: product, supplier, purchase-order, debit-note, report.
  - `edit`, `approve`: inward-entry (plus `view`).
  - `create`: debit-note.
- **Jobworker**:
  - `view`: purchase-order.
  - `view`, `create`: inward-entry.

## 6. Authorization Database Tables
Spatie creates standard tables as confirmed by `database/migrations/2026_07_29_045550_create_permission_tables.php`:
- `permissions` (id, name, guard_name, timestamps)
- `roles` (id, name, guard_name, timestamps)
- `model_has_permissions` (permission_id, model_type, model_id)
- `model_has_roles` (role_id, model_type, model_id)
- `role_has_permissions` (permission_id, role_id)

No custom authorization tables are present.

## 7. Route Authorization
- Routes are primarily grouped under `routes/web.php` and `routes/auth.php`.
- `auth` middleware protects almost all routes (ensuring authentication).
- `permission:xxx.yyy` middleware is explicitly used on certain routes (e.g., `packing.index` uses `permission:packing.view`), but most resource routes defer permission checks to the Controllers via `HasMiddleware`.

## 8. Controller Authorization
Controllers implement the `HasMiddleware` interface. The `public static function middleware(): array` method returns `Middleware` instances defining precisely which controller actions require which permissions.
Example (from `UserController.php`):
- `new Middleware('permission:user.view', only: ['index', 'show'])`
- `new Middleware('permission:user.create', only: ['create', 'store'])`

## 9. Form Request Authorization
Form Request classes (e.g., `StoreUserRequest.php`) implement the `public function authorize(): bool` method by calling `$this->user()->can('module.action')`. This effectively duplicates the check performed by the controller's middleware, acting as a defense-in-depth measure.

## 10. Policies and Gates
- **Policies:** None.
- **Gates:** There is no usage of `Gate::define()`. The only gate is a global interceptor defined in `AppServiceProvider::boot`:
  ```php
  Gate::before(function ($user, string $ability): ?bool {
      return $user->hasRole('Super Admin') ? true : null;
  });
  ```
  This grants the Super Admin bypass logic.

## 11. UI Authorization
Blade templates (`resources/views/layouts/sidebar.blade.php`, etc.) heavily use:
- `@can('module.action')`
- `@if($canAny(['module1.view', 'module2.view']))`
- `auth()->user()?->can($permission)`

The UI visually hides menu items, buttons, and sections if the user lacks the specific permission. This is visual gating only; the backend route middleware remains the ultimate source of security.

## 12. Super Admin Behavior
- **Source:** `app/Providers/AppServiceProvider.php`
- **Behavior:** Bypasses all permission checks via `Gate::before`.
- **Protection:** `UserService->canDelete()` and `UserController->toggleStatus()` prevent the Super Admin account from being deleted or deactivated.

## 13. Special Business Authorization
The investigation found **no** row-level or custom business authorization checks such as "sales rep can only see their own orders." 
There are no checks utilizing `$model->created_by === auth()->id()`. The only custom check is preventing self-deletion and Super Admin deletion in `UserService::canDelete`.

*(Note: The role description for Jobworker says "Sees only their own purchase orders and deliveries", but no code was found in the Controllers/Services/Policies enforcing this via `where('user_id', ...)` or custom gates. It may have been a planned feature or handled via a missing query scope).*

## 14. Authentication vs Authorization
- **Authentication:** Handled by Laravel Breeze (session-based cookies). Routes are in `routes/auth.php` (login, logout, password resets).
- **Authorization:** Handled exclusively by Spatie Laravel Permission (roles mapped to granular permissions) and verified via Route Middleware and Form Requests.

## 15. Evidence / Source References
- **Roles & Permissions Definition:** `config/permissions.php` (Single Source of Truth).
- **Super Admin Bypass:** `app/Providers/AppServiceProvider.php` (Line 24).
- **Controller Middleware:** `app/Http/Controllers/UserManagement/UserController.php` (Line 29).
- **Form Request Auth:** `app/Http/Requests/UserManagement/StoreUserRequest.php` (Line 10).
- **UI Gating:** `resources/views/layouts/sidebar.blade.php` (Line 103+).
- **Spatie Tables:** `database/migrations/2026_07_29_045550_create_permission_tables.php`.

## 16. Unknown / Undefined Behavior
- The `config/permissions.php` description for the **Jobworker** role states: *"External jobber. Sees only their own purchase orders and deliveries."* However, no row-level security scopes, Policies, or Gate logic were found in the source code to actually enforce this ownership check. It remains undefined in the current source.

==================================================

# RBAC RECONCILIATION FOR NODE BACKEND

**1. What exact roles must the Node backend support?**
Super Admin, Admin, Merchandising & Manufacturing, Accounts, Export Documentation & Foreign Payment, Packing, Quality Checker, and Jobworker.

**2. What exact permissions must it support?**
108 specific `module.action` permissions generated from the 26 core modules with actions like `view`, `create`, `edit`, `delete`, `approve`, `export`, `generate`, and `sync`.

**3. What is the exact role → permission relationship?**
A strict one-to-many relationship where Roles are assigned a predefined array of permissions. It exactly mirrors the configurations extracted from `config/permissions.php`.

**4. What database tables are required to reproduce the original behavior?**
- `roles`
- `permissions`
- `role_permissions` (equivalent to `role_has_permissions`)
- `user_roles` (equivalent to `model_has_roles`)
*(Direct user-to-permission mapping `model_has_permissions` exists in Spatie but is unused by this app's configuration-driven seeder workflow).*

**5. Is a Super Admin bypass required?**
Yes. A global interceptor (middleware or service layer) must immediately grant access if the user's role is "Super Admin".

**6. Are there user-specific permissions?**
No. Permissions are assigned strictly via Roles.

**7. Are there policies/gates that need custom Node service logic?**
No. All authorization is standard RBAC (does role X have permission Y).

**8. Are there any business authorization rules that cannot be represented by simple RBAC?**
Yes, the "Jobworker" role requires row-level scoping (seeing only their own POs) that is currently missing from the original source implementation. This will need to be designed during the Node implementation.

**9. Which parts of Spatie need to be reproduced?**
The core functionality of checking if a user's assigned role contains a specific permission (`user.can('module.action')`), protecting routes via middleware, and a Super Admin bypass.

**10. Which parts of Spatie should NOT be reproduced?**
Directly assigning permissions to users (`model_has_permissions`), Guard names (`guard_name`), and Polymorphic relations (`model_type`). A simpler `user_id` to `role_id` mapping is sufficient.

**11. What information is still unknown?**
How row-level data segregation was intended to be implemented for external actors like the Jobworker role.
