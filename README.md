# Garment ERP Backend

A Node.js/Express REST API backend for a garment manufacturing and export ERP system. It covers master data (products, buyers, suppliers, agents, jobbers), the sales-to-export workflow (inquiries, order confirmations, purchase orders, inward entries, packing, export documents), finance and reporting, company profile settings, and role-based user management.

## Tech Stack

- **Runtime:** Node.js (ES modules)
- **Framework:** Express 5
- **Database:** MySQL (via `mysql2`)
- **Auth:** JWT (`jsonwebtoken`) + `bcryptjs` for password hashing
- **Validation:** Joi
- **File uploads:** Multer
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
scripts/                  # CLI scripts (migrate, seed RBAC, validate schema, generate module)
docs/                      # ERP domain, schema, and RBAC documentation
public/storage/             # Static file storage (served at /storage)
```

Each feature module under `src/modules/<name>` follows a consistent pattern: `*.routes.js`, `*.controller.js`, `*.service.js`, `*.repository.js`, and `*.validator.js`.

## Prerequisites

- Node.js (v18+ recommended)
- MySQL server (5.7+/8.0+)

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

### 3. Create the database

Create an empty MySQL database matching `DB_NAME`:

```sql
CREATE DATABASE garment_erp;
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

### 6. Start the server

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
| `node scripts/validate-database-schema.js` | Validate the live DB schema against expectations |
| `npm run generate:module -- <name>` | Scaffold a new feature module under `src/modules/` |

## API Overview

All routes are mounted under `/api`:

- `GET /api/health` — API/DB health check
- `POST /api/auth/*` — Authentication
- `/api/masters/*` — Categories, formats, products, buyers, suppliers, jobbers, agents, FOB values, markups
- `/api/inquiries` — Inquiries
- `/api/sales/order-confirmations` — Order confirmations
- `/api/procurement/purchase-orders`, `/api/procurement/inward-entries` — Procurement workflow
- `/api/export/documents`, `/api/export/packing` — Export documents & packing
- `/api/finance` — Finance
- `/api/reports` — Reports
- `/api/user-management/*` — Users, roles, company profile

Uploaded files are served statically from `/storage` (backed by `public/storage/`).

## Documentation

Additional domain, schema, and RBAC documentation lives in [docs/](docs/), including:

- [docs/schema.md](docs/schema.md) — Database schema
- [docs/rbac-route-permission-matrix.md](docs/rbac-route-permission-matrix.md) — RBAC route/permission mapping
- Original ERP replication notes (`docs/original-erp-*.md`)
