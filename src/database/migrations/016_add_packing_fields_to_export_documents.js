export const up = async (connection) => {
  console.log('Running Migration 016: Add packing fields to export_documents and cartons');
  
  await connection.query(`
    ALTER TABLE export_documents 
    ADD COLUMN invoice_no VARCHAR(255) NULL AFTER doc_num,
    ADD COLUMN invoice_date DATE NULL AFTER invoice_no,
    ADD COLUMN exporter_ref VARCHAR(255) NULL AFTER invoice_date,
    ADD COLUMN buyer_ref_no VARCHAR(255) NULL AFTER exporter_ref,
    ADD COLUMN buyer_ref_date DATE NULL AFTER buyer_ref_no,
    ADD COLUMN other_reference VARCHAR(255) NULL AFTER buyer_ref_date,
    ADD COLUMN consignee_name VARCHAR(255) NULL AFTER other_reference,
    ADD COLUMN consignee_address TEXT NULL AFTER consignee_name,
    ADD COLUMN pre_carriage_by VARCHAR(255) NULL AFTER consignee_address,
    ADD COLUMN place_of_receipt VARCHAR(255) NULL AFTER pre_carriage_by,
    ADD COLUMN vessel_flight_no VARCHAR(255) NULL AFTER place_of_receipt,
    ADD COLUMN country_of_origin VARCHAR(255) DEFAULT 'INDIA' AFTER vessel_flight_no,
    ADD COLUMN forwarder_name VARCHAR(255) NULL AFTER remarks,
    ADD COLUMN forwarder_address TEXT NULL AFTER forwarder_name,
    ADD COLUMN vehicle_no VARCHAR(255) NULL AFTER forwarder_address,
    ADD COLUMN driver_cell VARCHAR(255) NULL AFTER vehicle_no,
    ADD COLUMN final_destination VARCHAR(255) NULL AFTER driver_cell,
    ADD COLUMN marks_and_numbers TEXT NULL AFTER final_destination,
    ADD COLUMN total_cartons INT UNSIGNED NULL AFTER marks_and_numbers,
    ADD COLUMN package_kind VARCHAR(255) DEFAULT 'CARTONS' AFTER total_cartons,
    ADD COLUMN freight_amount DECIMAL(14,2) NULL AFTER package_kind,
    ADD COLUMN insurance_amount DECIMAL(14,2) NULL AFTER freight_amount,
    ADD COLUMN gross_weight DECIMAL(12,3) NULL AFTER insurance_amount,
    ADD COLUMN net_weight DECIMAL(12,3) NULL AFTER gross_weight,
    ADD COLUMN carton_dimensions VARCHAR(255) NULL AFTER net_weight,
    ADD COLUMN booking_no VARCHAR(255) NULL AFTER carton_dimensions,
    ADD COLUMN bl_no VARCHAR(255) NULL AFTER booking_no,
    ADD COLUMN voyage_no VARCHAR(255) NULL AFTER bl_no,
    ADD COLUMN transshipment_port VARCHAR(255) NULL AFTER voyage_no,
    ADD COLUMN notify_party_name VARCHAR(255) NULL AFTER transshipment_port,
    ADD COLUMN notify_party_address TEXT NULL AFTER notify_party_name,
    ADD COLUMN goods_description TEXT NULL AFTER notify_party_address,
    ADD COLUMN total_measurement DECIMAL(12,3) NULL AFTER goods_description,
    ADD COLUMN ex_rate VARCHAR(255) NULL AFTER total_measurement,
    ADD COLUMN freight_terms VARCHAR(255) DEFAULT 'PREPAID' AFTER ex_rate,
    ADD COLUMN freight_prepaid_at VARCHAR(255) NULL AFTER freight_terms,
    ADD COLUMN freight_payable_at VARCHAR(255) NULL AFTER freight_prepaid_at,
    ADD COLUMN total_prepaid_in VARCHAR(255) NULL AFTER freight_payable_at,
    ADD COLUMN no_of_original_bls VARCHAR(255) NULL AFTER total_prepaid_in,
    ADD COLUMN bl_place_of_issue VARCHAR(255) DEFAULT 'MUMBAI' AFTER no_of_original_bls,
    ADD COLUMN bl_date_of_issue DATE NULL AFTER bl_place_of_issue;
  `);

  await connection.query(`
    ALTER TABLE export_document_cartons
    ADD COLUMN gross_weight DECIMAL(10,3) NULL AFTER net_weight,
    ADD COLUMN dimensions VARCHAR(60) NULL AFTER gross_weight;
  `);
};
