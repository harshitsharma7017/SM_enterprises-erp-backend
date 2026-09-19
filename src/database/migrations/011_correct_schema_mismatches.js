export async function up(connection) {
  console.log('--- Executing Migration 011: Correcting Schema Mismatches ---');

  // 1. Drop Phantom Foreign Keys
  await connection.query(`ALTER TABLE \`buyers\` DROP FOREIGN KEY \`buyers_city_id_foreign\`;`);
  await connection.query(`ALTER TABLE \`buyers\` DROP FOREIGN KEY \`buyers_contact_designation_id_foreign\`;`);
  await connection.query(`ALTER TABLE \`buyers\` DROP FOREIGN KEY \`buyers_state_id_foreign\`;`);
  await connection.query(`ALTER TABLE \`inquiries\` DROP FOREIGN KEY \`inquiries_source_id_foreign\`;`);
  await connection.query(`ALTER TABLE \`order_confirmation_items\` DROP FOREIGN KEY \`order_confirmation_items_export_document_id_foreign\`;`);
  await connection.query(`ALTER TABLE \`order_confirmation_items\` DROP FOREIGN KEY \`order_confirmation_items_purchase_order_id_foreign\`;`);
  await connection.query(`ALTER TABLE \`users\` DROP FOREIGN KEY \`users_created_by_foreign\`;`);

  // 2. Drop Phantom Columns
  await connection.query(`ALTER TABLE \`agents\` DROP COLUMN \`phone\`;`);
  await connection.query(`ALTER TABLE \`agents\` DROP COLUMN \`city\`;`);
  await connection.query(`ALTER TABLE \`agents\` DROP COLUMN \`address\`;`);
  await connection.query(`ALTER TABLE \`agents\` DROP COLUMN \`gst_number\`;`);
  await connection.query(`ALTER TABLE \`agents\` DROP COLUMN \`pan_number\`;`);
  await connection.query(`ALTER TABLE \`agents\` DROP COLUMN \`bank_name\`;`);
  await connection.query(`ALTER TABLE \`agents\` DROP COLUMN \`account_number\`;`);
  await connection.query(`ALTER TABLE \`agents\` DROP COLUMN \`ifsc_code\`;`);
  await connection.query(`ALTER TABLE \`agents\` DROP COLUMN \`swift_code\`;`);
  await connection.query(`ALTER TABLE \`agents\` DROP COLUMN \`payment_term_custom\`;`);
  await connection.query(`ALTER TABLE \`agents\` DROP COLUMN \`comments\`;`);
  await connection.query(`ALTER TABLE \`buyers\` DROP COLUMN \`state_id\`;`);
  await connection.query(`ALTER TABLE \`buyers\` DROP COLUMN \`city_id\`;`);
  await connection.query(`ALTER TABLE \`buyers\` DROP COLUMN \`advance_percent\`;`);
  await connection.query(`ALTER TABLE \`buyers\` DROP COLUMN \`sight_percent\`;`);
  await connection.query(`ALTER TABLE \`buyers\` DROP COLUMN \`shipment_method\`;`);
  await connection.query(`ALTER TABLE \`buyers\` DROP COLUMN \`comments\`;`);
  await connection.query(`ALTER TABLE \`buyers\` DROP COLUMN \`contact_designation_id\`;`);
  await connection.query(`ALTER TABLE \`document_format_columns\` DROP COLUMN \`is_mandatory\`;`);
  await connection.query(`ALTER TABLE \`document_format_columns\` DROP COLUMN \`sub_columns\`;`);
  await connection.query(`ALTER TABLE \`document_formats\` DROP COLUMN \`description\`;`);
  await connection.query(`ALTER TABLE \`document_formats\` DROP COLUMN \`allow_multiple_colours\`;`);
  await connection.query(`ALTER TABLE \`document_formats\` DROP COLUMN \`delivery_details\`;`);
  await connection.query(`ALTER TABLE \`document_formats\` DROP COLUMN \`packing_details\`;`);
  await connection.query(`ALTER TABLE \`document_formats\` DROP COLUMN \`deleted_at\`;`);
  await connection.query(`ALTER TABLE \`export_document_cartons\` DROP COLUMN \`gross_weight\`;`);
  await connection.query(`ALTER TABLE \`export_document_cartons\` DROP COLUMN \`dimensions\`;`);
  await connection.query(`ALTER TABLE \`export_documents\` DROP COLUMN \`invoice_no\`;`);
  await connection.query(`ALTER TABLE \`export_documents\` DROP COLUMN \`invoice_date\`;`);
  await connection.query(`ALTER TABLE \`export_documents\` DROP COLUMN \`exporter_ref\`;`);
  await connection.query(`ALTER TABLE \`export_documents\` DROP COLUMN \`forwarder_name\`;`);
  await connection.query(`ALTER TABLE \`export_documents\` DROP COLUMN \`forwarder_address\`;`);
  await connection.query(`ALTER TABLE \`export_documents\` DROP COLUMN \`vehicle_no\`;`);
  await connection.query(`ALTER TABLE \`export_documents\` DROP COLUMN \`driver_cell\`;`);
  await connection.query(`ALTER TABLE \`export_documents\` DROP COLUMN \`final_destination\`;`);
  await connection.query(`ALTER TABLE \`export_documents\` DROP COLUMN \`marks_and_numbers\`;`);
  await connection.query(`ALTER TABLE \`export_documents\` DROP COLUMN \`total_cartons\`;`);
  await connection.query(`ALTER TABLE \`export_documents\` DROP COLUMN \`package_kind\`;`);
  await connection.query(`ALTER TABLE \`export_documents\` DROP COLUMN \`freight_amount\`;`);
  await connection.query(`ALTER TABLE \`export_documents\` DROP COLUMN \`insurance_amount\`;`);
  await connection.query(`ALTER TABLE \`export_documents\` DROP COLUMN \`gross_weight\`;`);
  await connection.query(`ALTER TABLE \`export_documents\` DROP COLUMN \`buyer_ref_no\`;`);
  await connection.query(`ALTER TABLE \`export_documents\` DROP COLUMN \`buyer_ref_date\`;`);
  await connection.query(`ALTER TABLE \`export_documents\` DROP COLUMN \`other_reference\`;`);
  await connection.query(`ALTER TABLE \`export_documents\` DROP COLUMN \`consignee_name\`;`);
  await connection.query(`ALTER TABLE \`export_documents\` DROP COLUMN \`consignee_address\`;`);
  await connection.query(`ALTER TABLE \`export_documents\` DROP COLUMN \`pre_carriage_by\`;`);
  await connection.query(`ALTER TABLE \`export_documents\` DROP COLUMN \`place_of_receipt\`;`);
  await connection.query(`ALTER TABLE \`export_documents\` DROP COLUMN \`vessel_flight_no\`;`);
  await connection.query(`ALTER TABLE \`export_documents\` DROP COLUMN \`country_of_origin\`;`);
  await connection.query(`ALTER TABLE \`export_documents\` DROP COLUMN \`net_weight\`;`);
  await connection.query(`ALTER TABLE \`export_documents\` DROP COLUMN \`carton_dimensions\`;`);
  await connection.query(`ALTER TABLE \`export_documents\` DROP COLUMN \`booking_no\`;`);
  await connection.query(`ALTER TABLE \`export_documents\` DROP COLUMN \`bl_no\`;`);
  await connection.query(`ALTER TABLE \`export_documents\` DROP COLUMN \`voyage_no\`;`);
  await connection.query(`ALTER TABLE \`export_documents\` DROP COLUMN \`transshipment_port\`;`);
  await connection.query(`ALTER TABLE \`export_documents\` DROP COLUMN \`notify_party_name\`;`);
  await connection.query(`ALTER TABLE \`export_documents\` DROP COLUMN \`notify_party_address\`;`);
  await connection.query(`ALTER TABLE \`export_documents\` DROP COLUMN \`goods_description\`;`);
  await connection.query(`ALTER TABLE \`export_documents\` DROP COLUMN \`total_measurement\`;`);
  await connection.query(`ALTER TABLE \`export_documents\` DROP COLUMN \`ex_rate\`;`);
  await connection.query(`ALTER TABLE \`export_documents\` DROP COLUMN \`freight_terms\`;`);
  await connection.query(`ALTER TABLE \`export_documents\` DROP COLUMN \`freight_prepaid_at\`;`);
  await connection.query(`ALTER TABLE \`export_documents\` DROP COLUMN \`freight_payable_at\`;`);
  await connection.query(`ALTER TABLE \`export_documents\` DROP COLUMN \`total_prepaid_in\`;`);
  await connection.query(`ALTER TABLE \`export_documents\` DROP COLUMN \`no_of_original_bls\`;`);
  await connection.query(`ALTER TABLE \`export_documents\` DROP COLUMN \`bl_place_of_issue\`;`);
  await connection.query(`ALTER TABLE \`export_documents\` DROP COLUMN \`bl_date_of_issue\`;`);
  await connection.query(`ALTER TABLE \`inquiries\` DROP COLUMN \`source_id\`;`);
  await connection.query(`ALTER TABLE \`inquiry_items\` DROP COLUMN \`custom_values\`;`);
  await connection.query(`ALTER TABLE \`inquiry_items\` DROP COLUMN \`cost_price\`;`);
  await connection.query(`ALTER TABLE \`order_confirmation_items\` DROP COLUMN \`raised_at\`;`);
  await connection.query(`ALTER TABLE \`order_confirmation_items\` DROP COLUMN \`shipped_at\`;`);
  await connection.query(`ALTER TABLE \`order_confirmation_items\` DROP COLUMN \`purchase_order_id\`;`);
  await connection.query(`ALTER TABLE \`order_confirmation_items\` DROP COLUMN \`export_document_id\`;`);
  await connection.query(`ALTER TABLE \`payment_terms\` DROP COLUMN \`has_split\`;`);
  await connection.query(`ALTER TABLE \`products\` DROP COLUMN \`comments\`;`);
  await connection.query(`ALTER TABLE \`suppliers\` DROP COLUMN \`comments\`;`);
  await connection.query(`ALTER TABLE \`suppliers\` DROP COLUMN \`client_details\`;`);
  await connection.query(`ALTER TABLE \`users\` DROP COLUMN \`phone\`;`);
  await connection.query(`ALTER TABLE \`users\` DROP COLUMN \`status\`;`);
  await connection.query(`ALTER TABLE \`users\` DROP COLUMN \`created_by\`;`);

  // 3. Add Missing Tables
  await connection.query(`CREATE TABLE \`buyer_shipment_method\` (
    \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    \`buyer_id\` BIGINT UNSIGNED NOT NULL,
    \`shipment_method_id\` BIGINT UNSIGNED NOT NULL,
    \`created_at\` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    \`updated_at\` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);

  // 4. Add Missing Columns
  await connection.query(`ALTER TABLE \`agents\` ADD COLUMN \`commission_rate\` DECIMAL(15, 2);`);
  await connection.query(`ALTER TABLE \`buyers\` ADD COLUMN \`city\` VARCHAR(255);`);
  await connection.query(`ALTER TABLE \`buyers\` ADD COLUMN \`state\` VARCHAR(255);`);
  await connection.query(`ALTER TABLE \`buyers\` ADD COLUMN \`shipment_method_id\` BIGINT UNSIGNED;`);
  await connection.query(`ALTER TABLE \`categories\` ADD COLUMN \`po_format_id\` BIGINT UNSIGNED;`);
  await connection.query(`ALTER TABLE \`default_markups\` ADD COLUMN \`remarks\` TEXT;`);
  await connection.query(`ALTER TABLE \`default_markups\` ADD COLUMN \`created_by\` BIGINT UNSIGNED;`);
  await connection.query(`ALTER TABLE \`default_markups\` ADD COLUMN \`updated_by\` BIGINT UNSIGNED;`);
  await connection.query(`ALTER TABLE \`default_markups\` ADD COLUMN \`deleted_at\` TIMESTAMP NULL;`);
  await connection.query(`ALTER TABLE \`inquiries\` ADD COLUMN \`source\` VARCHAR(255);`);
  await connection.query(`ALTER TABLE \`inquiries\` ADD COLUMN \`status\` ENUM('active','inactive') NOT NULL DEFAULT 'active';`);
  await connection.query(`ALTER TABLE \`inquiry_items\` ADD COLUMN \`status\` ENUM('active','inactive') NOT NULL DEFAULT 'active';`);
  await connection.query(`ALTER TABLE \`products\` ADD COLUMN \`sq_mtr_per_unit\` DECIMAL(15, 2);`);
  await connection.query(`ALTER TABLE \`suppliers\` ADD COLUMN \`default_delivery_mode\` VARCHAR(255);`);

  // 5. Add Missing Foreign Keys
  await connection.query(`ALTER TABLE \`buyers\` ADD CONSTRAINT \`buyers_shipment_method_id_foreign\` FOREIGN KEY (\`shipment_method_id\`) REFERENCES \`shipment_methods\` (\`id\`) ON DELETE RESTRICT;`);
  await connection.query(`ALTER TABLE \`default_markups\` ADD CONSTRAINT \`default_markups_created_by_foreign\` FOREIGN KEY (\`created_by\`) REFERENCES \`users\` (\`id\`) ON DELETE SET NULL;`);
  await connection.query(`ALTER TABLE \`default_markups\` ADD CONSTRAINT \`default_markups_updated_by_foreign\` FOREIGN KEY (\`updated_by\`) REFERENCES \`users\` (\`id\`) ON DELETE SET NULL;`);
  await connection.query(`ALTER TABLE \`buyer_shipment_method\` ADD CONSTRAINT \`buyer_shipment_method_buyer_id_foreign\` FOREIGN KEY (\`buyer_id\`) REFERENCES \`buyers\` (\`id\`) ON DELETE CASCADE;`);
  await connection.query(`ALTER TABLE \`buyer_shipment_method\` ADD CONSTRAINT \`bsm_shipment_method_id_foreign\` FOREIGN KEY (\`shipment_method_id\`) REFERENCES \`shipment_methods\` (\`id\`) ON DELETE CASCADE;`);
}

export async function down(connection) {
  console.log('--- Reverting Migration 011 ---');
  console.log('Not implemented for this corrective migration.');
}
