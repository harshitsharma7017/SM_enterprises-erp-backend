# Database Translation

## 2. Columns

### `agent_category`

#### `agent_id`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `category_id`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

### `agent_commissions`

#### `id`
- Source Type: `id`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `agent_id`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `commission_type`
- Source Type: `enum`
- MySQL Type: `ENUM('active','inactive')`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `amount`
- Source Type: `decimal`
- MySQL Type: `DECIMAL(15, 2)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `currency_id`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `sort_order`
- Source Type: `tinyInteger`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `created_at`
- Source Type: `timestamp`
- MySQL Type: `TIMESTAMP`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `updated_at`
- Source Type: `timestamp`
- MySQL Type: `TIMESTAMP`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

### `agents`

#### `id`
- Source Type: `id`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `agent_type`
- Source Type: `enum`
- MySQL Type: `ENUM('active','inactive')`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `name`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `display_code`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `calculation_basis_id`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `commission_rate`
- Source Type: `decimal`
- MySQL Type: `DECIMAL(15, 2)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `status`
- Source Type: `enum`
- MySQL Type: `ENUM('active','inactive')`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `remarks`
- Source Type: `text`
- MySQL Type: `TEXT`
- Nullable: YES
- Default: `NO EXPLICIT DEFAULT`

#### `created_by`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: YES
- Default: `NO EXPLICIT DEFAULT`

#### `updated_by`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: YES
- Default: `NO EXPLICIT DEFAULT`

#### `created_at`
- Source Type: `timestamp`
- MySQL Type: `TIMESTAMP`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `updated_at`
- Source Type: `timestamp`
- MySQL Type: `TIMESTAMP`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `deleted_at`
- Source Type: `timestamp`
- MySQL Type: `TIMESTAMP`
- Nullable: YES
- Default: `NO EXPLICIT DEFAULT`

### `buyer_carton_markings`

#### `id`
- Source Type: `id`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `buyer_id`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `line_no`
- Source Type: `tinyInteger`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `label`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `value`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `is_required`
- Source Type: `boolean`
- MySQL Type: `TINYINT(1)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `created_at`
- Source Type: `timestamp`
- MySQL Type: `TIMESTAMP`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `updated_at`
- Source Type: `timestamp`
- MySQL Type: `TIMESTAMP`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

### `buyer_category`

#### `id`
- Source Type: `id`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `buyer_id`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `category_id`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

### `buyer_contacts`

#### `id`
- Source Type: `id`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `buyer_id`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `name`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `designation_id`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `mobile`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `email`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `created_at`
- Source Type: `timestamp`
- MySQL Type: `TIMESTAMP`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `updated_at`
- Source Type: `timestamp`
- MySQL Type: `TIMESTAMP`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

### `buyer_shipment_method`

#### `id`
- Source Type: `id`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `buyer_id`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `shipment_method_id`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

### `buyers`

#### `id`
- Source Type: `id`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `display_code`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `company_name`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `name_on_export_invoice`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `contact_person`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `email`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `mobile`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `gst_vat_no`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `address`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `city`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `state`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `country_id`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `pincode`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `port_id`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `agent_id`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `agent_commission_type`
- Source Type: `enum`
- MySQL Type: `ENUM('active','inactive')`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `agent_commission_value`
- Source Type: `decimal`
- MySQL Type: `DECIMAL(15, 2)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `payment_term_id`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `incoterm_id`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `shipment_method_id`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `currency_id`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `bank_name`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `account_number`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `swift_code`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `status`
- Source Type: `enum`
- MySQL Type: `ENUM('active','inactive')`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `remarks`
- Source Type: `text`
- MySQL Type: `TEXT`
- Nullable: YES
- Default: `NO EXPLICIT DEFAULT`

#### `created_by`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: YES
- Default: `NO EXPLICIT DEFAULT`

#### `updated_by`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: YES
- Default: `NO EXPLICIT DEFAULT`

#### `created_at`
- Source Type: `timestamp`
- MySQL Type: `TIMESTAMP`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `updated_at`
- Source Type: `timestamp`
- MySQL Type: `TIMESTAMP`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `deleted_at`
- Source Type: `timestamp`
- MySQL Type: `TIMESTAMP`
- Nullable: YES
- Default: `NO EXPLICIT DEFAULT`

### `cache`

#### `key`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `value`
- Source Type: `mediumText`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `expiration`
- Source Type: `integer`
- MySQL Type: `INT`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

### `cache_locks`

#### `key`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `owner`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `expiration`
- Source Type: `integer`
- MySQL Type: `INT`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

### `calculation_bases`

#### `id`
- Source Type: `id`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `name`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `status`
- Source Type: `enum`
- MySQL Type: `ENUM('active','inactive')`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `created_at`
- Source Type: `timestamp`
- MySQL Type: `TIMESTAMP`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `updated_at`
- Source Type: `timestamp`
- MySQL Type: `TIMESTAMP`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

### `categories`

#### `id`
- Source Type: `id`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `code`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `name`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `description`
- Source Type: `text`
- MySQL Type: `TEXT`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `po_format_id`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `status`
- Source Type: `enum`
- MySQL Type: `ENUM('active','inactive')`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `remarks`
- Source Type: `text`
- MySQL Type: `TEXT`
- Nullable: YES
- Default: `NO EXPLICIT DEFAULT`

#### `created_by`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: YES
- Default: `NO EXPLICIT DEFAULT`

#### `updated_by`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: YES
- Default: `NO EXPLICIT DEFAULT`

#### `created_at`
- Source Type: `timestamp`
- MySQL Type: `TIMESTAMP`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `updated_at`
- Source Type: `timestamp`
- MySQL Type: `TIMESTAMP`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `deleted_at`
- Source Type: `timestamp`
- MySQL Type: `TIMESTAMP`
- Nullable: YES
- Default: `NO EXPLICIT DEFAULT`

### `category_format`

#### `id`
- Source Type: `id`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `category_id`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `document_format_id`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

### `cities`

#### `id`
- Source Type: `id`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `state_id`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `name`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `status`
- Source Type: `enum`
- MySQL Type: `ENUM('active','inactive')`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `created_at`
- Source Type: `timestamp`
- MySQL Type: `TIMESTAMP`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `updated_at`
- Source Type: `timestamp`
- MySQL Type: `TIMESTAMP`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

### `company_profile`

#### `id`
- Source Type: `id`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `company_name`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `tagline`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `address`
- Source Type: `text`
- MySQL Type: `TEXT`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `phone`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `email`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `gstin`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `iec_code`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `bank_name`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `bank_account_number`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `bank_ifsc`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `bank_swift`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `signatory_name`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `signatory_designation`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `logo_path`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `created_at`
- Source Type: `timestamp`
- MySQL Type: `TIMESTAMP`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `updated_at`
- Source Type: `timestamp`
- MySQL Type: `TIMESTAMP`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

### `container_export_document`

#### `container_id`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `export_document_id`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

### `containers`

#### `id`
- Source Type: `id`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `container_no`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `seal_no`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `type`
- Source Type: `enum`
- MySQL Type: `ENUM('active','inactive')`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `remarks`
- Source Type: `text`
- MySQL Type: `TEXT`
- Nullable: YES
- Default: `NO EXPLICIT DEFAULT`

#### `created_at`
- Source Type: `timestamp`
- MySQL Type: `TIMESTAMP`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `updated_at`
- Source Type: `timestamp`
- MySQL Type: `TIMESTAMP`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

### `countries`

#### `id`
- Source Type: `id`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `iso_code`
- Source Type: `char`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `name`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `dial_code`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `status`
- Source Type: `enum`
- MySQL Type: `ENUM('active','inactive')`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `created_at`
- Source Type: `timestamp`
- MySQL Type: `TIMESTAMP`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `updated_at`
- Source Type: `timestamp`
- MySQL Type: `TIMESTAMP`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

### `currencies`

#### `id`
- Source Type: `id`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `iso_code`
- Source Type: `char`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `name`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `symbol`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `status`
- Source Type: `enum`
- MySQL Type: `ENUM('active','inactive')`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `created_at`
- Source Type: `timestamp`
- MySQL Type: `TIMESTAMP`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `updated_at`
- Source Type: `timestamp`
- MySQL Type: `TIMESTAMP`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

### `default_markups`

#### `id`
- Source Type: `id`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `name`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `markup_percent`
- Source Type: `decimal`
- MySQL Type: `DECIMAL(15, 2)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `status`
- Source Type: `enum`
- MySQL Type: `ENUM('active','inactive')`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `remarks`
- Source Type: `text`
- MySQL Type: `TEXT`
- Nullable: YES
- Default: `NO EXPLICIT DEFAULT`

#### `created_by`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: YES
- Default: `NO EXPLICIT DEFAULT`

#### `updated_by`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: YES
- Default: `NO EXPLICIT DEFAULT`

#### `created_at`
- Source Type: `timestamp`
- MySQL Type: `TIMESTAMP`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `updated_at`
- Source Type: `timestamp`
- MySQL Type: `TIMESTAMP`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `deleted_at`
- Source Type: `timestamp`
- MySQL Type: `TIMESTAMP`
- Nullable: YES
- Default: `NO EXPLICIT DEFAULT`

### `designations`

#### `id`
- Source Type: `id`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `name`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `status`
- Source Type: `enum`
- MySQL Type: `ENUM('active','inactive')`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `created_at`
- Source Type: `timestamp`
- MySQL Type: `TIMESTAMP`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `updated_at`
- Source Type: `timestamp`
- MySQL Type: `TIMESTAMP`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

### `document_checklist_types`

#### `id`
- Source Type: `id`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `code`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `name`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `description`
- Source Type: `text`
- MySQL Type: `TEXT`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `category`
- Source Type: `enum`
- MySQL Type: `ENUM('active','inactive')`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `variant_labels`
- Source Type: `json`
- MySQL Type: `JSON`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `closes_shipment`
- Source Type: `boolean`
- MySQL Type: `TINYINT(1)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `sort_order`
- Source Type: `unsignedInteger`
- MySQL Type: `INT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `status`
- Source Type: `enum`
- MySQL Type: `ENUM('active','inactive')`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `created_at`
- Source Type: `timestamp`
- MySQL Type: `TIMESTAMP`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `updated_at`
- Source Type: `timestamp`
- MySQL Type: `TIMESTAMP`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

### `document_format_columns`

#### `id`
- Source Type: `id`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `document_format_id`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `key`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `label`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `is_enabled`
- Source Type: `boolean`
- MySQL Type: `TINYINT(1)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `is_custom`
- Source Type: `boolean`
- MySQL Type: `TINYINT(1)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `print_only`
- Source Type: `boolean`
- MySQL Type: `TINYINT(1)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `sort_order`
- Source Type: `tinyInteger`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

### `document_format_images`

#### `id`
- Source Type: `id`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `document_format_id`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `path`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `original_name`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `sort_order`
- Source Type: `tinyInteger`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `created_at`
- Source Type: `timestamp`
- MySQL Type: `TIMESTAMP`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `updated_at`
- Source Type: `timestamp`
- MySQL Type: `TIMESTAMP`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

### `document_format_units`

#### `id`
- Source Type: `id`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `document_format_id`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `name`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `sort_order`
- Source Type: `tinyInteger`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

### `document_formats`

#### `id`
- Source Type: `id`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `name`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `module`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `blade_view`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `status`
- Source Type: `enum`
- MySQL Type: `ENUM('active','inactive')`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `created_at`
- Source Type: `timestamp`
- MySQL Type: `TIMESTAMP`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `updated_at`
- Source Type: `timestamp`
- MySQL Type: `TIMESTAMP`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

### `export_document_carton_lines`

#### `id`
- Source Type: `id`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `export_document_carton_id`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `description`
- Source Type: `text`
- MySQL Type: `TEXT`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `unit`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `qty`
- Source Type: `unsignedInteger`
- MySQL Type: `INT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `sort_order`
- Source Type: `unsignedInteger`
- MySQL Type: `INT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `created_at`
- Source Type: `timestamp`
- MySQL Type: `TIMESTAMP`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `updated_at`
- Source Type: `timestamp`
- MySQL Type: `TIMESTAMP`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

### `export_document_cartons`

#### `id`
- Source Type: `id`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `export_document_id`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `carton_no`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `net_weight`
- Source Type: `decimal`
- MySQL Type: `DECIMAL(15, 2)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `sort_order`
- Source Type: `unsignedInteger`
- MySQL Type: `INT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `created_at`
- Source Type: `timestamp`
- MySQL Type: `TIMESTAMP`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `updated_at`
- Source Type: `timestamp`
- MySQL Type: `TIMESTAMP`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

### `export_document_checklists`

#### `id`
- Source Type: `id`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `export_document_id`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `document_checklist_type_id`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `variant_code`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `status`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `file_path`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `original_name`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `uploaded_at`
- Source Type: `timestamp`
- MySQL Type: `TIMESTAMP`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `generated_at`
- Source Type: `timestamp`
- MySQL Type: `TIMESTAMP`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `reference_no`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `amount`
- Source Type: `decimal`
- MySQL Type: `DECIMAL(15, 2)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `remarks`
- Source Type: `text`
- MySQL Type: `TEXT`
- Nullable: YES
- Default: `NO EXPLICIT DEFAULT`

#### `created_by`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: YES
- Default: `NO EXPLICIT DEFAULT`

#### `updated_by`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: YES
- Default: `NO EXPLICIT DEFAULT`

#### `created_at`
- Source Type: `timestamp`
- MySQL Type: `TIMESTAMP`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `updated_at`
- Source Type: `timestamp`
- MySQL Type: `TIMESTAMP`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

### `export_document_item_colours`

#### `id`
- Source Type: `id`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `export_document_item_id`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `colour`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `sort_order`
- Source Type: `unsignedInteger`
- MySQL Type: `INT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

### `export_document_item_sizes`

#### `id`
- Source Type: `id`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `export_document_item_colour_id`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `size`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `qty`
- Source Type: `unsignedInteger`
- MySQL Type: `INT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `sort_order`
- Source Type: `unsignedInteger`
- MySQL Type: `INT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

### `export_document_items`

#### `id`
- Source Type: `id`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `export_document_id`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `order_confirmation_item_id`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `sort_order`
- Source Type: `unsignedInteger`
- MySQL Type: `INT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `design_no`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `description`
- Source Type: `text`
- MySQL Type: `TEXT`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `product_id`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `unit`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `price`
- Source Type: `decimal`
- MySQL Type: `DECIMAL(15, 2)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `qty`
- Source Type: `unsignedInteger`
- MySQL Type: `INT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `amount`
- Source Type: `decimal`
- MySQL Type: `DECIMAL(15, 2)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `remarks`
- Source Type: `text`
- MySQL Type: `TEXT`
- Nullable: YES
- Default: `NO EXPLICIT DEFAULT`

#### `custom_values`
- Source Type: `json`
- MySQL Type: `JSON`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

### `export_documents`

#### `id`
- Source Type: `id`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `doc_num`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `financial_year`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `order_confirmation_id`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `buyer_id`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `currency_id`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `incoterm_id`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `port_of_loading_id`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `port_of_discharge_id`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `shipment_method_id`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `shipment_date`
- Source Type: `date`
- MySQL Type: `DATE`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `status`
- Source Type: `enum`
- MySQL Type: `ENUM('active','inactive')`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `remarks`
- Source Type: `text`
- MySQL Type: `TEXT`
- Nullable: YES
- Default: `NO EXPLICIT DEFAULT`

#### `created_by`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: YES
- Default: `NO EXPLICIT DEFAULT`

#### `updated_by`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: YES
- Default: `NO EXPLICIT DEFAULT`

#### `created_at`
- Source Type: `timestamp`
- MySQL Type: `TIMESTAMP`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `updated_at`
- Source Type: `timestamp`
- MySQL Type: `TIMESTAMP`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `deleted_at`
- Source Type: `timestamp`
- MySQL Type: `TIMESTAMP`
- Nullable: YES
- Default: `NO EXPLICIT DEFAULT`

### `failed_jobs`

#### `id`
- Source Type: `id`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `uuid`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `connection`
- Source Type: `text`
- MySQL Type: `TEXT`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `queue`
- Source Type: `text`
- MySQL Type: `TEXT`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `payload`
- Source Type: `longText`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `exception`
- Source Type: `longText`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `failed_at`
- Source Type: `timestamp`
- MySQL Type: `TIMESTAMP`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

### `fob_values`

#### `id`
- Source Type: `id`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `name`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `status`
- Source Type: `enum`
- MySQL Type: `ENUM('active','inactive')`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `remarks`
- Source Type: `text`
- MySQL Type: `TEXT`
- Nullable: YES
- Default: `NO EXPLICIT DEFAULT`

#### `created_by`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: YES
- Default: `NO EXPLICIT DEFAULT`

#### `updated_by`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: YES
- Default: `NO EXPLICIT DEFAULT`

#### `created_at`
- Source Type: `timestamp`
- MySQL Type: `TIMESTAMP`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `updated_at`
- Source Type: `timestamp`
- MySQL Type: `TIMESTAMP`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `deleted_at`
- Source Type: `timestamp`
- MySQL Type: `TIMESTAMP`
- Nullable: YES
- Default: `NO EXPLICIT DEFAULT`

### `gst_rates`

#### `id`
- Source Type: `id`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `rate`
- Source Type: `decimal`
- MySQL Type: `DECIMAL(15, 2)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `status`
- Source Type: `enum`
- MySQL Type: `ENUM('active','inactive')`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `created_at`
- Source Type: `timestamp`
- MySQL Type: `TIMESTAMP`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `updated_at`
- Source Type: `timestamp`
- MySQL Type: `TIMESTAMP`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

### `incoterms`

#### `id`
- Source Type: `id`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `code`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `name`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `description`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `status`
- Source Type: `enum`
- MySQL Type: `ENUM('active','inactive')`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `created_at`
- Source Type: `timestamp`
- MySQL Type: `TIMESTAMP`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `updated_at`
- Source Type: `timestamp`
- MySQL Type: `TIMESTAMP`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

### `inquiries`

#### `id`
- Source Type: `id`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `inquiry_no`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `financial_year`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `inquiry_date`
- Source Type: `date`
- MySQL Type: `DATE`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `buyer_ref`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `source`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `buyer_id`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `category_id`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `document_format_id`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `agent_id`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `agent_commission_type`
- Source Type: `enum`
- MySQL Type: `ENUM('active','inactive')`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `agent_commission_value`
- Source Type: `decimal`
- MySQL Type: `DECIMAL(15, 2)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `currency_id`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `exchange_rate`
- Source Type: `decimal`
- MySQL Type: `DECIMAL(15, 2)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `expected_shipment_date`
- Source Type: `date`
- MySQL Type: `DATE`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `delivery_details`
- Source Type: `text`
- MySQL Type: `TEXT`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `packing_details`
- Source Type: `text`
- MySQL Type: `TEXT`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `remarks`
- Source Type: `text`
- MySQL Type: `TEXT`
- Nullable: YES
- Default: `NO EXPLICIT DEFAULT`

#### `status`
- Source Type: `enum`
- MySQL Type: `ENUM('active','inactive')`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `converted_at`
- Source Type: `timestamp`
- MySQL Type: `TIMESTAMP`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `created_by`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: YES
- Default: `NO EXPLICIT DEFAULT`

#### `updated_by`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: YES
- Default: `NO EXPLICIT DEFAULT`

#### `created_at`
- Source Type: `timestamp`
- MySQL Type: `TIMESTAMP`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `updated_at`
- Source Type: `timestamp`
- MySQL Type: `TIMESTAMP`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `deleted_at`
- Source Type: `timestamp`
- MySQL Type: `TIMESTAMP`
- Nullable: YES
- Default: `NO EXPLICIT DEFAULT`

### `inquiry_follow_ups`

#### `id`
- Source Type: `id`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `inquiry_id`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `follow_up_date`
- Source Type: `date`
- MySQL Type: `DATE`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `comment`
- Source Type: `text`
- MySQL Type: `TEXT`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `created_by`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: YES
- Default: `NO EXPLICIT DEFAULT`

#### `created_at`
- Source Type: `timestamp`
- MySQL Type: `TIMESTAMP`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

### `inquiry_item_bom_lines`

#### `id`
- Source Type: `id`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `inquiry_item_id`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `sort_order`
- Source Type: `unsignedInteger`
- MySQL Type: `INT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `component_name`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `qty`
- Source Type: `decimal`
- MySQL Type: `DECIMAL(15, 2)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `unit`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `is_custom`
- Source Type: `boolean`
- MySQL Type: `TINYINT(1)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `remarks`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: YES
- Default: `NO EXPLICIT DEFAULT`

### `inquiry_item_colours`

#### `id`
- Source Type: `id`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `inquiry_item_id`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `colour`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `sort_order`
- Source Type: `unsignedInteger`
- MySQL Type: `INT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

### `inquiry_item_sizes`

#### `id`
- Source Type: `id`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `inquiry_item_colour_id`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `size`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `qty`
- Source Type: `unsignedInteger`
- MySQL Type: `INT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `sort_order`
- Source Type: `unsignedInteger`
- MySQL Type: `INT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

### `inquiry_items`

#### `id`
- Source Type: `id`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `inquiry_id`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `sort_order`
- Source Type: `unsignedInteger`
- MySQL Type: `INT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `design_no`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `description`
- Source Type: `text`
- MySQL Type: `TEXT`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `product_id`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `supplier_id`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `unit`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `fob_value_id`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `price`
- Source Type: `decimal`
- MySQL Type: `DECIMAL(15, 2)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `qty`
- Source Type: `unsignedInteger`
- MySQL Type: `INT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `amount`
- Source Type: `decimal`
- MySQL Type: `DECIMAL(15, 2)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `status`
- Source Type: `enum`
- MySQL Type: `ENUM('active','inactive')`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `remarks`
- Source Type: `text`
- MySQL Type: `TEXT`
- Nullable: YES
- Default: `NO EXPLICIT DEFAULT`

### `inquiry_sources`

#### `id`
- Source Type: `id`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `name`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `status`
- Source Type: `enum`
- MySQL Type: `ENUM('active','inactive')`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `created_at`
- Source Type: `timestamp`
- MySQL Type: `TIMESTAMP`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `updated_at`
- Source Type: `timestamp`
- MySQL Type: `TIMESTAMP`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

### `inward_entries`

#### `id`
- Source Type: `id`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `inward_no`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `financial_year`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `inward_date`
- Source Type: `date`
- MySQL Type: `DATE`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `purchase_order_id`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `supplier_id`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `challan_no`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `challan_date`
- Source Type: `date`
- MySQL Type: `DATE`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `remarks`
- Source Type: `text`
- MySQL Type: `TEXT`
- Nullable: YES
- Default: `NO EXPLICIT DEFAULT`

#### `status`
- Source Type: `enum`
- MySQL Type: `ENUM('active','inactive')`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `qc_inspected_at`
- Source Type: `timestamp`
- MySQL Type: `TIMESTAMP`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `qc_inspected_by`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `created_by`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: YES
- Default: `NO EXPLICIT DEFAULT`

#### `updated_by`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: YES
- Default: `NO EXPLICIT DEFAULT`

#### `created_at`
- Source Type: `timestamp`
- MySQL Type: `TIMESTAMP`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `updated_at`
- Source Type: `timestamp`
- MySQL Type: `TIMESTAMP`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `deleted_at`
- Source Type: `timestamp`
- MySQL Type: `TIMESTAMP`
- Nullable: YES
- Default: `NO EXPLICIT DEFAULT`

### `inward_entry_items`

#### `id`
- Source Type: `id`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `inward_entry_id`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `purchase_order_item_id`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `product_id`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `sort_order`
- Source Type: `unsignedInteger`
- MySQL Type: `INT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `description`
- Source Type: `text`
- MySQL Type: `TEXT`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `unit`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `ordered_qty`
- Source Type: `unsignedInteger`
- MySQL Type: `INT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `received_qty`
- Source Type: `unsignedInteger`
- MySQL Type: `INT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `passed_qty`
- Source Type: `unsignedInteger`
- MySQL Type: `INT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `rejected_qty`
- Source Type: `unsignedInteger`
- MySQL Type: `INT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `remarks`
- Source Type: `text`
- MySQL Type: `TEXT`
- Nullable: YES
- Default: `NO EXPLICIT DEFAULT`

#### `qc_remarks`
- Source Type: `text`
- MySQL Type: `TEXT`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

### `job_batches`

#### `id`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `name`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `total_jobs`
- Source Type: `integer`
- MySQL Type: `INT`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `pending_jobs`
- Source Type: `integer`
- MySQL Type: `INT`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `failed_jobs`
- Source Type: `integer`
- MySQL Type: `INT`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `failed_job_ids`
- Source Type: `longText`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `options`
- Source Type: `mediumText`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `cancelled_at`
- Source Type: `integer`
- MySQL Type: `INT`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `created_at`
- Source Type: `integer`
- MySQL Type: `INT`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `finished_at`
- Source Type: `integer`
- MySQL Type: `INT`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

### `jobs`

#### `id`
- Source Type: `id`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `queue`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `payload`
- Source Type: `longText`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `attempts`
- Source Type: `unsignedTinyInteger`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `reserved_at`
- Source Type: `unsignedInteger`
- MySQL Type: `INT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `available_at`
- Source Type: `unsignedInteger`
- MySQL Type: `INT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `created_at`
- Source Type: `unsignedInteger`
- MySQL Type: `INT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

### `markups`

#### `id`
- Source Type: `id`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `supplier_id`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `buyer_id`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `record_date`
- Source Type: `date`
- MySQL Type: `DATE`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `markup_percent`
- Source Type: `decimal`
- MySQL Type: `DECIMAL(15, 2)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `status`
- Source Type: `enum`
- MySQL Type: `ENUM('active','inactive')`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `remarks`
- Source Type: `text`
- MySQL Type: `TEXT`
- Nullable: YES
- Default: `NO EXPLICIT DEFAULT`

#### `created_by`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: YES
- Default: `NO EXPLICIT DEFAULT`

#### `updated_by`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: YES
- Default: `NO EXPLICIT DEFAULT`

#### `created_at`
- Source Type: `timestamp`
- MySQL Type: `TIMESTAMP`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `updated_at`
- Source Type: `timestamp`
- MySQL Type: `TIMESTAMP`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `deleted_at`
- Source Type: `timestamp`
- MySQL Type: `TIMESTAMP`
- Nullable: YES
- Default: `NO EXPLICIT DEFAULT`

### `number_series`

#### `id`
- Source Type: `id`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `module`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `prefix`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `financial_year`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `current_number`
- Source Type: `unsignedBigInteger`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `padding`
- Source Type: `unsignedTinyInteger`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `reset_yearly`
- Source Type: `boolean`
- MySQL Type: `TINYINT(1)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `created_at`
- Source Type: `timestamp`
- MySQL Type: `TIMESTAMP`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `updated_at`
- Source Type: `timestamp`
- MySQL Type: `TIMESTAMP`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

### `order_confirmation_item_colours`

#### `id`
- Source Type: `id`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `order_confirmation_item_id`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `colour`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `sort_order`
- Source Type: `unsignedInteger`
- MySQL Type: `INT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

### `order_confirmation_item_sizes`

#### `id`
- Source Type: `id`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `order_confirmation_item_colour_id`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `size`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `qty`
- Source Type: `unsignedInteger`
- MySQL Type: `INT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `sort_order`
- Source Type: `unsignedInteger`
- MySQL Type: `INT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

### `order_confirmation_items`

#### `id`
- Source Type: `id`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `order_confirmation_id`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `sort_order`
- Source Type: `unsignedInteger`
- MySQL Type: `INT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `design_no`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `description`
- Source Type: `text`
- MySQL Type: `TEXT`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `product_id`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `supplier_id`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `unit`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `fob_value_id`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `price`
- Source Type: `decimal`
- MySQL Type: `DECIMAL(15, 2)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `cost_price`
- Source Type: `decimal`
- MySQL Type: `DECIMAL(15, 2)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `qty`
- Source Type: `unsignedInteger`
- MySQL Type: `INT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `amount`
- Source Type: `decimal`
- MySQL Type: `DECIMAL(15, 2)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `remarks`
- Source Type: `text`
- MySQL Type: `TEXT`
- Nullable: YES
- Default: `NO EXPLICIT DEFAULT`

#### `custom_values`
- Source Type: `json`
- MySQL Type: `JSON`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

### `order_confirmations`

#### `id`
- Source Type: `id`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `oc_num`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `financial_year`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `mode`
- Source Type: `enum`
- MySQL Type: `ENUM('active','inactive')`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `oc_date`
- Source Type: `date`
- MySQL Type: `DATE`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `buyer_ref`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `source_inquiry_id`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `buyer_id`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `category_id`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `document_format_id`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `agent_id`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `agent_commission_type`
- Source Type: `enum`
- MySQL Type: `ENUM('active','inactive')`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `agent_commission_value`
- Source Type: `decimal`
- MySQL Type: `DECIMAL(15, 2)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `currency_id`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `incoterm`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `ship_method`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `shipment_date`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `pol`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `pod`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `payment_terms`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `delivery_details`
- Source Type: `text`
- MySQL Type: `TEXT`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `packing_details`
- Source Type: `text`
- MySQL Type: `TEXT`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `remarks`
- Source Type: `text`
- MySQL Type: `TEXT`
- Nullable: YES
- Default: `NO EXPLICIT DEFAULT`

#### `status`
- Source Type: `enum`
- MySQL Type: `ENUM('active','inactive')`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `created_by`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: YES
- Default: `NO EXPLICIT DEFAULT`

#### `updated_by`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: YES
- Default: `NO EXPLICIT DEFAULT`

#### `created_at`
- Source Type: `timestamp`
- MySQL Type: `TIMESTAMP`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `updated_at`
- Source Type: `timestamp`
- MySQL Type: `TIMESTAMP`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `deleted_at`
- Source Type: `timestamp`
- MySQL Type: `TIMESTAMP`
- Nullable: YES
- Default: `NO EXPLICIT DEFAULT`

### `password_reset_tokens`

#### `email`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `token`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `created_at`
- Source Type: `timestamp`
- MySQL Type: `TIMESTAMP`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

### `payment_terms`

#### `id`
- Source Type: `id`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `name`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `days`
- Source Type: `smallInteger`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `applies_to`
- Source Type: `enum`
- MySQL Type: `ENUM('active','inactive')`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `status`
- Source Type: `enum`
- MySQL Type: `ENUM('active','inactive')`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `created_at`
- Source Type: `timestamp`
- MySQL Type: `TIMESTAMP`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `updated_at`
- Source Type: `timestamp`
- MySQL Type: `TIMESTAMP`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

### `ports`

#### `id`
- Source Type: `id`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `country_id`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `code`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `name`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `type`
- Source Type: `enum`
- MySQL Type: `ENUM('active','inactive')`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `status`
- Source Type: `enum`
- MySQL Type: `ENUM('active','inactive')`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `created_at`
- Source Type: `timestamp`
- MySQL Type: `TIMESTAMP`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `updated_at`
- Source Type: `timestamp`
- MySQL Type: `TIMESTAMP`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

### `price_bands`

#### `id`
- Source Type: `id`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `code`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `name`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `status`
- Source Type: `enum`
- MySQL Type: `ENUM('active','inactive')`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `created_at`
- Source Type: `timestamp`
- MySQL Type: `TIMESTAMP`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `updated_at`
- Source Type: `timestamp`
- MySQL Type: `TIMESTAMP`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

### `product_bom_items`

#### `id`
- Source Type: `id`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `product_id`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `sort_order`
- Source Type: `unsignedInteger`
- MySQL Type: `INT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `component_name`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `qty`
- Source Type: `decimal`
- MySQL Type: `DECIMAL(15, 2)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `unit`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `is_custom`
- Source Type: `boolean`
- MySQL Type: `TINYINT(1)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `remarks`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: YES
- Default: `NO EXPLICIT DEFAULT`

#### `created_at`
- Source Type: `timestamp`
- MySQL Type: `TIMESTAMP`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `updated_at`
- Source Type: `timestamp`
- MySQL Type: `TIMESTAMP`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

### `product_incentives`

#### `id`
- Source Type: `id`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `product_id`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `scheme`
- Source Type: `enum`
- MySQL Type: `ENUM('active','inactive')`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `percent_1`
- Source Type: `decimal`
- MySQL Type: `DECIMAL(15, 2)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `percent_2`
- Source Type: `decimal`
- MySQL Type: `DECIMAL(15, 2)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `cap_value`
- Source Type: `decimal`
- MySQL Type: `DECIMAL(15, 2)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `calculation_basis_id`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `created_at`
- Source Type: `timestamp`
- MySQL Type: `TIMESTAMP`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `updated_at`
- Source Type: `timestamp`
- MySQL Type: `TIMESTAMP`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

### `products`

#### `id`
- Source Type: `id`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `category_id`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `item_group_code`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `name`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `name_on_export_document`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `barcode`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `unit_po`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `unit_export`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `hsn_code`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `drawback_sr_no`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `price_band_id`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `gst_rate_id`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `fabric_length_mtr`
- Source Type: `decimal`
- MySQL Type: `DECIMAL(15, 2)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `fabric_width_inch`
- Source Type: `decimal`
- MySQL Type: `DECIMAL(15, 2)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `sq_mtr_per_unit`
- Source Type: `decimal`
- MySQL Type: `DECIMAL(15, 2)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `description`
- Source Type: `text`
- MySQL Type: `TEXT`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `status`
- Source Type: `enum`
- MySQL Type: `ENUM('active','inactive')`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `remarks`
- Source Type: `text`
- MySQL Type: `TEXT`
- Nullable: YES
- Default: `NO EXPLICIT DEFAULT`

#### `created_by`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: YES
- Default: `NO EXPLICIT DEFAULT`

#### `updated_by`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: YES
- Default: `NO EXPLICIT DEFAULT`

#### `created_at`
- Source Type: `timestamp`
- MySQL Type: `TIMESTAMP`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `updated_at`
- Source Type: `timestamp`
- MySQL Type: `TIMESTAMP`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `deleted_at`
- Source Type: `timestamp`
- MySQL Type: `TIMESTAMP`
- Nullable: YES
- Default: `NO EXPLICIT DEFAULT`

### `purchase_order_item_colours`

#### `id`
- Source Type: `id`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `purchase_order_item_id`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `colour`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `sort_order`
- Source Type: `unsignedInteger`
- MySQL Type: `INT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

### `purchase_order_item_sizes`

#### `id`
- Source Type: `id`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `purchase_order_item_colour_id`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `size`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `qty`
- Source Type: `unsignedInteger`
- MySQL Type: `INT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `sort_order`
- Source Type: `unsignedInteger`
- MySQL Type: `INT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

### `purchase_order_items`

#### `id`
- Source Type: `id`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `purchase_order_id`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `order_confirmation_item_id`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `sort_order`
- Source Type: `unsignedInteger`
- MySQL Type: `INT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `design_no`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `description`
- Source Type: `text`
- MySQL Type: `TEXT`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `product_id`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `unit`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `cost_price`
- Source Type: `decimal`
- MySQL Type: `DECIMAL(15, 2)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `qty`
- Source Type: `unsignedInteger`
- MySQL Type: `INT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `amount`
- Source Type: `decimal`
- MySQL Type: `DECIMAL(15, 2)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `remarks`
- Source Type: `text`
- MySQL Type: `TEXT`
- Nullable: YES
- Default: `NO EXPLICIT DEFAULT`

#### `custom_values`
- Source Type: `json`
- MySQL Type: `JSON`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

### `purchase_order_timeline_entries`

#### `id`
- Source Type: `id`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `purchase_order_id`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `entry_date`
- Source Type: `date`
- MySQL Type: `DATE`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `note`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `qty`
- Source Type: `unsignedInteger`
- MySQL Type: `INT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `sort_order`
- Source Type: `unsignedInteger`
- MySQL Type: `INT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

### `purchase_orders`

#### `id`
- Source Type: `id`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `po_num`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `financial_year`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `order_confirmation_id`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `supplier_id`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `po_date`
- Source Type: `date`
- MySQL Type: `DATE`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `dispatch_date`
- Source Type: `date`
- MySQL Type: `DATE`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `delivery_details`
- Source Type: `text`
- MySQL Type: `TEXT`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `packing_details`
- Source Type: `text`
- MySQL Type: `TEXT`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `remarks`
- Source Type: `text`
- MySQL Type: `TEXT`
- Nullable: YES
- Default: `NO EXPLICIT DEFAULT`

#### `status`
- Source Type: `enum`
- MySQL Type: `ENUM('active','inactive')`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `created_by`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: YES
- Default: `NO EXPLICIT DEFAULT`

#### `updated_by`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: YES
- Default: `NO EXPLICIT DEFAULT`

#### `created_at`
- Source Type: `timestamp`
- MySQL Type: `TIMESTAMP`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `updated_at`
- Source Type: `timestamp`
- MySQL Type: `TIMESTAMP`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `deleted_at`
- Source Type: `timestamp`
- MySQL Type: `TIMESTAMP`
- Nullable: YES
- Default: `NO EXPLICIT DEFAULT`

### `sessions`

#### `id`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `user_id`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `ip_address`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `user_agent`
- Source Type: `text`
- MySQL Type: `TEXT`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `payload`
- Source Type: `longText`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `last_activity`
- Source Type: `integer`
- MySQL Type: `INT`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

### `shipment_methods`

#### `id`
- Source Type: `id`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `name`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `status`
- Source Type: `enum`
- MySQL Type: `ENUM('active','inactive')`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `created_at`
- Source Type: `timestamp`
- MySQL Type: `TIMESTAMP`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `updated_at`
- Source Type: `timestamp`
- MySQL Type: `TIMESTAMP`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

### `states`

#### `id`
- Source Type: `id`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `country_id`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `name`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `code`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `status`
- Source Type: `enum`
- MySQL Type: `ENUM('active','inactive')`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `created_at`
- Source Type: `timestamp`
- MySQL Type: `TIMESTAMP`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `updated_at`
- Source Type: `timestamp`
- MySQL Type: `TIMESTAMP`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

### `supplier_buyer`

#### `id`
- Source Type: `id`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `supplier_id`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `buyer_id`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

### `supplier_category`

#### `id`
- Source Type: `id`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `supplier_id`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `category_id`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

### `supplier_contacts`

#### `id`
- Source Type: `id`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `supplier_id`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `name`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `designation_id`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `mobile`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `email`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `is_primary`
- Source Type: `boolean`
- MySQL Type: `TINYINT(1)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `created_at`
- Source Type: `timestamp`
- MySQL Type: `TIMESTAMP`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `updated_at`
- Source Type: `timestamp`
- MySQL Type: `TIMESTAMP`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

### `supplier_product`

#### `id`
- Source Type: `id`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `supplier_id`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `product_id`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

### `supplier_types`

#### `id`
- Source Type: `id`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `code`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `name`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `is_registered`
- Source Type: `boolean`
- MySQL Type: `TINYINT(1)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `status`
- Source Type: `enum`
- MySQL Type: `ENUM('active','inactive')`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `created_at`
- Source Type: `timestamp`
- MySQL Type: `TIMESTAMP`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `updated_at`
- Source Type: `timestamp`
- MySQL Type: `TIMESTAMP`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

### `suppliers`

#### `id`
- Source Type: `id`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `display_code`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `party_type`
- Source Type: `enum`
- MySQL Type: `ENUM('active','inactive')`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `company_name`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `name_on_bill`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `supplier_type_id`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `gst_number`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `pan_number`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `is_msme`
- Source Type: `boolean`
- MySQL Type: `TINYINT(1)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `msme_registration_no`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `address`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `country_id`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `state_id`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `city_id`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `pincode`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `discount_percent`
- Source Type: `decimal`
- MySQL Type: `DECIMAL(15, 2)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `credit_days`
- Source Type: `smallInteger`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `bank_name`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `account_number`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `ifsc_code`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `agent_id`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `agent_commission_type`
- Source Type: `enum`
- MySQL Type: `ENUM('active','inactive')`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `agent_commission_value`
- Source Type: `decimal`
- MySQL Type: `DECIMAL(15, 2)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `we_supply_material`
- Source Type: `boolean`
- MySQL Type: `TINYINT(1)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `requires_sample_approval`
- Source Type: `boolean`
- MySQL Type: `TINYINT(1)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `default_delivery_mode`
- Source Type: `enum`
- MySQL Type: `ENUM('active','inactive')`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `status`
- Source Type: `enum`
- MySQL Type: `ENUM('active','inactive')`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `remarks`
- Source Type: `text`
- MySQL Type: `TEXT`
- Nullable: YES
- Default: `NO EXPLICIT DEFAULT`

#### `created_by`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: YES
- Default: `NO EXPLICIT DEFAULT`

#### `updated_by`
- Source Type: `foreignId`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: YES
- Default: `NO EXPLICIT DEFAULT`

#### `created_at`
- Source Type: `timestamp`
- MySQL Type: `TIMESTAMP`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `updated_at`
- Source Type: `timestamp`
- MySQL Type: `TIMESTAMP`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `deleted_at`
- Source Type: `timestamp`
- MySQL Type: `TIMESTAMP`
- Nullable: YES
- Default: `NO EXPLICIT DEFAULT`

### `users`

#### `id`
- Source Type: `id`
- MySQL Type: `BIGINT UNSIGNED`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `name`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `email`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `email_verified_at`
- Source Type: `timestamp`
- MySQL Type: `TIMESTAMP`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `password`
- Source Type: `string`
- MySQL Type: `VARCHAR(255)`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `created_at`
- Source Type: `timestamp`
- MySQL Type: `TIMESTAMP`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

#### `updated_at`
- Source Type: `timestamp`
- MySQL Type: `TIMESTAMP`
- Nullable: NO
- Default: `NO EXPLICIT DEFAULT`

## 5. Indexes

| Table | Columns | Name |
|---|---|---|

## 6. Unique Constraints

| Table | Columns | Name |
|---|---|---|

## 7. Foreign Keys

| Child Table | Child Column | Parent Table | Parent Column | Nullable | On Delete | On Update |
|---|---|---|---|---|---|---|

## 5. Indexes

| Table | Columns | Name |
|---|---|---|

## 6. Unique Constraints

| Table | Columns | Name |
|---|---|---|

## 7. Foreign Keys

| Child Table | Child Column | Parent Table | Parent Column | Nullable | On Delete | On Update |
|---|---|---|---|---|---|---|
| agent_category | agent_id | agents | id | NO | RESTRICT | NOT EXPLICITLY SPECIFIED |
| agent_category | category_id | categories | id | NO | RESTRICT | NOT EXPLICITLY SPECIFIED |
| agent_commissions | agent_id | agents | id | NO | RESTRICT | NOT EXPLICITLY SPECIFIED |
| agent_commissions | currency_id | currencies | id | NO | RESTRICT | NOT EXPLICITLY SPECIFIED |
| agents | calculation_basis_id | calculation_bases | id | NO | RESTRICT | NOT EXPLICITLY SPECIFIED |
| agents | created_by | users | id | YES | SET NULL | NOT EXPLICITLY SPECIFIED |
| agents | updated_by | users | id | YES | SET NULL | NOT EXPLICITLY SPECIFIED |
| buyer_carton_markings | buyer_id | buyers | id | NO | RESTRICT | NOT EXPLICITLY SPECIFIED |
| buyer_category | buyer_id | buyers | id | NO | RESTRICT | NOT EXPLICITLY SPECIFIED |
| buyer_category | category_id | categories | id | NO | RESTRICT | NOT EXPLICITLY SPECIFIED |
| buyer_contacts | buyer_id | buyers | id | NO | RESTRICT | NOT EXPLICITLY SPECIFIED |
| buyer_contacts | designation_id | designations | id | NO | RESTRICT | NOT EXPLICITLY SPECIFIED |
| buyer_shipment_method | buyer_id | buyers | id | NO | RESTRICT | NOT EXPLICITLY SPECIFIED |
| buyer_shipment_method | shipment_method_id | shipment_methods | id | NO | RESTRICT | NOT EXPLICITLY SPECIFIED |
| buyers | country_id | countries | id | NO | RESTRICT | NOT EXPLICITLY SPECIFIED |
| buyers | port_id | ports | id | NO | RESTRICT | NOT EXPLICITLY SPECIFIED |
| buyers | agent_id | agents | id | NO | RESTRICT | NOT EXPLICITLY SPECIFIED |
| buyers | payment_term_id | payment_terms | id | NO | RESTRICT | NOT EXPLICITLY SPECIFIED |
| buyers | incoterm_id | incoterms | id | NO | RESTRICT | NOT EXPLICITLY SPECIFIED |
| buyers | shipment_method_id | shipment_methods | id | NO | RESTRICT | NOT EXPLICITLY SPECIFIED |
| buyers | currency_id | currencies | id | NO | RESTRICT | NOT EXPLICITLY SPECIFIED |
| buyers | created_by | users | id | YES | SET NULL | NOT EXPLICITLY SPECIFIED |
| buyers | updated_by | users | id | YES | SET NULL | NOT EXPLICITLY SPECIFIED |
| categories | created_by | users | id | YES | SET NULL | NOT EXPLICITLY SPECIFIED |
| categories | updated_by | users | id | YES | SET NULL | NOT EXPLICITLY SPECIFIED |
| category_format | category_id | categories | id | NO | RESTRICT | NOT EXPLICITLY SPECIFIED |
| category_format | document_format_id | document_formats | id | NO | RESTRICT | NOT EXPLICITLY SPECIFIED |
| cities | state_id | states | id | NO | RESTRICT | NOT EXPLICITLY SPECIFIED |
| container_export_document | container_id | containers | id | NO | RESTRICT | NOT EXPLICITLY SPECIFIED |
| container_export_document | export_document_id | export_documents | id | NO | RESTRICT | NOT EXPLICITLY SPECIFIED |
| default_markups | created_by | users | id | YES | SET NULL | NOT EXPLICITLY SPECIFIED |
| default_markups | updated_by | users | id | YES | SET NULL | NOT EXPLICITLY SPECIFIED |
| document_format_columns | document_format_id | document_formats | id | NO | RESTRICT | NOT EXPLICITLY SPECIFIED |
| document_format_images | document_format_id | document_formats | id | NO | RESTRICT | NOT EXPLICITLY SPECIFIED |
| document_format_units | document_format_id | document_formats | id | NO | RESTRICT | NOT EXPLICITLY SPECIFIED |
| export_document_carton_lines | export_document_carton_id | export_document_cartons | id | NO | RESTRICT | NOT EXPLICITLY SPECIFIED |
| export_document_cartons | export_document_id | export_documents | id | NO | RESTRICT | NOT EXPLICITLY SPECIFIED |
| export_document_checklists | export_document_id | export_documents | id | NO | RESTRICT | NOT EXPLICITLY SPECIFIED |
| export_document_checklists | document_checklist_type_id | document_checklist_types | id | NO | RESTRICT | NOT EXPLICITLY SPECIFIED |
| export_document_checklists | created_by | users | id | YES | SET NULL | NOT EXPLICITLY SPECIFIED |
| export_document_checklists | updated_by | users | id | YES | SET NULL | NOT EXPLICITLY SPECIFIED |
| export_document_item_colours | export_document_item_id | export_document_items | id | NO | RESTRICT | NOT EXPLICITLY SPECIFIED |
| export_document_item_sizes | export_document_item_colour_id | export_document_item_colours | id | NO | RESTRICT | NOT EXPLICITLY SPECIFIED |
| export_document_items | export_document_id | export_documents | id | NO | RESTRICT | NOT EXPLICITLY SPECIFIED |
| export_document_items | order_confirmation_item_id | order_confirmation_items | id | NO | RESTRICT | NOT EXPLICITLY SPECIFIED |
| export_document_items | product_id | products | id | NO | RESTRICT | NOT EXPLICITLY SPECIFIED |
| export_documents | order_confirmation_id | order_confirmations | id | NO | RESTRICT | NOT EXPLICITLY SPECIFIED |
| export_documents | buyer_id | buyers | id | NO | RESTRICT | NOT EXPLICITLY SPECIFIED |
| export_documents | currency_id | currencies | id | NO | RESTRICT | NOT EXPLICITLY SPECIFIED |
| export_documents | incoterm_id | incoterms | id | NO | RESTRICT | NOT EXPLICITLY SPECIFIED |
| export_documents | port_of_loading_id | ports | id | NO | RESTRICT | NOT EXPLICITLY SPECIFIED |
| export_documents | port_of_discharge_id | ports | id | NO | RESTRICT | NOT EXPLICITLY SPECIFIED |
| export_documents | shipment_method_id | shipment_methods | id | NO | RESTRICT | NOT EXPLICITLY SPECIFIED |
| export_documents | created_by | users | id | YES | SET NULL | NOT EXPLICITLY SPECIFIED |
| export_documents | updated_by | users | id | YES | SET NULL | NOT EXPLICITLY SPECIFIED |
| fob_values | created_by | users | id | YES | SET NULL | NOT EXPLICITLY SPECIFIED |
| fob_values | updated_by | users | id | YES | SET NULL | NOT EXPLICITLY SPECIFIED |
| inquiries | buyer_id | buyers | id | NO | RESTRICT | NOT EXPLICITLY SPECIFIED |
| inquiries | category_id | categories | id | NO | RESTRICT | NOT EXPLICITLY SPECIFIED |
| inquiries | document_format_id | document_formats | id | NO | RESTRICT | NOT EXPLICITLY SPECIFIED |
| inquiries | agent_id | agents | id | NO | RESTRICT | NOT EXPLICITLY SPECIFIED |
| inquiries | currency_id | currencies | id | NO | RESTRICT | NOT EXPLICITLY SPECIFIED |
| inquiries | created_by | users | id | YES | SET NULL | NOT EXPLICITLY SPECIFIED |
| inquiries | updated_by | users | id | YES | SET NULL | NOT EXPLICITLY SPECIFIED |
| inquiry_follow_ups | inquiry_id | inquiries | id | NO | RESTRICT | NOT EXPLICITLY SPECIFIED |
| inquiry_follow_ups | created_by | users | id | YES | SET NULL | NOT EXPLICITLY SPECIFIED |
| inquiry_item_bom_lines | inquiry_item_id | inquiry_items | id | NO | RESTRICT | NOT EXPLICITLY SPECIFIED |
| inquiry_item_colours | inquiry_item_id | inquiry_items | id | NO | RESTRICT | NOT EXPLICITLY SPECIFIED |
| inquiry_item_sizes | inquiry_item_colour_id | inquiry_item_colours | id | NO | RESTRICT | NOT EXPLICITLY SPECIFIED |
| inquiry_items | inquiry_id | inquiries | id | NO | RESTRICT | NOT EXPLICITLY SPECIFIED |
| inquiry_items | product_id | products | id | NO | RESTRICT | NOT EXPLICITLY SPECIFIED |
| inquiry_items | supplier_id | suppliers | id | NO | RESTRICT | NOT EXPLICITLY SPECIFIED |
| inquiry_items | fob_value_id | fob_values | id | NO | RESTRICT | NOT EXPLICITLY SPECIFIED |
| inward_entries | purchase_order_id | purchase_orders | id | NO | RESTRICT | NOT EXPLICITLY SPECIFIED |
| inward_entries | supplier_id | suppliers | id | NO | RESTRICT | NOT EXPLICITLY SPECIFIED |
| inward_entries | qc_inspected_by | users | id | YES | SET NULL | NOT EXPLICITLY SPECIFIED |
| inward_entries | created_by | users | id | YES | SET NULL | NOT EXPLICITLY SPECIFIED |
| inward_entries | updated_by | users | id | YES | SET NULL | NOT EXPLICITLY SPECIFIED |
| inward_entry_items | inward_entry_id | inward_entries | id | NO | RESTRICT | NOT EXPLICITLY SPECIFIED |
| inward_entry_items | purchase_order_item_id | purchase_order_items | id | NO | RESTRICT | NOT EXPLICITLY SPECIFIED |
| inward_entry_items | product_id | products | id | NO | RESTRICT | NOT EXPLICITLY SPECIFIED |
| markups | supplier_id | suppliers | id | NO | RESTRICT | NOT EXPLICITLY SPECIFIED |
| markups | buyer_id | buyers | id | NO | RESTRICT | NOT EXPLICITLY SPECIFIED |
| markups | created_by | users | id | YES | SET NULL | NOT EXPLICITLY SPECIFIED |
| markups | updated_by | users | id | YES | SET NULL | NOT EXPLICITLY SPECIFIED |
| order_confirmation_item_colours | order_confirmation_item_id | order_confirmation_items | id | NO | RESTRICT | NOT EXPLICITLY SPECIFIED |
| order_confirmation_item_sizes | order_confirmation_item_colour_id | order_confirmation_item_colours | id | NO | RESTRICT | NOT EXPLICITLY SPECIFIED |
| order_confirmation_items | order_confirmation_id | order_confirmations | id | NO | RESTRICT | NOT EXPLICITLY SPECIFIED |
| order_confirmation_items | product_id | products | id | NO | RESTRICT | NOT EXPLICITLY SPECIFIED |
| order_confirmation_items | supplier_id | suppliers | id | NO | RESTRICT | NOT EXPLICITLY SPECIFIED |
| order_confirmation_items | fob_value_id | fob_values | id | NO | RESTRICT | NOT EXPLICITLY SPECIFIED |
| order_confirmations | source_inquiry_id | inquiries | id | NO | RESTRICT | NOT EXPLICITLY SPECIFIED |
| order_confirmations | buyer_id | buyers | id | NO | RESTRICT | NOT EXPLICITLY SPECIFIED |
| order_confirmations | category_id | categories | id | NO | RESTRICT | NOT EXPLICITLY SPECIFIED |
| order_confirmations | document_format_id | document_formats | id | NO | RESTRICT | NOT EXPLICITLY SPECIFIED |
| order_confirmations | agent_id | agents | id | NO | RESTRICT | NOT EXPLICITLY SPECIFIED |
| order_confirmations | currency_id | currencies | id | NO | RESTRICT | NOT EXPLICITLY SPECIFIED |
| order_confirmations | created_by | users | id | YES | SET NULL | NOT EXPLICITLY SPECIFIED |
| order_confirmations | updated_by | users | id | YES | SET NULL | NOT EXPLICITLY SPECIFIED |
| ports | country_id | countries | id | NO | RESTRICT | NOT EXPLICITLY SPECIFIED |
| product_bom_items | product_id | products | id | NO | RESTRICT | NOT EXPLICITLY SPECIFIED |
| product_incentives | product_id | products | id | NO | RESTRICT | NOT EXPLICITLY SPECIFIED |
| product_incentives | calculation_basis_id | calculation_bases | id | NO | RESTRICT | NOT EXPLICITLY SPECIFIED |
| products | category_id | categories | id | NO | RESTRICT | NOT EXPLICITLY SPECIFIED |
| products | price_band_id | price_bands | id | NO | RESTRICT | NOT EXPLICITLY SPECIFIED |
| products | gst_rate_id | gst_rates | id | NO | RESTRICT | NOT EXPLICITLY SPECIFIED |
| products | created_by | users | id | YES | SET NULL | NOT EXPLICITLY SPECIFIED |
| products | updated_by | users | id | YES | SET NULL | NOT EXPLICITLY SPECIFIED |
| purchase_order_item_colours | purchase_order_item_id | purchase_order_items | id | NO | RESTRICT | NOT EXPLICITLY SPECIFIED |
| purchase_order_item_sizes | purchase_order_item_colour_id | purchase_order_item_colours | id | NO | RESTRICT | NOT EXPLICITLY SPECIFIED |
| purchase_order_items | purchase_order_id | purchase_orders | id | NO | RESTRICT | NOT EXPLICITLY SPECIFIED |
| purchase_order_items | order_confirmation_item_id | order_confirmation_items | id | NO | RESTRICT | NOT EXPLICITLY SPECIFIED |
| purchase_order_items | product_id | products | id | NO | RESTRICT | NOT EXPLICITLY SPECIFIED |
| purchase_order_timeline_entries | purchase_order_id | purchase_orders | id | NO | RESTRICT | NOT EXPLICITLY SPECIFIED |
| purchase_orders | order_confirmation_id | order_confirmations | id | NO | RESTRICT | NOT EXPLICITLY SPECIFIED |
| purchase_orders | supplier_id | suppliers | id | NO | RESTRICT | NOT EXPLICITLY SPECIFIED |
| purchase_orders | created_by | users | id | YES | SET NULL | NOT EXPLICITLY SPECIFIED |
| purchase_orders | updated_by | users | id | YES | SET NULL | NOT EXPLICITLY SPECIFIED |
| sessions | user_id | users | id | NO | RESTRICT | NOT EXPLICITLY SPECIFIED |
| states | country_id | countries | id | NO | RESTRICT | NOT EXPLICITLY SPECIFIED |
| supplier_buyer | supplier_id | suppliers | id | NO | RESTRICT | NOT EXPLICITLY SPECIFIED |
| supplier_buyer | buyer_id | buyers | id | NO | RESTRICT | NOT EXPLICITLY SPECIFIED |
| supplier_category | supplier_id | suppliers | id | NO | RESTRICT | NOT EXPLICITLY SPECIFIED |
| supplier_category | category_id | categories | id | NO | RESTRICT | NOT EXPLICITLY SPECIFIED |
| supplier_contacts | supplier_id | suppliers | id | NO | RESTRICT | NOT EXPLICITLY SPECIFIED |
| supplier_contacts | designation_id | designations | id | NO | RESTRICT | NOT EXPLICITLY SPECIFIED |
| supplier_product | supplier_id | suppliers | id | NO | RESTRICT | NOT EXPLICITLY SPECIFIED |
| supplier_product | product_id | products | id | NO | RESTRICT | NOT EXPLICITLY SPECIFIED |
| suppliers | supplier_type_id | supplier_types | id | NO | RESTRICT | NOT EXPLICITLY SPECIFIED |
| suppliers | country_id | countries | id | NO | RESTRICT | NOT EXPLICITLY SPECIFIED |
| suppliers | state_id | states | id | NO | RESTRICT | NOT EXPLICITLY SPECIFIED |
| suppliers | city_id | cities | id | NO | RESTRICT | NOT EXPLICITLY SPECIFIED |
| suppliers | agent_id | agents | id | NO | RESTRICT | NOT EXPLICITLY SPECIFIED |
| suppliers | created_by | users | id | YES | SET NULL | NOT EXPLICITLY SPECIFIED |
| suppliers | updated_by | users | id | YES | SET NULL | NOT EXPLICITLY SPECIFIED |
