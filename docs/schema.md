# Entities and Database Schema

## Table: `agent_category`
| Column | Type |
|---|---|
| `agent_id` | `foreignId` |
| `category_id` | `foreignId` |

## Table: `agent_commissions`
| Column | Type |
|---|---|
| `id` | `id` |
| `agent_id` | `foreignId` |
| `commission_type` | `enum` |
| `amount` | `decimal` |
| `currency_id` | `foreignId` |
| `sort_order` | `tinyInteger` |
| `created_at` | `timestamp` |
| `updated_at` | `timestamp` |

## Table: `agents`
| Column | Type |
|---|---|
| `id` | `id` |
| `agent_type` | `index` |
| `name` | `string` |
| `display_code` | `string` |
| `calculation_basis_id` | `foreignId` |
| `commission_rate` | `decimal` |
| `status` | `index` |
| `remarks` | `text` |
| `created_by` | `foreignId` |
| `updated_by` | `foreignId` |
| `created_at` | `timestamp` |
| `updated_at` | `timestamp` |
| `deleted_at` | `timestamp` |

## Table: `buyer_carton_markings`
| Column | Type |
|---|---|
| `id` | `id` |
| `buyer_id` | `foreignId` |
| `line_no` | `tinyInteger` |
| `label` | `string` |
| `value` | `string` |
| `is_required` | `boolean` |
| `created_at` | `timestamp` |
| `updated_at` | `timestamp` |

## Table: `buyer_category`
| Column | Type |
|---|---|
| `id` | `id` |
| `buyer_id` | `foreignId` |
| `category_id` | `foreignId` |

## Table: `buyer_contacts`
| Column | Type |
|---|---|
| `id` | `id` |
| `buyer_id` | `index` |
| `name` | `string` |
| `designation_id` | `foreignId` |
| `mobile` | `string` |
| `email` | `string` |
| `created_at` | `timestamp` |
| `updated_at` | `timestamp` |

## Table: `buyer_shipment_method`
| Column | Type |
|---|---|
| `id` | `id` |
| `buyer_id` | `foreignId` |
| `shipment_method_id` | `foreignId` |

## Table: `buyers`
| Column | Type |
|---|---|
| `id` | `id` |
| `display_code` | `string` |
| `company_name` | `index` |
| `name_on_export_invoice` | `string` |
| `contact_person` | `string` |
| `email` | `string` |
| `mobile` | `string` |
| `gst_vat_no` | `string` |
| `address` | `string` |
| `city` | `string` |
| `state` | `string` |
| `country_id` | `foreignId` |
| `pincode` | `string` |
| `port_id` | `foreignId` |
| `agent_id` | `foreignId` |
| `agent_commission_type` | `enum` |
| `agent_commission_value` | `decimal` |
| `payment_term_id` | `foreignId` |
| `incoterm_id` | `foreignId` |
| `shipment_method_id` | `foreignId` |
| `currency_id` | `foreignId` |
| `bank_name` | `string` |
| `account_number` | `string` |
| `swift_code` | `string` |
| `status` | `index` |
| `remarks` | `text` |
| `created_by` | `foreignId` |
| `updated_by` | `foreignId` |
| `created_at` | `timestamp` |
| `updated_at` | `timestamp` |
| `deleted_at` | `timestamp` |

## Table: `cache`
| Column | Type |
|---|---|
| `key` | `string` |
| `value` | `mediumText` |
| `expiration` | `integer` |

## Table: `cache_locks`
| Column | Type |
|---|---|
| `key` | `string` |
| `owner` | `string` |
| `expiration` | `integer` |

## Table: `calculation_bases`
| Column | Type |
|---|---|
| `id` | `id` |
| `name` | `string` |
| `status` | `enum` |
| `created_at` | `timestamp` |
| `updated_at` | `timestamp` |

## Table: `categories`
| Column | Type |
|---|---|
| `id` | `id` |
| `code` | `string` |
| `name` | `string` |
| `description` | `text` |
| `po_format_id` | `foreignId` |
| `status` | `index` |
| `remarks` | `text` |
| `created_by` | `foreignId` |
| `updated_by` | `foreignId` |
| `created_at` | `timestamp` |
| `updated_at` | `timestamp` |
| `deleted_at` | `timestamp` |

## Table: `category_format`
| Column | Type |
|---|---|
| `id` | `id` |
| `category_id` | `foreignId` |
| `document_format_id` | `foreignId` |

## Table: `cities`
| Column | Type |
|---|---|
| `id` | `id` |
| `state_id` | `foreignId` |
| `name` | `string` |
| `status` | `enum` |
| `created_at` | `timestamp` |
| `updated_at` | `timestamp` |

## Table: `company_profile`
| Column | Type |
|---|---|
| `id` | `id` |
| `company_name` | `string` |
| `tagline` | `string` |
| `address` | `text` |
| `phone` | `string` |
| `email` | `string` |
| `gstin` | `string` |
| `iec_code` | `string` |
| `bank_name` | `string` |
| `bank_account_number` | `string` |
| `bank_ifsc` | `string` |
| `bank_swift` | `string` |
| `signatory_name` | `string` |
| `signatory_designation` | `string` |
| `logo_path` | `string` |
| `created_at` | `timestamp` |
| `updated_at` | `timestamp` |

## Table: `container_export_document`
| Column | Type |
|---|---|
| `container_id` | `foreignId` |
| `export_document_id` | `foreignId` |

## Table: `containers`
| Column | Type |
|---|---|
| `id` | `id` |
| `container_no` | `string` |
| `seal_no` | `string` |
| `type` | `enum` |
| `remarks` | `text` |
| `created_at` | `timestamp` |
| `updated_at` | `timestamp` |

## Table: `countries`
| Column | Type |
|---|---|
| `id` | `id` |
| `iso_code` | `char` |
| `name` | `string` |
| `dial_code` | `string` |
| `status` | `enum` |
| `created_at` | `timestamp` |
| `updated_at` | `timestamp` |

## Table: `currencies`
| Column | Type |
|---|---|
| `id` | `id` |
| `iso_code` | `char` |
| `name` | `string` |
| `symbol` | `string` |
| `status` | `enum` |
| `created_at` | `timestamp` |
| `updated_at` | `timestamp` |

## Table: `default_markups`
| Column | Type |
|---|---|
| `id` | `id` |
| `name` | `string` |
| `markup_percent` | `decimal` |
| `status` | `enum` |
| `remarks` | `text` |
| `created_by` | `foreignId` |
| `updated_by` | `foreignId` |
| `created_at` | `timestamp` |
| `updated_at` | `timestamp` |
| `deleted_at` | `timestamp` |

## Table: `designations`
| Column | Type |
|---|---|
| `id` | `id` |
| `name` | `string` |
| `status` | `enum` |
| `created_at` | `timestamp` |
| `updated_at` | `timestamp` |

## Table: `document_checklist_types`
| Column | Type |
|---|---|
| `id` | `id` |
| `code` | `string` |
| `name` | `string` |
| `description` | `text` |
| `category` | `enum` |
| `variant_labels` | `json` |
| `closes_shipment` | `boolean` |
| `sort_order` | `unsignedInteger` |
| `status` | `enum` |
| `created_at` | `timestamp` |
| `updated_at` | `timestamp` |

## Table: `document_format_columns`
| Column | Type |
|---|---|
| `id` | `id` |
| `document_format_id` | `foreignId` |
| `key` | `string` |
| `label` | `string` |
| `is_enabled` | `boolean` |
| `is_custom` | `boolean` |
| `print_only` | `boolean` |
| `sort_order` | `tinyInteger` |

## Table: `document_format_images`
| Column | Type |
|---|---|
| `id` | `id` |
| `document_format_id` | `foreignId` |
| `path` | `string` |
| `original_name` | `string` |
| `sort_order` | `tinyInteger` |
| `created_at` | `timestamp` |
| `updated_at` | `timestamp` |

## Table: `document_format_units`
| Column | Type |
|---|---|
| `id` | `id` |
| `document_format_id` | `foreignId` |
| `name` | `string` |
| `sort_order` | `tinyInteger` |

## Table: `document_formats`
| Column | Type |
|---|---|
| `id` | `id` |
| `name` | `string` |
| `module` | `string` |
| `blade_view` | `string` |
| `status` | `enum` |
| `created_at` | `timestamp` |
| `updated_at` | `timestamp` |

## Table: `export_document_carton_lines`
| Column | Type |
|---|---|
| `id` | `id` |
| `export_document_carton_id` | `foreignId` |
| `description` | `text` |
| `unit` | `string` |
| `qty` | `unsignedInteger` |
| `sort_order` | `unsignedInteger` |
| `created_at` | `timestamp` |
| `updated_at` | `timestamp` |

## Table: `export_document_cartons`
| Column | Type |
|---|---|
| `id` | `id` |
| `export_document_id` | `foreignId` |
| `carton_no` | `string` |
| `net_weight` | `decimal` |
| `sort_order` | `unsignedInteger` |
| `created_at` | `timestamp` |
| `updated_at` | `timestamp` |

## Table: `export_document_checklists`
| Column | Type |
|---|---|
| `id` | `id` |
| `export_document_id` | `foreignId` |
| `document_checklist_type_id` | `foreignId` |
| `variant_code` | `string` |
| `status` | `string` |
| `file_path` | `string` |
| `original_name` | `string` |
| `uploaded_at` | `timestamp` |
| `generated_at` | `timestamp` |
| `reference_no` | `string` |
| `amount` | `decimal` |
| `remarks` | `text` |
| `created_by` | `foreignId` |
| `updated_by` | `foreignId` |
| `created_at` | `timestamp` |
| `updated_at` | `timestamp` |

## Table: `export_document_item_colours`
| Column | Type |
|---|---|
| `id` | `id` |
| `export_document_item_id` | `foreignId` |
| `colour` | `string` |
| `sort_order` | `unsignedInteger` |

## Table: `export_document_item_sizes`
| Column | Type |
|---|---|
| `id` | `id` |
| `export_document_item_colour_id` | `foreignId` |
| `size` | `string` |
| `qty` | `unsignedInteger` |
| `sort_order` | `unsignedInteger` |

## Table: `export_document_items`
| Column | Type |
|---|---|
| `id` | `id` |
| `export_document_id` | `foreignId` |
| `order_confirmation_item_id` | `foreignId` |
| `sort_order` | `unsignedInteger` |
| `design_no` | `string` |
| `description` | `text` |
| `product_id` | `foreignId` |
| `unit` | `string` |
| `price` | `decimal` |
| `qty` | `unsignedInteger` |
| `amount` | `decimal` |
| `remarks` | `text` |
| `custom_values` | `json` |

## Table: `export_documents`
| Column | Type |
|---|---|
| `id` | `id` |
| `doc_num` | `string` |
| `financial_year` | `index` |
| `order_confirmation_id` | `foreignId` |
| `buyer_id` | `foreignId` |
| `currency_id` | `foreignId` |
| `incoterm_id` | `foreignId` |
| `port_of_loading_id` | `foreignId` |
| `port_of_discharge_id` | `foreignId` |
| `shipment_method_id` | `foreignId` |
| `shipment_date` | `date` |
| `status` | `index` |
| `remarks` | `text` |
| `created_by` | `foreignId` |
| `updated_by` | `foreignId` |
| `created_at` | `timestamp` |
| `updated_at` | `timestamp` |
| `deleted_at` | `timestamp` |

## Table: `failed_jobs`
| Column | Type |
|---|---|
| `id` | `id` |
| `uuid` | `string` |
| `connection` | `text` |
| `queue` | `text` |
| `payload` | `longText` |
| `exception` | `longText` |
| `failed_at` | `timestamp` |

## Table: `fob_values`
| Column | Type |
|---|---|
| `id` | `id` |
| `name` | `string` |
| `status` | `index` |
| `remarks` | `text` |
| `created_by` | `foreignId` |
| `updated_by` | `foreignId` |
| `created_at` | `timestamp` |
| `updated_at` | `timestamp` |
| `deleted_at` | `timestamp` |

## Table: `gst_rates`
| Column | Type |
|---|---|
| `id` | `id` |
| `rate` | `decimal` |
| `status` | `enum` |
| `created_at` | `timestamp` |
| `updated_at` | `timestamp` |

## Table: `incoterms`
| Column | Type |
|---|---|
| `id` | `id` |
| `code` | `string` |
| `name` | `string` |
| `description` | `string` |
| `status` | `enum` |
| `created_at` | `timestamp` |
| `updated_at` | `timestamp` |

## Table: `inquiries`
| Column | Type |
|---|---|
| `id` | `id` |
| `inquiry_no` | `string` |
| `financial_year` | `index` |
| `inquiry_date` | `date` |
| `buyer_ref` | `string` |
| `source` | `string` |
| `buyer_id` | `foreignId` |
| `category_id` | `foreignId` |
| `document_format_id` | `foreignId` |
| `agent_id` | `foreignId` |
| `agent_commission_type` | `enum` |
| `agent_commission_value` | `decimal` |
| `currency_id` | `foreignId` |
| `exchange_rate` | `decimal` |
| `expected_shipment_date` | `date` |
| `delivery_details` | `text` |
| `packing_details` | `text` |
| `remarks` | `text` |
| `status` | `index` |
| `converted_at` | `timestamp` |
| `created_by` | `foreignId` |
| `updated_by` | `foreignId` |
| `created_at` | `timestamp` |
| `updated_at` | `timestamp` |
| `deleted_at` | `timestamp` |

## Table: `inquiry_follow_ups`
| Column | Type |
|---|---|
| `id` | `id` |
| `inquiry_id` | `foreignId` |
| `follow_up_date` | `date` |
| `comment` | `text` |
| `created_by` | `foreignId` |
| `created_at` | `timestamp` |

## Table: `inquiry_item_bom_lines`
| Column | Type |
|---|---|
| `id` | `id` |
| `inquiry_item_id` | `foreignId` |
| `sort_order` | `unsignedInteger` |
| `component_name` | `string` |
| `qty` | `decimal` |
| `unit` | `string` |
| `is_custom` | `boolean` |
| `remarks` | `string` |

## Table: `inquiry_item_colours`
| Column | Type |
|---|---|
| `id` | `id` |
| `inquiry_item_id` | `foreignId` |
| `colour` | `string` |
| `sort_order` | `unsignedInteger` |

## Table: `inquiry_item_sizes`
| Column | Type |
|---|---|
| `id` | `id` |
| `inquiry_item_colour_id` | `foreignId` |
| `size` | `string` |
| `qty` | `unsignedInteger` |
| `sort_order` | `unsignedInteger` |

## Table: `inquiry_items`
| Column | Type |
|---|---|
| `id` | `id` |
| `inquiry_id` | `foreignId` |
| `sort_order` | `unsignedInteger` |
| `design_no` | `string` |
| `description` | `text` |
| `product_id` | `foreignId` |
| `supplier_id` | `foreignId` |
| `unit` | `string` |
| `fob_value_id` | `foreignId` |
| `price` | `decimal` |
| `qty` | `unsignedInteger` |
| `amount` | `decimal` |
| `status` | `index` |
| `remarks` | `text` |

## Table: `inquiry_sources`
| Column | Type |
|---|---|
| `id` | `id` |
| `name` | `string` |
| `status` | `enum` |
| `created_at` | `timestamp` |
| `updated_at` | `timestamp` |

## Table: `inward_entries`
| Column | Type |
|---|---|
| `id` | `id` |
| `inward_no` | `string` |
| `financial_year` | `index` |
| `inward_date` | `index` |
| `purchase_order_id` | `foreignId` |
| `supplier_id` | `foreignId` |
| `challan_no` | `string` |
| `challan_date` | `date` |
| `remarks` | `text` |
| `status` | `index` |
| `qc_inspected_at` | `timestamp` |
| `qc_inspected_by` | `foreignId` |
| `created_by` | `foreignId` |
| `updated_by` | `foreignId` |
| `created_at` | `timestamp` |
| `updated_at` | `timestamp` |
| `deleted_at` | `timestamp` |

## Table: `inward_entry_items`
| Column | Type |
|---|---|
| `id` | `id` |
| `inward_entry_id` | `foreignId` |
| `purchase_order_item_id` | `foreignId` |
| `product_id` | `foreignId` |
| `sort_order` | `unsignedInteger` |
| `description` | `text` |
| `unit` | `string` |
| `ordered_qty` | `unsignedInteger` |
| `received_qty` | `unsignedInteger` |
| `passed_qty` | `unsignedInteger` |
| `rejected_qty` | `unsignedInteger` |
| `remarks` | `text` |
| `qc_remarks` | `text` |

## Table: `job_batches`
| Column | Type |
|---|---|
| `id` | `string` |
| `name` | `string` |
| `total_jobs` | `integer` |
| `pending_jobs` | `integer` |
| `failed_jobs` | `integer` |
| `failed_job_ids` | `longText` |
| `options` | `mediumText` |
| `cancelled_at` | `integer` |
| `created_at` | `integer` |
| `finished_at` | `integer` |

## Table: `jobs`
| Column | Type |
|---|---|
| `id` | `id` |
| `queue` | `string` |
| `payload` | `longText` |
| `attempts` | `unsignedTinyInteger` |
| `reserved_at` | `unsignedInteger` |
| `available_at` | `unsignedInteger` |
| `created_at` | `unsignedInteger` |

## Table: `markups`
| Column | Type |
|---|---|
| `id` | `id` |
| `supplier_id` | `foreignId` |
| `buyer_id` | `foreignId` |
| `record_date` | `date` |
| `markup_percent` | `decimal` |
| `status` | `enum` |
| `remarks` | `text` |
| `created_by` | `foreignId` |
| `updated_by` | `foreignId` |
| `created_at` | `timestamp` |
| `updated_at` | `timestamp` |
| `deleted_at` | `timestamp` |

## Table: `number_series`
| Column | Type |
|---|---|
| `id` | `id` |
| `module` | `string` |
| `prefix` | `string` |
| `financial_year` | `string` |
| `current_number` | `unsignedBigInteger` |
| `padding` | `unsignedTinyInteger` |
| `reset_yearly` | `boolean` |
| `created_at` | `timestamp` |
| `updated_at` | `timestamp` |

## Table: `order_confirmation_item_colours`
| Column | Type |
|---|---|
| `id` | `id` |
| `order_confirmation_item_id` | `foreignId` |
| `colour` | `string` |
| `sort_order` | `unsignedInteger` |

## Table: `order_confirmation_item_sizes`
| Column | Type |
|---|---|
| `id` | `id` |
| `order_confirmation_item_colour_id` | `foreignId` |
| `size` | `string` |
| `qty` | `unsignedInteger` |
| `sort_order` | `unsignedInteger` |

## Table: `order_confirmation_items`
| Column | Type |
|---|---|
| `id` | `id` |
| `order_confirmation_id` | `foreignId` |
| `sort_order` | `unsignedInteger` |
| `design_no` | `string` |
| `description` | `text` |
| `product_id` | `foreignId` |
| `supplier_id` | `foreignId` |
| `unit` | `string` |
| `fob_value_id` | `foreignId` |
| `price` | `decimal` |
| `cost_price` | `decimal` |
| `qty` | `unsignedInteger` |
| `amount` | `decimal` |
| `remarks` | `text` |
| `custom_values` | `json` |

## Table: `order_confirmations`
| Column | Type |
|---|---|
| `id` | `id` |
| `oc_num` | `string` |
| `financial_year` | `index` |
| `mode` | `enum` |
| `oc_date` | `date` |
| `buyer_ref` | `string` |
| `source_inquiry_id` | `foreignId` |
| `buyer_id` | `foreignId` |
| `category_id` | `foreignId` |
| `document_format_id` | `foreignId` |
| `agent_id` | `foreignId` |
| `agent_commission_type` | `enum` |
| `agent_commission_value` | `decimal` |
| `currency_id` | `foreignId` |
| `incoterm` | `string` |
| `ship_method` | `string` |
| `shipment_date` | `string` |
| `pol` | `string` |
| `pod` | `string` |
| `payment_terms` | `string` |
| `delivery_details` | `text` |
| `packing_details` | `text` |
| `remarks` | `text` |
| `status` | `index` |
| `created_by` | `foreignId` |
| `updated_by` | `foreignId` |
| `created_at` | `timestamp` |
| `updated_at` | `timestamp` |
| `deleted_at` | `timestamp` |

## Table: `password_reset_tokens`
| Column | Type |
|---|---|
| `email` | `string` |
| `token` | `string` |
| `created_at` | `timestamp` |

## Table: `payment_terms`
| Column | Type |
|---|---|
| `id` | `id` |
| `name` | `string` |
| `days` | `smallInteger` |
| `applies_to` | `enum` |
| `status` | `enum` |
| `created_at` | `timestamp` |
| `updated_at` | `timestamp` |

## Table: `ports`
| Column | Type |
|---|---|
| `id` | `id` |
| `country_id` | `foreignId` |
| `code` | `string` |
| `name` | `string` |
| `type` | `enum` |
| `status` | `enum` |
| `created_at` | `timestamp` |
| `updated_at` | `timestamp` |

## Table: `price_bands`
| Column | Type |
|---|---|
| `id` | `id` |
| `code` | `string` |
| `name` | `string` |
| `status` | `enum` |
| `created_at` | `timestamp` |
| `updated_at` | `timestamp` |

## Table: `product_bom_items`
| Column | Type |
|---|---|
| `id` | `id` |
| `product_id` | `foreignId` |
| `sort_order` | `unsignedInteger` |
| `component_name` | `string` |
| `qty` | `decimal` |
| `unit` | `string` |
| `is_custom` | `boolean` |
| `remarks` | `string` |
| `created_at` | `timestamp` |
| `updated_at` | `timestamp` |

## Table: `product_incentives`
| Column | Type |
|---|---|
| `id` | `id` |
| `product_id` | `foreignId` |
| `scheme` | `enum` |
| `percent_1` | `decimal` |
| `percent_2` | `decimal` |
| `cap_value` | `decimal` |
| `calculation_basis_id` | `foreignId` |
| `created_at` | `timestamp` |
| `updated_at` | `timestamp` |

## Table: `products`
| Column | Type |
|---|---|
| `id` | `id` |
| `category_id` | `foreignId` |
| `item_group_code` | `string` |
| `name` | `string` |
| `name_on_export_document` | `string` |
| `barcode` | `string` |
| `unit_po` | `string` |
| `unit_export` | `string` |
| `hsn_code` | `string` |
| `drawback_sr_no` | `string` |
| `price_band_id` | `foreignId` |
| `gst_rate_id` | `foreignId` |
| `fabric_length_mtr` | `decimal` |
| `fabric_width_inch` | `decimal` |
| `sq_mtr_per_unit` | `decimal` |
| `description` | `text` |
| `status` | `enum` |
| `remarks` | `text` |
| `created_by` | `foreignId` |
| `updated_by` | `foreignId` |
| `created_at` | `timestamp` |
| `updated_at` | `timestamp` |
| `deleted_at` | `timestamp` |

## Table: `purchase_order_item_colours`
| Column | Type |
|---|---|
| `id` | `id` |
| `purchase_order_item_id` | `foreignId` |
| `colour` | `string` |
| `sort_order` | `unsignedInteger` |

## Table: `purchase_order_item_sizes`
| Column | Type |
|---|---|
| `id` | `id` |
| `purchase_order_item_colour_id` | `foreignId` |
| `size` | `string` |
| `qty` | `unsignedInteger` |
| `sort_order` | `unsignedInteger` |

## Table: `purchase_order_items`
| Column | Type |
|---|---|
| `id` | `id` |
| `purchase_order_id` | `foreignId` |
| `order_confirmation_item_id` | `foreignId` |
| `sort_order` | `unsignedInteger` |
| `design_no` | `string` |
| `description` | `text` |
| `product_id` | `foreignId` |
| `unit` | `string` |
| `cost_price` | `decimal` |
| `qty` | `unsignedInteger` |
| `amount` | `decimal` |
| `remarks` | `text` |
| `custom_values` | `json` |

## Table: `purchase_order_timeline_entries`
| Column | Type |
|---|---|
| `id` | `id` |
| `purchase_order_id` | `foreignId` |
| `entry_date` | `date` |
| `note` | `string` |
| `qty` | `unsignedInteger` |
| `sort_order` | `unsignedInteger` |

## Table: `purchase_orders`
| Column | Type |
|---|---|
| `id` | `id` |
| `po_num` | `string` |
| `financial_year` | `index` |
| `order_confirmation_id` | `foreignId` |
| `supplier_id` | `foreignId` |
| `po_date` | `date` |
| `dispatch_date` | `date` |
| `delivery_details` | `text` |
| `packing_details` | `text` |
| `remarks` | `text` |
| `status` | `index` |
| `created_by` | `foreignId` |
| `updated_by` | `foreignId` |
| `created_at` | `timestamp` |
| `updated_at` | `timestamp` |
| `deleted_at` | `timestamp` |

## Table: `sessions`
| Column | Type |
|---|---|
| `id` | `string` |
| `user_id` | `foreignId` |
| `ip_address` | `string` |
| `user_agent` | `text` |
| `payload` | `longText` |
| `last_activity` | `integer` |

## Table: `shipment_methods`
| Column | Type |
|---|---|
| `id` | `id` |
| `name` | `string` |
| `status` | `enum` |
| `created_at` | `timestamp` |
| `updated_at` | `timestamp` |

## Table: `states`
| Column | Type |
|---|---|
| `id` | `id` |
| `country_id` | `foreignId` |
| `name` | `string` |
| `code` | `string` |
| `status` | `enum` |
| `created_at` | `timestamp` |
| `updated_at` | `timestamp` |

## Table: `supplier_buyer`
| Column | Type |
|---|---|
| `id` | `id` |
| `supplier_id` | `foreignId` |
| `buyer_id` | `foreignId` |

## Table: `supplier_category`
| Column | Type |
|---|---|
| `id` | `id` |
| `supplier_id` | `foreignId` |
| `category_id` | `foreignId` |

## Table: `supplier_contacts`
| Column | Type |
|---|---|
| `id` | `id` |
| `supplier_id` | `foreignId` |
| `name` | `string` |
| `designation_id` | `foreignId` |
| `mobile` | `string` |
| `email` | `string` |
| `is_primary` | `boolean` |
| `created_at` | `timestamp` |
| `updated_at` | `timestamp` |

## Table: `supplier_product`
| Column | Type |
|---|---|
| `id` | `id` |
| `supplier_id` | `foreignId` |
| `product_id` | `foreignId` |

## Table: `supplier_types`
| Column | Type |
|---|---|
| `id` | `id` |
| `code` | `string` |
| `name` | `string` |
| `is_registered` | `boolean` |
| `status` | `enum` |
| `created_at` | `timestamp` |
| `updated_at` | `timestamp` |

## Table: `suppliers`
| Column | Type |
|---|---|
| `id` | `id` |
| `display_code` | `string` |
| `party_type` | `enum` |
| `company_name` | `index` |
| `name_on_bill` | `string` |
| `supplier_type_id` | `foreignId` |
| `gst_number` | `string` |
| `pan_number` | `string` |
| `is_msme` | `boolean` |
| `msme_registration_no` | `string` |
| `address` | `string` |
| `country_id` | `foreignId` |
| `state_id` | `foreignId` |
| `city_id` | `foreignId` |
| `pincode` | `string` |
| `discount_percent` | `decimal` |
| `credit_days` | `smallInteger` |
| `bank_name` | `string` |
| `account_number` | `string` |
| `ifsc_code` | `string` |
| `agent_id` | `foreignId` |
| `agent_commission_type` | `enum` |
| `agent_commission_value` | `decimal` |
| `we_supply_material` | `boolean` |
| `requires_sample_approval` | `boolean` |
| `default_delivery_mode` | `enum` |
| `status` | `enum` |
| `remarks` | `text` |
| `created_by` | `foreignId` |
| `updated_by` | `foreignId` |
| `created_at` | `timestamp` |
| `updated_at` | `timestamp` |
| `deleted_at` | `timestamp` |

## Table: `users`
| Column | Type |
|---|---|
| `id` | `id` |
| `name` | `string` |
| `email` | `string` |
| `email_verified_at` | `timestamp` |
| `password` | `string` |
| `created_at` | `timestamp` |
| `updated_at` | `timestamp` |

