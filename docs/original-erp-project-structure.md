# Guru Traders ERP - Project Structure

## 1. Environment Details
- **Laravel Version:** ^12.0
- **PHP Version:** ^8.2

## 2. Application Structure Overview

The application follows a standard modern Laravel directory structure:

- **`app/`**: Contains the core application logic.
  - **`Console/`**: Artisan commands (if any).
  - **`Exceptions/`**: Exception handlers (moved to bootstrap in Laravel 11+).
  - **`Http/`**: Contains Controllers, Middleware, and FormRequests.
  - **`Models/`**: Eloquent models representing database tables.
  - **`Providers/`**: Service Providers, including `AppServiceProvider` which handles global Gate logic.
  - **`Services/`**: Business logic classes that sit between controllers and models.
  - **`Support/`**: Helper classes (e.g., `PermissionRegistry.php` for RBAC configuration).
  - **`Exports/`**: Excel export logic (using `maatwebsite/excel`).
- **`bootstrap/`**: Application bootstrapping and configuration (Laravel 11+ `app.php`).
- **`config/`**: Standard Laravel config files + `permissions.php` (RBAC single source of truth).
- **`database/`**:
  - **`migrations/`**: Schema definitions.
  - **`seeders/`**: Initial data insertion (Roles, Permissions, Lookups).
- **`resources/`**:
  - **`views/`**: Blade templates.
  - **`js/`**: Frontend JavaScript assets.
- **`routes/`**:
  - **`web.php`**: Primary business routes, mostly guarded by `auth` middleware.
  - **`auth.php`**: Laravel Breeze authentication routes.
  - **`console.php`**: Artisan closure commands.

## 3. Where Business Logic Lives

- **Routing:** Exclusively in `routes/web.php` and `routes/auth.php`. No `api.php` is defined.
- **Controllers:** `app/Http/Controllers/` broken into domain subdirectories (`Masters`, `Sales`, `Procurement`, `Export`, `Finance`, `Reports`, `UserManagement`). Controllers use Laravel 11/12 `HasMiddleware` interface for granular permission mapping.
- **Form Validation & Authorization:** `app/Http/Requests/`. Form requests handle input validation and repeat `can()` permission checks.
- **Business Workflows:** `app/Services/`. Extracted logic for operations like converting an Inquiry to an Order Confirmation.
- **Data Models & Relationships:** `app/Models/`. Eloquent handles data access.
- **Export/PDF Generation:** Found across `app/Exports/` and specific PDF-generation endpoints in `ExportDocumentController` utilizing `barryvdh/laravel-dompdf`.
- **Authorization / RBAC:** Strictly defined in `config/permissions.php` and applied via Route Middleware (`permission:xxx.yyy`) or Controller `HasMiddleware` implementations. There are **no Laravel Policies** used.

*(Note: There is no `app/Repositories/` directory found in the source; the application uses Models directly or via Services.)*
