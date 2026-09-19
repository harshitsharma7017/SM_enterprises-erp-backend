# Repository Cleanup Audit

## 1. Current Repository Structure
```text
.
├── .env
├── .env.example
├── .gitignore
├── Garment_ERP.pdf
├── docs/
│   ├── database-foundation-audit.md
│   ├── database-foundation-final-audit.md
│   ├── database-foundation-reconciliation.md
│   ├── database-implementation-scope.md
│   ├── database-translation.md
│   ├── final-database-translation-status.md
│   └── schema.md
├── package-lock.json
├── package.json
├── scratch/
│   ├── append_fks_to_translation.cjs
│   ├── calculate_counts.js
│   ├── deep_validate.js
│   ├── deps.json
│   ├── fix-lint.cjs
│   ├── fix_indexes.js
│   ├── generate_011_migration.js
│   ├── generate_migrations.js
│   ├── parse_dependencies.js
│   ├── parse_schema.js
│   ├── rebuild_translation.cjs
│   ├── reconciliation_diff.json
│   ├── run_audit.js
│   ├── temp_val.js
│   └── validation_errors.txt
├── scripts/
│   ├── generate-module.js
│   ├── init-auth-db.js
│   ├── migrate.js
│   ├── test-auth.js
│   └── validate-database-schema.js
└── src/
    ├── app.js
    ├── config/
    ├── controllers/
    ├── database/
    │   └── migrations/
    │       ├── 001_auth_tables.js
    │       ├── ... (002-012) ...
    ├── middleware/
    ├── models/
    ├── repositories/
    ├── routes/
    ├── server.js
    ├── services/
    ├── utils/
    └── validators/
```

## 2. Files to Keep
**Root Files**
- `.env`, `.env.example`, `.gitignore`: Standard Node.js environment/git configuration files.
- `package.json`, `package-lock.json`: Project dependency configuration.
- `Garment_ERP.pdf` (KEEP-DOC): Original requirements/reference document.

**`src/` Directory**
- All source files including `app.js`, `server.js`, and the architectural directories (`controllers/`, `services/`, `repositories/`, `routes/`, `middleware/`, `config/`, `utils/`, `validators/`, `models/`) are required for the actual backend logic.

**`src/database/migrations/`**
- `001_auth_tables.js` through `012_remove_buyer_shipment_method_timestamps.js` (KEEP-MIGRATION): Historical and active database migrations that establish the verified schema.

**`docs/` Directory**
- `schema.md` (KEEP-DOC): Original raw schema source of truth.
- `database-translation.md` (KEEP-DOC): Authoritative schema translation that accurately represents the schema.
- `database-implementation-scope.md` (KEEP-DOC): Initial scope documentation.
- `database-foundation-final-audit.md` (KEEP-DOC): The conclusive audit proving the database foundation phase is successfully complete and matching the truth.

**`scripts/` Directory**
- `generate-module.js` (KEEP-SCRIPT): Useful active script for scaffolding API modules.
- `migrate.js` (KEEP-SCRIPT): Required custom migration runner.
- `validate-database-schema.js` (KEEP-SCRIPT): Powerful validation script built during the schema reconciliation phase to ensure schema integrity.

## 3. Files to Remove
**`scratch/` Directory (ALL FILES)**
- The entire `scratch/` folder contains one-off LLM generation scripts, debugging scripts, and temporary JSON dumps. Examples include `generate_migrations.js` (which caused the hallucination issue), `rebuild_translation.cjs`, `deep_validate.js`, `parse_schema.js`. These have served their purpose and are obsolete.

**`docs/` Directory (OBSOLETE INTERMEDIATE REPORTS)**
- `database-foundation-audit.md`: Obsolete intermediate report from before reconciliation.
- `database-foundation-reconciliation.md`: Obsolete reconciliation plan (now complete).
- `final-database-translation-status.md`: Obsolete intermediate status report, fully superseded by the `database-foundation-final-audit.md`.

**`scripts/` Directory (OBSOLETE SCRIPTS)**
- `init-auth-db.js`: An early script that directly created and seeded the `users` table via raw SQL. This is completely obsolete now that migrations (`001_auth_tables.js`) handle this.

## 4. Files Requiring Review
**`scripts/` Directory**
- `test-auth.js`: A custom script making HTTP fetch calls to test the local Auth API. This might be useful for manual spot-checking, but we may want to establish a formal test suite (e.g., using Jest/Mocha) instead of keeping custom test scripts.

## 5. NPM Scripts Audit
- **`start`**: `node src/server.js` — **Required**. Starts the server in production. Depends on `src/server.js`.
- **`dev`**: `nodemon src/server.js` — **Required**. Local development server with live reload. Depends on `src/server.js`.
- **`test`**: `echo "Error: no test specified" && exit 1` — **Required (Placeholder)**. Standard fallback for NPM.
- **`generate:module`**: `node scripts/generate-module.js` — **Required**. Boilerplate generation tool for the architecture. Depends on `scripts/generate-module.js`.

## 6. Database/Migration Safety
I explicitly confirm that migrations `001` through `012` and the authoritative database documentation (`schema.md`, `database-translation.md`, `database-foundation-final-audit.md`) are absolutely **NOT candidates for deletion**. They are locked in, correct, and represent the successful completion of the foundation phase.

## 7. Proposed Final Repository Structure
```text
.
├── .env
├── .env.example
├── .gitignore
├── Garment_ERP.pdf
├── docs/
│   ├── database-foundation-final-audit.md
│   ├── database-implementation-scope.md
│   ├── database-translation.md
│   ├── repository-cleanup-audit.md
│   └── schema.md
├── package-lock.json
├── package.json
├── scripts/
│   ├── generate-module.js
│   ├── migrate.js
│   ├── test-auth.js      <-- Pending review
│   └── validate-database-schema.js
└── src/
    ├── app.js
    ├── config/
    ├── controllers/
    ├── database/
    │   └── migrations/
    │       ├── 001_auth_tables.js
    │       ├── ... (002-012) ...
    ├── middleware/
    ├── models/
    ├── repositories/
    ├── routes/
    ├── server.js
    ├── services/
    ├── utils/
    └── validators/
```

## 8. Cleanup Plan
- **Delete `scratch/`**: `rm -rf scratch/` (Removes all 15 temporary files).
- **Delete obsolete docs**: `rm docs/database-foundation-audit.md docs/database-foundation-reconciliation.md docs/final-database-translation-status.md`.
- **Delete obsolete script**: `rm scripts/init-auth-db.js`.
- **Review `scripts/test-auth.js`**: Decide whether to keep it as a scratchpad test script or delete it.

==================================================
CLEANUP STATUS:
- Safe to remove: 19 items (Entire scratch directory, 3 obsolete docs, 1 obsolete script)
- Requires review: 1 item (`scripts/test-auth.js`)
- Keep: All remaining application source code, config files, migrations 001-012, authoritative docs, and functional scripts.
