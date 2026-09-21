# Guru Traders → Node.js Replication Map

## Executive Summary

Based on the investigation of the original Laravel source code, the Guru Traders ERP is a standard server-rendered application with strong Role-Based Access Control (RBAC). It heavily relies on FormRequests for validation and Services for business logic (like converting an Inquiry to an Order Confirmation).

**CRITICAL RULE:** Do NOT automatically generate standard CRUD operations for every model. Several models (e.g., `Outstanding`, `Report`, `Permission`) explicitly lack Create, Edit, or Delete actions in the source.

---

## Recommended Node.js Implementation Order

To faithfully replicate the dependencies in the exact order the original application expects, the Node.js API must be built in this sequence:

### 1. Authentication & RBAC (Foundation)
- **Routes:** `/login`, `/logout`, `/profile`
- **Tables:** `users`, `roles`, `permissions`, `model_has_roles`, `role_has_permissions`
- **Logic:** Implement JWT authentication. Load the exact 108 permissions. Replicate the middleware verification behavior (matching Laravel Spatie permission).

### 2. Reference Data (Shared Dropdowns)
- **Routes:** `/masters/geo/states`, `/masters/geo/cities`
- **Logic:** Must be implemented early as forms (Supplier, Buyer) depend on these cascading dropdowns.

### 3. Master Modules (No dependencies)
- **Routes:** `/masters/categories`, `/masters/fob-values`
- **Logic:** Pure CRUD.

### 4. Master Modules (Dependent)
- **Routes:** `/masters/products` (depends on Categories), `/masters/agents`, `/masters/buyers`, `/masters/suppliers`, `/masters/jobbers`, `/masters/formats`, `/masters/markups`
- **Logic:** Standard CRUD with specific soft deletes.

### 5. Sales (Inquiries)
- **Routes:** `/sales/inquiries`
- **Logic:** Requires Product and Supplier dropdown logic. Includes PDF/XLSX export endpoints.

### 6. Sales (Order Confirmations)
- **Routes:** `/sales/order-confirmations`
- **Logic:** Implement the crucial `convert-to-oc` route that transitions an Inquiry to an OC. 

### 7. Procurement (Purchase Orders)
- **Routes:** `/procurement/purchase-orders`
- **Logic:** Implement `raise-purchase-orders` from the OC.

### 8. Procurement & Quality (Goods Inward)
- **Routes:** `/procurement/inward-entries`
- **Logic:** Includes the QC `approve` step.

### 9. Export & Packing
- **Routes:** `/export/packing`, `/export/documents`
- **Logic:** Heaviest document generation area (10+ PDF variants generated using Dompdf). Relies on OC data.

### 10. Finance & Reports
- **Routes:** `/finance/purchase-bills`, `/finance/debit-notes`, `/finance/supplier-payments`, `/finance/buyer-receipts`, `/reports/outstanding`
- **Logic:** Highly restricted views (mostly read-only or approval transitions).

---

## Key Technical Discrepancies Noted

- **Permissions:** The original documentation hinted at 120 permissions, but the actual Laravel configuration explicitly defines **108** permissions. (e.g., `company-profile.delete` does not exist in the source).
- **Workflows:** `Quotation` and `Shipment` modules are documented conceptually but **NOT IMPLEMENTED IN SOURCE** as dedicated controllers or routes.

## Final Statistics
- **Routes Found:** 101 meaningful business/auth routes in `web.php` and `auth.php`.
- **Controllers Found:** ~40 (Analyzed explicitly in `original-erp-controller-inventory.md`).
- **Models Involved:** 75 tables (as verified in the previous schema task).
- **Permissions:** 108 (Verified in RBAC config).
- **Document Generation:** 10+ PDF types in `ExportDocumentController`.

STOP. Do not begin implementation. Wait for review.
