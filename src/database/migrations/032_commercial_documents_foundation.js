/**
 * Commercial document foundation — Proforma Invoice and Final Invoice.
 *
 * ERP-side documents and their source relationships only: no tax, GST,
 * discount, freight, currency conversion, payment, receivable or ledger
 * logic, and no Tally posting (all pending client / accounting decisions).
 *
 * proforma_invoices (header) + proforma_invoice_items (lines)
 *   Raised against one CONFIRMED order confirmation; company, buyer and
 *   currency are the order's. Each line is one order item (product, unit and
 *   description from the item). unit_price is the order item's own price
 *   (the existing OC pricing) and amount = quantity × unit_price, the same
 *   formula the order uses; both stay NULL when the order item has no price.
 *   draft (editable, reserves nothing) → issued (frozen) → cancelled; a
 *   draft can also be cancelled. Confirmation / payment references are
 *   recorded as entered — no payment status, balance or "paid" state.
 *
 * invoices (header) + invoice_items (lines)
 *   Every line bills one POSTED dispatch line (stock or direct supplier), so
 *   an invoice can never carry quantity that was not dispatched. Product,
 *   UOM, lot, PO line and order item come from the dispatch line; the price
 *   is the order item's price (NULL for direct dispatch lines with no order).
 *   Optional link to an issued PI of the same order. invoice_no is assigned
 *   when the invoice is issued (a cancelled draft consumes no number).
 *   draft → issued (frozen, cannot be cancelled: reversal needs an accounting
 *   decision) or draft → cancelled.
 *
 * Permissions proforma-invoice.* and invoice.* (group Finance), Super Admin
 * and Admin only.
 */

const PERMISSIONS = [
  'proforma-invoice.view', 'proforma-invoice.create', 'proforma-invoice.edit', 'proforma-invoice.issue', 'proforma-invoice.cancel',
  'invoice.view', 'invoice.create', 'invoice.edit', 'invoice.issue', 'invoice.cancel',
];
const GRANTED_ROLES = ['Super Admin', 'Admin'];

const fk = (t, c, ref, action = 'RESTRICT') => `CONSTRAINT \`${t}_${c}_foreign\` FOREIGN KEY (\`${c}\`) REFERENCES \`${ref}\` (\`id\`) ON DELETE ${action}`;

// Lifecycle audit columns shared by both headers.
const LIFECYCLE = `
  \`status\` ENUM('draft', 'issued', 'cancelled') NOT NULL DEFAULT 'draft',
  \`issued_at\` TIMESTAMP NULL,
  \`issued_by\` BIGINT UNSIGNED NULL,
  \`cancelled_at\` TIMESTAMP NULL,
  \`cancelled_by\` BIGINT UNSIGNED NULL,
  \`cancellation_reason\` VARCHAR(500),
  \`created_by\` BIGINT UNSIGNED,
  \`updated_by\` BIGINT UNSIGNED,
  \`created_at\` TIMESTAMP,
  \`updated_at\` TIMESTAMP,`;

const userFks = (t) => ['issued_by', 'cancelled_by', 'created_by', 'updated_by'].map((c) => fk(t, c, 'users', 'SET NULL')).join(',\n  ');

export async function up(connection) {
  await connection.query(`CREATE TABLE \`proforma_invoices\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`company_id\` BIGINT UNSIGNED NOT NULL,
  \`pi_no\` VARCHAR(40) NOT NULL,
  \`financial_year\` VARCHAR(10) NOT NULL,
  \`pi_date\` DATE NOT NULL,
  \`buyer_id\` BIGINT UNSIGNED NOT NULL,
  \`order_confirmation_id\` BIGINT UNSIGNED NOT NULL,
  \`currency_id\` BIGINT UNSIGNED NULL,
  \`valid_until\` DATE NULL,
  \`reference\` VARCHAR(100),
  \`payment_terms\` VARCHAR(255),
  \`remarks\` TEXT,
  \`confirmation_reference\` VARCHAR(100),
  \`confirmation_date\` DATE NULL,
  \`payment_reference\` VARCHAR(100),
  \`payment_date\` DATE NULL,
  \`commercial_remarks\` TEXT,
  \`commercial_updated_at\` TIMESTAMP NULL,
  \`commercial_updated_by\` BIGINT UNSIGNED NULL,
  ${LIFECYCLE}
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`proforma_invoices_pi_no_unique\` (\`pi_no\`),
  INDEX \`proforma_invoices_company_id_status_index\` (\`company_id\`, \`status\`),
  INDEX \`proforma_invoices_pi_date_index\` (\`pi_date\`),
  INDEX \`proforma_invoices_buyer_id_index\` (\`buyer_id\`),
  INDEX \`proforma_invoices_order_confirmation_id_index\` (\`order_confirmation_id\`),
  ${fk('proforma_invoices', 'company_id', 'companies')},
  ${fk('proforma_invoices', 'buyer_id', 'buyers')},
  ${fk('proforma_invoices', 'order_confirmation_id', 'order_confirmations')},
  ${fk('proforma_invoices', 'currency_id', 'currencies')},
  ${fk('proforma_invoices', 'commercial_updated_by', 'users', 'SET NULL')},
  ${userFks('proforma_invoices')}
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);

  await connection.query(`CREATE TABLE \`proforma_invoice_items\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`proforma_invoice_id\` BIGINT UNSIGNED NOT NULL,
  \`sort_order\` INT UNSIGNED NOT NULL DEFAULT 0,
  \`order_confirmation_item_id\` BIGINT UNSIGNED NOT NULL,
  \`product_id\` BIGINT UNSIGNED NULL,
  \`uom_id\` BIGINT UNSIGNED NULL,
  \`unit\` VARCHAR(255),
  \`description\` TEXT,
  \`quantity\` DECIMAL(18, 6) NOT NULL,
  \`unit_price\` DECIMAL(12, 2) NULL,
  \`amount\` DECIMAL(20, 2) AS (ROUND(\`quantity\` * \`unit_price\`, 2)) STORED,
  \`remarks\` TEXT,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`proforma_invoice_items_pi_item_unique\` (\`proforma_invoice_id\`, \`order_confirmation_item_id\`),
  INDEX \`proforma_invoice_items_order_confirmation_item_id_index\` (\`order_confirmation_item_id\`),
  INDEX \`proforma_invoice_items_product_id_index\` (\`product_id\`),
  CONSTRAINT \`proforma_invoice_items_quantity_positive\` CHECK (\`quantity\` > 0),
  ${fk('proforma_invoice_items', 'proforma_invoice_id', 'proforma_invoices')},
  ${fk('proforma_invoice_items', 'order_confirmation_item_id', 'order_confirmation_items')},
  ${fk('proforma_invoice_items', 'product_id', 'products')},
  ${fk('proforma_invoice_items', 'uom_id', 'uoms')}
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);

  await connection.query(`CREATE TABLE \`invoices\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`company_id\` BIGINT UNSIGNED NOT NULL,
  \`invoice_no\` VARCHAR(40) NULL,
  \`financial_year\` VARCHAR(10) NULL,
  \`invoice_date\` DATE NOT NULL,
  \`buyer_id\` BIGINT UNSIGNED NOT NULL,
  \`order_confirmation_id\` BIGINT UNSIGNED NULL,
  \`proforma_invoice_id\` BIGINT UNSIGNED NULL,
  \`currency_id\` BIGINT UNSIGNED NULL,
  \`reference\` VARCHAR(100),
  \`remarks\` TEXT,
  ${LIFECYCLE}
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`invoices_invoice_no_unique\` (\`invoice_no\`),
  INDEX \`invoices_company_id_status_index\` (\`company_id\`, \`status\`),
  INDEX \`invoices_invoice_date_index\` (\`invoice_date\`),
  INDEX \`invoices_buyer_id_index\` (\`buyer_id\`),
  INDEX \`invoices_order_confirmation_id_index\` (\`order_confirmation_id\`),
  INDEX \`invoices_proforma_invoice_id_index\` (\`proforma_invoice_id\`),
  CONSTRAINT \`invoices_number_when_issued\` CHECK (
    (\`invoice_no\` IS NULL AND \`financial_year\` IS NULL AND \`status\` <> 'issued')
    OR (\`invoice_no\` IS NOT NULL AND \`financial_year\` IS NOT NULL AND \`status\` <> 'draft')
  ),
  ${fk('invoices', 'company_id', 'companies')},
  ${fk('invoices', 'buyer_id', 'buyers')},
  ${fk('invoices', 'order_confirmation_id', 'order_confirmations')},
  ${fk('invoices', 'proforma_invoice_id', 'proforma_invoices')},
  ${fk('invoices', 'currency_id', 'currencies')},
  ${userFks('invoices')}
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);

  await connection.query(`CREATE TABLE \`invoice_items\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`invoice_id\` BIGINT UNSIGNED NOT NULL,
  \`sort_order\` INT UNSIGNED NOT NULL DEFAULT 0,
  \`dispatch_id\` BIGINT UNSIGNED NOT NULL,
  \`dispatch_item_id\` BIGINT UNSIGNED NOT NULL,
  \`order_confirmation_item_id\` BIGINT UNSIGNED NULL,
  \`lot_id\` BIGINT UNSIGNED NULL,
  \`purchase_order_item_id\` BIGINT UNSIGNED NULL,
  \`product_id\` BIGINT UNSIGNED NOT NULL,
  \`uom_id\` BIGINT UNSIGNED NULL,
  \`unit\` VARCHAR(20),
  \`description\` TEXT,
  \`quantity\` DECIMAL(18, 6) NOT NULL,
  \`unit_price\` DECIMAL(12, 2) NULL,
  \`amount\` DECIMAL(20, 2) AS (ROUND(\`quantity\` * \`unit_price\`, 2)) STORED,
  \`remarks\` TEXT,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`invoice_items_invoice_dispatch_item_unique\` (\`invoice_id\`, \`dispatch_item_id\`),
  INDEX \`invoice_items_dispatch_id_index\` (\`dispatch_id\`),
  INDEX \`invoice_items_dispatch_item_id_index\` (\`dispatch_item_id\`),
  INDEX \`invoice_items_order_confirmation_item_id_index\` (\`order_confirmation_item_id\`),
  INDEX \`invoice_items_lot_id_index\` (\`lot_id\`),
  INDEX \`invoice_items_product_id_index\` (\`product_id\`),
  CONSTRAINT \`invoice_items_quantity_positive\` CHECK (\`quantity\` > 0),
  ${fk('invoice_items', 'invoice_id', 'invoices')},
  ${fk('invoice_items', 'dispatch_id', 'dispatches')},
  ${fk('invoice_items', 'dispatch_item_id', 'dispatch_items')},
  ${fk('invoice_items', 'order_confirmation_item_id', 'order_confirmation_items')},
  ${fk('invoice_items', 'lot_id', 'lots')},
  ${fk('invoice_items', 'purchase_order_item_id', 'purchase_order_items')},
  ${fk('invoice_items', 'product_id', 'products')},
  ${fk('invoice_items', 'uom_id', 'uoms')}
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);

  for (const name of PERMISSIONS) {
    await connection.query('INSERT IGNORE INTO `permissions` (name, group_name) VALUES (?, ?)', [name, 'Finance']);
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
  await connection.query('DROP TABLE IF EXISTS `invoice_items`;');
  await connection.query('DROP TABLE IF EXISTS `invoices`;');
  await connection.query('DROP TABLE IF EXISTS `proforma_invoice_items`;');
  await connection.query('DROP TABLE IF EXISTS `proforma_invoices`;');
}
