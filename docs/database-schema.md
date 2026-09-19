# Garment ERP Database Architecture & Schema Design

## 1. Architecture Overview
This document defines the relational database architecture for the Garment Manufacturing ERP. It uses MySQL (via `mysql2`) as the underlying datastore. 

### Core Strategies
- **ID Strategy**: `BIGINT AUTO_INCREMENT` is used for all surrogate primary keys. It is highly performant for InnoDB indexing and foreign key relationships.
- **Business-Number Strategy**: Human-readable business numbers (e.g. Contract Number `GT/BUY01/001/2026-27`) are stored in distinct `VARCHAR` columns with `UNIQUE` constraints. They are never used as foreign keys; relationships always use the `BIGINT` surrogate key.
- **Audit Strategy**: Standard audit fields (`created_at`, `updated_at`, `created_by`, `updated_by`) are applied to master and transactional tables to track lineage.
- **Soft-Delete Strategy**: Applied (`deleted_at`) exclusively to Master entities (Buyers, Styles, Items) to preserve historical data integrity. Transactional records (Inquiries, POs) are not soft-deleted but rather managed via status (e.g., 'Cancelled').
- **Transaction Boundaries**: Operations spanning multiple tables (e.g., Goods Inward updating stock and PO status) must be wrapped in ACID transactions.

## 2. Entity List

**Access Control**
- \`users\`, \`roles\`, \`permissions\`, \`role_permissions\`, \`user_roles\`

**Masters**
- \`categories\`, \`order_formats\`, \`buyers\`, \`buyer_categories\`, \`styles\`, \`style_costings\`, \`style_costing_items\`, \`items\`, \`suppliers\`, \`fob_values\`, \`godowns\`, \`defect_codes\`

**Sales & Orders**
- \`inquiries\`, \`order_confirmations\`, \`order_confirmation_items\`

**Manufacturing Processes**
- \`work_orders\`, \`time_and_action\`, \`production_stages\`, \`production_stage_sizes\`, \`line_efficiencies\`

**Quality**
- \`qc_inspections\`, \`capa_records\`

**Inventory & Job Work**
- \`purchase_orders\`, \`purchase_order_items\`, \`goods_inwards\`, \`goods_inward_items\`, \`stock_ledgers\`, \`stock_balances\`, \`job_work_issues\`, \`job_work_receives\`, \`debit_notes\`

**Packing, Export & Finance**
- \`packing_lists\`, \`packing_cartons\`, \`export_documents\`, \`purchase_bills\`, \`ocr_validations\`

---

## 3. Table-by-Table Design

### Access Control

#### \`users\`
| Column | Type | Nullable | Key | Description |
|---|---|---|---|---|
| id | BIGINT | No | PK | Surrogate key |
| name | VARCHAR(255) | No | | User's full name |
| email | VARCHAR(255) | No | UK | User's login email |
| password_hash | VARCHAR(255) | No | | Hashed password |
| is_active | BOOLEAN | No | | Account status |
| created_at | TIMESTAMP | No | | |
| updated_at | TIMESTAMP | No | | |

*Relationships*: Has many \`user_roles\`
*Indexes*: \`email\` (UNIQUE)

#### \`roles\`
| Column | Type | Nullable | Key | Description |
|---|---|---|---|---|
| id | BIGINT | No | PK | Surrogate key |
| name | VARCHAR(100) | No | UK | e.g. 'Super Admin', 'Merchandising & Manufacturing' |
| is_system | BOOLEAN | No | | True for locked roles like 'Super Admin' |

#### \`permissions\` and \`role_permissions\`
Standard RBAC many-to-many junction tables mapping \`role_id\` to \`permission_id\`.

---

### Masters

#### \`categories\`
| Column | Type | Nullable | Key | Description |
|---|---|---|---|---|
| id | BIGINT | No | PK | |
| name | VARCHAR(100) | No | UK | e.g. "tshirt", "kurta for women" |
| created_at | TIMESTAMP | No | | |

#### \`order_formats\`
| Column | Type | Nullable | Key | Description |
|---|---|---|---|---|
| id | BIGINT | No | PK | |
| name | VARCHAR(100) | No | UK | e.g. "Standard Format" |
| category_id | BIGINT | No | FK | Linked category |

#### \`buyers\`
| Column | Type | Nullable | Key | Description |
|---|---|---|---|---|
| id | BIGINT | No | PK | |
| buyer_code | VARCHAR(50) | No | UK | System business code |
| company_name | VARCHAR(255) | No | | |
| country | VARCHAR(100) | Yes | | |
| agent | VARCHAR(100) | Yes | | |
| outstanding_balance | DECIMAL(15,2)| No | | Calculated or manual balance |
| deleted_at | TIMESTAMP | Yes | | Soft delete |

#### \`styles\` (Tech Pack & BOM Base)
| Column | Type | Nullable | Key | Description |
|---|---|---|---|---|
| id | BIGINT | No | PK | |
| buyer_id | BIGINT | No | FK | |
| buyer_style_number | VARCHAR(100)| No | | |
| factory_style_number| VARCHAR(100)| No | UK | |
| fabric | VARCHAR(255) | Yes | | |
| gsm | VARCHAR(50) | Yes | | |
| deleted_at | TIMESTAMP | Yes | | Soft delete |
*Indexes*: \`factory_style_number\` (UNIQUE), \`buyer_id\` (FK)

#### \`style_costings\`
*Business Rules*: Costing requires version history. Revisions don't overwrite approved historical costs.
| Column | Type | Nullable | Key | Description |
|---|---|---|---|---|
| id | BIGINT | No | PK | |
| style_id | BIGINT | No | FK | |
| status | VARCHAR(50) | No | | 'Draft', 'Approved' |
| total_cost | DECIMAL(12,2)| No | | Total computed cost |
| approved_by | BIGINT | Yes | FK | User ID who approved |
| created_at | TIMESTAMP | No | | |

#### \`items\` (Master Catalogue)
| Column | Type | Nullable | Key | Description |
|---|---|---|---|---|
| id | BIGINT | No | PK | |
| item_code | VARCHAR(100) | No | UK | |
| category | VARCHAR(100) | No | | |
| hsn_code | VARCHAR(50) | Yes | | |
| uom | VARCHAR(20) | No | | Unit of measure |
| gst_rate | DECIMAL(5,2) | No | | |
| reorder_level | INT | No | | |
| deleted_at | TIMESTAMP | Yes | | Soft delete |

#### \`suppliers\`
| Column | Type | Nullable | Key | Description |
|---|---|---|---|---|
| id | BIGINT | No | PK | |
| name | VARCHAR(255) | No | | |
| is_trading | BOOLEAN | No | | True if trading supplier |
| is_jobber | BOOLEAN | No | | True if job worker |
| registration_status | VARCHAR(50)| Yes | | |
| city | VARCHAR(100) | Yes | | |
| credit_terms | VARCHAR(255) | Yes | | |
| deleted_at | TIMESTAMP | Yes | | |

---

### Sales & Orders

#### \`inquiries\`
| Column | Type | Nullable | Key | Description |
|---|---|---|---|---|
| id | BIGINT | No | PK | |
| buyer_id | BIGINT | No | FK | |
| category_id | BIGINT | No | FK | |
| order_format_id | BIGINT | No | FK | |
| status | VARCHAR(50) | No | | 'Draft', 'Price Working', 'Quote Sent', 'Confirmed', 'Converted to OC', 'Lost' |
| created_at | TIMESTAMP | No | | |

#### \`order_confirmations\` (OC)
*Business Rules*: The central hub for downstream traceability. \`contract_number\` propagates relationally via this table's ID.
| Column | Type | Nullable | Key | Description |
|---|---|---|---|---|
| id | BIGINT | No | PK | |
| inquiry_id | BIGINT | No | FK | Originating inquiry |
| buyer_id | BIGINT | No | FK | |
| contract_number | VARCHAR(100) | No | UK | e.g. GT/BUY01/001/2026-27 |
| status | VARCHAR(50) | No | | 'Draft', 'OC Sent', 'Confirmed' |
| created_by | BIGINT | No | FK | |
| created_at | TIMESTAMP | No | | |
*Indexes*: \`contract_number\` (UNIQUE, high-frequency search)

---

### Manufacturing Processes

#### \`work_orders\`
| Column | Type | Nullable | Key | Description |
|---|---|---|---|---|
| id | BIGINT | No | PK | |
| order_confirmation_id | BIGINT | No | FK | The OC this belongs to |
| target_dispatch_date | DATE | No | | Drives T&A |
| status | VARCHAR(50) | No | | 'Draft', 'Hold', 'Released' |

#### \`production_stages\` (Pipeline tracker)
| Column | Type | Nullable | Key | Description |
|---|---|---|---|---|
| id | BIGINT | No | PK | |
| work_order_id | BIGINT | No | FK | |
| stage_name | VARCHAR(50) | No | | 'Cutting', 'Printing', 'Stitching', 'Finishing', 'QC', 'Packing', 'Dispatch' |
| total_good | INT | No | | Aggregated |
| total_damage | INT | No | | Aggregated |

#### \`production_stage_sizes\`
*Architectural Recommendation*: This solves the size matrix cleanly without hardcoding \`cutting_s\`, \`cutting_m\`.
| Column | Type | Nullable | Key | Description |
|---|---|---|---|---|
| id | BIGINT | No | PK | |
| production_stage_id| BIGINT | No | FK | |
| size_label | VARCHAR(10) | No | | 'S', 'M', 'L', 'XL', 'XXL', '3XL', etc. |
| good_quantity | INT | No | | |
| damage_quantity | INT | No | | |
*Indexes*: Composite (\`production_stage_id\`, \`size_label\`)

#### \`time_and_action\` (T&A)
| Column | Type | Nullable | Key | Description |
|---|---|---|---|---|
| id | BIGINT | No | PK | |
| work_order_id | BIGINT | No | FK | |
| checkpoint_name | VARCHAR(100) | No | | 'Fabric Inward', 'Cutting', etc. |
| planned_date | DATE | No | | |
| actual_date | DATE | Yes | | |
| is_late | BOOLEAN | No | | |

---

### Inventory

*Inventory Strategy*: Stock is maintained via a ledger system. \`stock_ledgers\` acts as the immutable transaction log (in/out). \`stock_balances\` is a materialized view/cache for fast lookups (godown + item + lot).

#### \`stock_balances\`
| Column | Type | Nullable | Key | Description |
|---|---|---|---|---|
| id | BIGINT | No | PK | |
| item_id | BIGINT | No | FK | |
| godown_id | BIGINT | No | FK | |
| lot_roll_number | VARCHAR(100) | Yes | | |
| quantity | DECIMAL(12,2)| No | | Current on-hand |

#### \`purchase_orders\`
| Column | Type | Nullable | Key | Description |
|---|---|---|---|---|
| id | BIGINT | No | PK | |
| order_confirmation_id | BIGINT | Yes| FK | Traceability link |
| supplier_id | BIGINT | No | FK | |
| po_number | VARCHAR(100) | No | UK | |
| status | VARCHAR(50) | No | | 'Draft', 'Raised', 'Partial', 'Fully Received' |

#### \`goods_inwards\`
| Column | Type | Nullable | Key | Description |
|---|---|---|---|---|
| id | BIGINT | No | PK | |
| purchase_order_id | BIGINT | No | FK | |
| status | VARCHAR(50) | No | | 'Pending Inspection', 'Approved', 'Rejected' |

---

### Quality & Export

#### \`capa_records\`
| Column | Type | Nullable | Key | Description |
|---|---|---|---|---|
| id | BIGINT | No | PK | |
| defect_code_id | BIGINT | No | FK | Linked to \`defect_codes\` |
| production_stage_id| BIGINT | No | FK | Where it happened |
| fix_plan | TEXT | No | | |
| status | VARCHAR(50) | No | | 'Open', 'Closed' |

#### \`export_documents\`
| Column | Type | Nullable | Key | Description |
|---|---|---|---|---|
| id | BIGINT | No | PK | |
| order_confirmation_id| BIGINT | No | FK | Central traceability |
| ebrc_status | VARCHAR(50) | No | | Tracks RBI file closure |
| fob_value_id | BIGINT | Yes | FK | Pricing basis |

#### \`ocr_validations\`
| Column | Type | Nullable | Key | Description |
|---|---|---|---|---|
| id | BIGINT | No | PK | |
| export_document_id| BIGINT | No | FK | |
| mismatch_flag | BOOLEAN | No | | Flagged by Gemini |
| resolution_status | VARCHAR(50) | No | | |

---

## 4. Transaction Boundaries
The following operations will explicitly require database transactions (ACID) during implementation:
1. **Goods Inward Approval**: Updating `goods_inwards` status + writing to `stock_ledgers` + updating `stock_balances` + updating `purchase_orders` status.
2. **Production Logging**: Updating `production_stage_sizes` + updating `line_efficiencies`.
3. **Job Work Receive**: Deducting job work outstanding + automatically generating a `debit_notes` record if damage > 0.
4. **Order Confirmation**: Converting Inquiry to OC + generating the unique `contract_number`.
