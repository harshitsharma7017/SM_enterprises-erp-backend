/**
 * Quality control + supplier return + debit note foundation.
 *
 * The legacy header-level QC on inward_entries (status pending/approved/
 * rejected, integer passed_qty/rejected_qty per line) stays untouched as
 * history of the old inward flow. GRN material is inspected per LOT here.
 *
 * quality_inspections (QC)
 *   One inspection of (part of) one received lot. Several inspections may
 *   exist per lot (history is kept: a re-inspection cancels the earlier one),
 *   but the inspected quantity of non-cancelled inspections never exceeds the
 *   lot quantity. accepted + rejected = inspected on completion;
 *   return_quantity is the quantity QC marks for return (<= rejected).
 *   status: draft (pending) → completed, or cancelled. `result` is derived
 *   from the quantities on completion: accepted / partially_accepted / rejected.
 *   Shade, edge-to-edge shade and weaving defects are free-text capture — the
 *   client has not supplied grades or tolerances.
 *
 * supplier_returns
 *   Explicit return of rejected material from one completed QC.
 *   draft → posted, or cancelled. Non-cancelled returns of a QC never exceed
 *   its rejected quantity.
 *
 * debit_notes
 *   A real debit note against the supplier for rejected material of one QC,
 *   optionally through one posted return. draft → posted, or cancelled.
 *   Non-cancelled notes never exceed the QC's rejected quantity (or the
 *   return's quantity). unit_price is the PO line's cost_price when the PO
 *   has one (amount = quantity × price); otherwise the amount is manual or
 *   left empty. No tax is computed.
 *
 * Every record snapshots its source chain (company, supplier, PO, PO line,
 * GRN, GRN line, lot, product, UOM) from the lot — never from user input.
 *
 * New permissions supplier-return.view/create/post/cancel (group
 * Procurement) are granted to Super Admin and Admin only. QC reuses
 * inward-entry.view / inward-entry.approve; debit notes reuse the existing
 * debit-note.* permissions.
 */

const PERMISSIONS = ['supplier-return.view', 'supplier-return.create', 'supplier-return.post', 'supplier-return.cancel'];
const GRANTED_ROLES = ['Super Admin', 'Admin'];

// Source-chain columns shared by all three documents (snapshotted from the lot).
const SOURCE_COLUMNS = `
  \`lot_id\` BIGINT UNSIGNED NOT NULL,
  \`inward_entry_id\` BIGINT UNSIGNED NOT NULL,
  \`inward_entry_item_id\` BIGINT UNSIGNED NOT NULL,
  \`purchase_order_id\` BIGINT UNSIGNED NOT NULL,
  \`purchase_order_item_id\` BIGINT UNSIGNED NOT NULL,
  \`supplier_id\` BIGINT UNSIGNED NOT NULL,
  \`product_id\` BIGINT UNSIGNED NOT NULL,
  \`uom_id\` BIGINT UNSIGNED NULL,
  \`unit\` VARCHAR(20),`;

const sourceKeys = (t) => `
  INDEX \`${t}_lot_id_index\` (\`lot_id\`),
  INDEX \`${t}_inward_entry_id_index\` (\`inward_entry_id\`),
  INDEX \`${t}_purchase_order_id_index\` (\`purchase_order_id\`),
  INDEX \`${t}_supplier_id_index\` (\`supplier_id\`),
  CONSTRAINT \`${t}_company_id_foreign\` FOREIGN KEY (\`company_id\`) REFERENCES \`companies\` (\`id\`) ON DELETE RESTRICT,
  CONSTRAINT \`${t}_lot_id_foreign\` FOREIGN KEY (\`lot_id\`) REFERENCES \`lots\` (\`id\`) ON DELETE RESTRICT,
  CONSTRAINT \`${t}_inward_entry_id_foreign\` FOREIGN KEY (\`inward_entry_id\`) REFERENCES \`inward_entries\` (\`id\`) ON DELETE RESTRICT,
  CONSTRAINT \`${t}_inward_entry_item_id_foreign\` FOREIGN KEY (\`inward_entry_item_id\`) REFERENCES \`inward_entry_items\` (\`id\`) ON DELETE RESTRICT,
  CONSTRAINT \`${t}_purchase_order_id_foreign\` FOREIGN KEY (\`purchase_order_id\`) REFERENCES \`purchase_orders\` (\`id\`) ON DELETE RESTRICT,
  CONSTRAINT \`${t}_purchase_order_item_id_foreign\` FOREIGN KEY (\`purchase_order_item_id\`) REFERENCES \`purchase_order_items\` (\`id\`) ON DELETE RESTRICT,
  CONSTRAINT \`${t}_supplier_id_foreign\` FOREIGN KEY (\`supplier_id\`) REFERENCES \`suppliers\` (\`id\`) ON DELETE RESTRICT,
  CONSTRAINT \`${t}_product_id_foreign\` FOREIGN KEY (\`product_id\`) REFERENCES \`products\` (\`id\`) ON DELETE RESTRICT,
  CONSTRAINT \`${t}_uom_id_foreign\` FOREIGN KEY (\`uom_id\`) REFERENCES \`uoms\` (\`id\`) ON DELETE RESTRICT,`;

const auditKeys = (t, extra = []) => [...extra, 'created_by', 'updated_by']
  .map((c) => `CONSTRAINT \`${t}_${c}_foreign\` FOREIGN KEY (\`${c}\`) REFERENCES \`users\` (\`id\`) ON DELETE SET NULL`)
  .join(',\n  ');

export async function up(connection) {
  await connection.query(`CREATE TABLE \`quality_inspections\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`company_id\` BIGINT UNSIGNED NOT NULL,
  \`qc_no\` VARCHAR(40) NOT NULL,
  \`financial_year\` VARCHAR(10) NOT NULL,
  \`inspection_date\` DATE NOT NULL,${SOURCE_COLUMNS}
  \`inspected_quantity\` DECIMAL(18, 6) NOT NULL,
  \`accepted_quantity\` DECIMAL(18, 6) NULL,
  \`rejected_quantity\` DECIMAL(18, 6) NULL,
  \`return_quantity\` DECIMAL(18, 6) NULL,
  \`shade\` VARCHAR(100),
  \`edge_to_edge_shade\` VARCHAR(100),
  \`weaving_defects\` TEXT,
  \`remarks\` TEXT,
  \`status\` ENUM('draft', 'completed', 'cancelled') NOT NULL DEFAULT 'draft',
  \`result\` ENUM('accepted', 'partially_accepted', 'rejected') NULL,
  \`completed_at\` TIMESTAMP NULL,
  \`completed_by\` BIGINT UNSIGNED NULL,
  \`cancelled_at\` TIMESTAMP NULL,
  \`cancelled_by\` BIGINT UNSIGNED NULL,
  \`cancellation_reason\` VARCHAR(500),
  \`created_by\` BIGINT UNSIGNED,
  \`updated_by\` BIGINT UNSIGNED,
  \`created_at\` TIMESTAMP,
  \`updated_at\` TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`quality_inspections_qc_no_unique\` (\`qc_no\`),
  INDEX \`quality_inspections_company_id_status_index\` (\`company_id\`, \`status\`),
  INDEX \`quality_inspections_inspection_date_index\` (\`inspection_date\`),${sourceKeys('quality_inspections')}
  ${auditKeys('quality_inspections', ['completed_by', 'cancelled_by'])}
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);

  await connection.query(`CREATE TABLE \`supplier_returns\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`company_id\` BIGINT UNSIGNED NOT NULL,
  \`return_no\` VARCHAR(40) NOT NULL,
  \`financial_year\` VARCHAR(10) NOT NULL,
  \`return_date\` DATE NOT NULL,
  \`quality_inspection_id\` BIGINT UNSIGNED NOT NULL,${SOURCE_COLUMNS}
  \`quantity\` DECIMAL(18, 6) NOT NULL,
  \`reason\` VARCHAR(255),
  \`remarks\` TEXT,
  \`status\` ENUM('draft', 'posted', 'cancelled') NOT NULL DEFAULT 'draft',
  \`posted_at\` TIMESTAMP NULL,
  \`posted_by\` BIGINT UNSIGNED NULL,
  \`cancelled_at\` TIMESTAMP NULL,
  \`cancelled_by\` BIGINT UNSIGNED NULL,
  \`created_by\` BIGINT UNSIGNED,
  \`updated_by\` BIGINT UNSIGNED,
  \`created_at\` TIMESTAMP,
  \`updated_at\` TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`supplier_returns_return_no_unique\` (\`return_no\`),
  INDEX \`supplier_returns_company_id_status_index\` (\`company_id\`, \`status\`),
  INDEX \`supplier_returns_return_date_index\` (\`return_date\`),
  INDEX \`supplier_returns_quality_inspection_id_index\` (\`quality_inspection_id\`),
  CONSTRAINT \`supplier_returns_quality_inspection_id_foreign\` FOREIGN KEY (\`quality_inspection_id\`) REFERENCES \`quality_inspections\` (\`id\`) ON DELETE RESTRICT,${sourceKeys('supplier_returns')}
  ${auditKeys('supplier_returns', ['posted_by', 'cancelled_by'])}
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);

  await connection.query(`CREATE TABLE \`debit_notes\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`company_id\` BIGINT UNSIGNED NOT NULL,
  \`debit_note_no\` VARCHAR(40) NOT NULL,
  \`financial_year\` VARCHAR(10) NOT NULL,
  \`debit_note_date\` DATE NOT NULL,
  \`quality_inspection_id\` BIGINT UNSIGNED NOT NULL,
  \`supplier_return_id\` BIGINT UNSIGNED NULL,${SOURCE_COLUMNS}
  \`quantity\` DECIMAL(18, 6) NOT NULL,
  \`unit_price\` DECIMAL(12, 2) NULL,
  \`amount\` DECIMAL(14, 2) NULL,
  \`amount_basis\` ENUM('po_price', 'manual', 'none') NOT NULL DEFAULT 'none',
  \`reason\` VARCHAR(255),
  \`remarks\` TEXT,
  \`status\` ENUM('draft', 'posted', 'cancelled') NOT NULL DEFAULT 'draft',
  \`posted_at\` TIMESTAMP NULL,
  \`posted_by\` BIGINT UNSIGNED NULL,
  \`cancelled_at\` TIMESTAMP NULL,
  \`cancelled_by\` BIGINT UNSIGNED NULL,
  \`created_by\` BIGINT UNSIGNED,
  \`updated_by\` BIGINT UNSIGNED,
  \`created_at\` TIMESTAMP,
  \`updated_at\` TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`debit_notes_debit_note_no_unique\` (\`debit_note_no\`),
  INDEX \`debit_notes_company_id_status_index\` (\`company_id\`, \`status\`),
  INDEX \`debit_notes_debit_note_date_index\` (\`debit_note_date\`),
  INDEX \`debit_notes_quality_inspection_id_index\` (\`quality_inspection_id\`),
  INDEX \`debit_notes_supplier_return_id_index\` (\`supplier_return_id\`),
  CONSTRAINT \`debit_notes_quality_inspection_id_foreign\` FOREIGN KEY (\`quality_inspection_id\`) REFERENCES \`quality_inspections\` (\`id\`) ON DELETE RESTRICT,
  CONSTRAINT \`debit_notes_supplier_return_id_foreign\` FOREIGN KEY (\`supplier_return_id\`) REFERENCES \`supplier_returns\` (\`id\`) ON DELETE RESTRICT,${sourceKeys('debit_notes')}
  ${auditKeys('debit_notes', ['posted_by', 'cancelled_by'])}
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);

  for (const name of PERMISSIONS) {
    await connection.query('INSERT IGNORE INTO `permissions` (name, group_name) VALUES (?, ?)', [name, 'Procurement']);
  }
  for (const role of GRANTED_ROLES) {
    await connection.query(
      `INSERT IGNORE INTO \`role_permissions\` (role_id, permission_id)
       SELECT r.id, p.id FROM \`roles\` r JOIN \`permissions\` p ON p.name IN (?)
       WHERE r.name = ?`,
      [PERMISSIONS, role]
    );
  }
}

export async function down(connection) {
  await connection.query('DELETE FROM `permissions` WHERE name IN (?)', [PERMISSIONS]);
  await connection.query('DROP TABLE IF EXISTS `debit_notes`;');
  await connection.query('DROP TABLE IF EXISTS `supplier_returns`;');
  await connection.query('DROP TABLE IF EXISTS `quality_inspections`;');
}
