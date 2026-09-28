# Garment ERP Backend

A Node.js/Express REST API backend for a garment manufacturing and export ERP system, run for two companies in one database (SM Enterprises and Mahindra Gupta & Company). It covers master data (products, brands, buyers, suppliers, jobbers, agents), brand projections and material planning, purchasing (POs, GRNs, quality control, returns, debit notes), lot-wise stock, material issue and production, order allocation and dispatch, proforma / final invoices, barcodes, export documents, reports with Excel import/export, and role-based user management.

## Tech Stack

- **Runtime:** Node.js (ES modules)
- **Framework:** Express 5
- **Database:** MySQL (via `mysql2`)
- **Auth:** JWT (`jsonwebtoken`) + `bcryptjs` for password hashing
- **Validation:** Joi
- **File uploads:** Multer (in memory) + a storage layer: local disk or an S3-compatible bucket (Cloudflare R2 / Amazon S3)
- **Documents / Excel:** dependency-free PDF and XLSX writers and XLSX reader (`src/utils/`); S3 requests are signed with Node's `crypto` (no AWS SDK)
- **Security/logging:** Helmet, CORS, Morgan
- **Dev tooling:** Nodemon

## Project Structure

```
src/
  app.js               # Express app setup, middleware, route mounting
  server.js             # Entry point — starts the HTTP server
  config/                # Env config, DB pool, RBAC seed data
  controllers/           # Shared/auth/health controllers
  middleware/             # Auth, RBAC, validation, error handling, uploads
  models/                # Data models
  modules/                # Feature modules (routes/controller/service/repository/validator per domain)
  repositories/           # Shared data-access layer
  routes/                 # Shared/top-level routes (auth, health)
  services/               # Shared services (auth, RBAC, number series)
  utils/                  # PDF/XLSX writers, helpers
  validators/             # Shared Joi validators
  database/migrations/    # SQL migrations (run via scripts/migrate.js)
scripts/                  # CLI scripts (migrate, seeds, DB backup, validate schema, generate module)
docs/                      # ERP domain, schema, and RBAC documentation
public/storage/             # Uploaded files when STORAGE_DRIVER=local (served at /storage)
```

Each feature module under `src/modules/<name>` follows a consistent pattern: `*.routes.js`, `*.controller.js`, `*.service.js`, `*.repository.js`, and `*.validator.js`.

## Prerequisites

- Node.js 18+ (20+ recommended)
- MySQL 8.0+ (the schema uses CHECK constraints and triggers)
- The `mysqldump` client on the PATH — only for `npm run backup:db`

## Setup Guide

### 1. Clone and install dependencies

```bash
git clone <repository-url>
cd garment-erp-backend
npm install
```

### 2. Configure environment variables

Copy the example env file and fill in your local values:

```bash
cp .env.example .env
```

`.env` variables:

| Variable | Description | Example |
|---|---|---|
| `PORT` | Port the API server listens on | `5000` |
| `FRONTEND_URL` | Allowed CORS origin for the frontend | `http://localhost:3000` |
| `DB_HOST` | MySQL host | `localhost` |
| `DB_PORT` | MySQL port | `3306` |
| `DB_USER` | MySQL user | `root` |
| `DB_PASSWORD` | MySQL password | *(empty)* |
| `DB_NAME` | MySQL database name | `garment_erp` |
| `JWT_SECRET` | Secret used to sign JWTs | *(set a strong secret)* |
| `JWT_EXPIRES_IN` | JWT token expiry | `24h` |
| `SUPER_ADMIN_EMAIL` | The one account that cannot be deleted, deactivated or lose Super Admin | `admin@yourcompany.com` |
| `STORAGE_DRIVER` | Where uploads are kept: `local` or `s3` (see [File storage](#file-storage)) | `local` |
| `S3_ENDPOINT` | Bucket endpoint (only for `s3`) | `https://<account-id>.r2.cloudflarestorage.com` |
| `S3_REGION` | `auto` for Cloudflare R2, the AWS region for S3 | `auto` |
| `S3_BUCKET` | Bucket name | `garment-erp-files` |
| `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | Bucket API credentials | *(from R2 / IAM)* |
| `S3_URL_EXPIRES_SECONDS` | Lifetime of a signed file link | `300` |

The frontend's `NEXT_PUBLIC_API_URL` must point at this server's `PORT` (e.g. `PORT=5000` → `http://localhost:5000/api`).

### 3. Create the database

Create an empty MySQL database matching `DB_NAME`:

```sql
CREATE DATABASE garment_erp CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 4. Run database migrations

Applies all migrations in `src/database/migrations` in order, tracking applied ones in a `schema_migrations` table:

```bash
node scripts/migrate.js
```

### 5. Seed RBAC roles and permissions

Loads roles/permissions/mappings from `src/config/rbac-seed.json` into the database:

```bash
npm run seed:rbac
```

### 6. Seed the code number series

Creates the counters for auto-generated codes that have no financial year — categories (`CAT001`) and buyers (`BUY01`). Without it, saving a category or buyer fails with *"No number series configured for module [...]"*. Safe to re-run: it never resets a counter. Year-based series (inquiries, orders, POs, lots, …) are created automatically on first use.

```bash
npm run seed:number-series
```

### 7. Seed the dropdown lookups

Starting values for calculation bases, GST rates, price bands, countries / states / cities, currencies, ports, incoterms, payment terms, shipment methods, designations, supplier types and markup presets — ported from the original ERP's seeders (`src/config/lookup-seed.json`). Without it, several forms have empty dropdowns and an Agent cannot be saved (Calculation Basis is required). Insert-only: re-running never duplicates or overwrites edited values.

```bash
npm run seed:lookups
```

### 8. Create the first admin user

No script creates users. Create the first one directly, then manage the rest from **User Management → Users**. Generate a bcrypt hash for the password:

```bash
node -e "import('bcryptjs').then(b => console.log(b.default.hashSync('ChangeMe@123', 10)))"
```

Then insert the user and give it the Super Admin role (use the same email as `SUPER_ADMIN_EMAIL`):

```sql
INSERT INTO users (name, email, password, is_active, created_at, updated_at)
VALUES ('Admin', 'admin@yourcompany.com', '<bcrypt hash from above>', 1, NOW(), NOW());

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u JOIN roles r ON r.name = 'Super Admin'
WHERE u.email = 'admin@yourcompany.com';
```

Sign in with that email and password, then change the password.

### 9. Start the server

Development (auto-restart on changes):

```bash
npm run dev
```

Production:

```bash
npm start
```

The API will be available at `http://localhost:<PORT>` (default `5000`). Verify it's running and connected to the database:

```bash
curl http://localhost:5000/api/health
```

## Available Scripts

| Command | Description |
|---|---|
| `npm start` | Start the server (`src/server.js`) |
| `npm run dev` | Start the server with Nodemon for development |
| `node scripts/migrate.js` | Run pending database migrations |
| `npm run seed:rbac` | Seed RBAC roles/permissions from `rbac-seed.json` |
| `npm run seed:number-series` | Create the category / buyer code counters (safe to re-run) |
| `npm run seed:lookups` | Seed dropdown lookups from `lookup-seed.json` (insert-only, safe to re-run) |
| `npm run backfill:documents` | One-off: archive a copy of documents finalised before the archive existed |
| `npm run backup:db` | Back up the database (see [Backups](#backups)) |
| `node scripts/validate-database-schema.js` | Validate the live DB schema against expectations |
| `npm run generate:module -- <name>` | Scaffold a new feature module under `src/modules/` |

## Updating an existing installation

```bash
git pull
npm install
npm run backup:db        # or your own mysqldump — before every migration
node scripts/migrate.js  # applies only the new migrations
npm run seed:number-series
npm run seed:lookups
```

Then restart the server (`npm start` does not reload on its own; `npm run dev` does).

## API Overview

All routes are mounted under `/api`:

- `GET /api/health` — API/DB health check
- `/api/auth/*` — Authentication
- `/api/masters/*` — Categories, formats, products, brands (with brand-wise product specifications), buyers, suppliers, jobbers, agents, FOB values, markups, material types, UOMs
- `/api/planning/*` — Brand projections, material requirements, material plans
- `/api/inquiries`, `/api/sales/order-confirmations` — Sales, order tracking and stock allocation
- `/api/procurement/*` — Purchase orders, GRNs (inward entries), lots, supplier returns
- `/api/quality-control` — Quality inspections
- `/api/inventory` — Stock locations, lot stock, stock ledger, adjustments
- `/api/production` — Material issues, processing records
- `/api/dispatches` — Stock dispatch and direct supplier dispatch
- `/api/barcodes` — Barcodes, labels, scans
- `/api/finance/*` — Proforma invoices, invoices, debit notes, other finance
- `/api/export/*` — Export documents & packing
- `/api/reports` — Reports, Excel export, lot traceability
- `/api/imports` — Excel imports (brands, products, suppliers / jobbers, draft brand projections, opening stock)
- `/api/administration/companies`, `/api/user-management/*` — Companies, users, roles, company profile

- `/api/production/plans` — Production plans (planned / produced / pending, material needs)
- `/api/documents` — Document archive (issued copies)

Printable PDFs are served at `GET <record>/:id/document` for proforma invoices, invoices, purchase orders, GRNs, QC reports, supplier returns, debit notes, material issues and processing records.

## File storage

Uploads (order-format images, company logo, export checklist files) are stored by key, e.g. `order-formats/images-….jpg`, and always opened at `/storage/<key>` on this server:

- `STORAGE_DRIVER=local` (default): files live in `public/storage/` and are served directly.
- `STORAGE_DRIVER=s3`: files live in a **private** S3-compatible bucket; `/storage/<key>` redirects to a signed link valid for `S3_URL_EXPIRES_SECONDS`.

Only the upload folders (`order-formats/`, `company-profile/`, `export-documents/`) are served; anything else in the bucket (such as `backups/`) is never reachable through `/storage`. Anyone who has a file's `/storage/...` link can open it, with either driver.

To use **Cloudflare R2**: create a bucket and an R2 API token (Object Read & Write) in the Cloudflare dashboard, set `STORAGE_DRIVER=s3`, `S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com`, `S3_REGION=auto`, the bucket name and keys, and restart. For **Amazon S3** use `S3_ENDPOINT=https://s3.<region>.amazonaws.com` and `S3_REGION=<region>`. When switching from local, first copy the contents of `public/storage/` into the bucket with the same paths.

## Documents & letterhead

Every generated document (purchase order, GRN, QC report, return challan, debit note, material issue slip, production record, delivery challan, proforma invoice, invoice) uses one house layout (`src/services/document-layout.js`, drawn by the dependency-free `src/utils/pdf-canvas.js`): the company letterhead, title band, party boxes, details grid, line table repeated across pages, totals with amount in words, bank details, terms, signatures and "Page x of y". Each company's logo, PAN / IEC, bank details, signatory, purchase / sales terms and footer note are set under **Administration → Companies → (company) → Letterhead & Documents**; name, address, phone, e-mail and GSTIN come from the company record. No tax is calculated on any document.

## Document archive

When a PO is confirmed, a GRN / supplier return / debit note posted, a QC inspection completed, a material issue posted, processing output posted, or a proforma invoice / invoice issued, its PDF is rendered once and kept under `documents/` in the file storage (local or bucket), listed in **Reports → Document Archive** and on each record as **Issued copy**. These files are never served by `/storage`; they download through the API with the `document.view` permission. On an existing installation, run `npm run backfill:documents` once after migrating to archive the documents that were already final.

## Backups

```bash
npm run backup:db
```

Dumps the database with `mysqldump`, gzips it and saves `<DB_NAME>_<timestamp>.sql.gz` to `../db-backups/` (local driver) or to `backups/` in the bucket (s3 driver). Schedule it, e.g. nightly with cron:

```
0 2 * * * cd /path/to/garment-erp-backend && npm run backup:db
```

The script does not delete old backups; set a lifecycle rule on the bucket (e.g. expire `backups/` after 90 days) or prune the folder. Restore with `gunzip -c <file>.sql.gz | mysql -u <user> -p <DB_NAME>`.

## Documentation

Additional domain, schema, and RBAC documentation lives in [docs/](docs/), including:

- [docs/schema.md](docs/schema.md) — Database schema
- [docs/rbac-route-permission-matrix.md](docs/rbac-route-permission-matrix.md) — RBAC route/permission mapping
- Original ERP replication notes (`docs/original-erp-*.md`)
