/**
 * Procurement foundation — the existing Purchase Order tables are extended so
 * one PO system serves both origins:
 *
 *   order_confirmation   — the existing OC → PO flow (unchanged)
 *   material_requirement — garment PO straight from a material requirement
 *   material_plan        — garment PO from a planned material plan
 *
 * purchase_orders
 *   - order_confirmation_id becomes NULLABLE (garment POs have no OC). The FK
 *     is dropped and re-created unchanged around the MODIFY.
 *   - origin: every existing row is an OC PO, so it takes the column default
 *     'order_confirmation' — a deterministic backfill, no guessing.
 *   - material_plan_id: source plan when origin = material_plan.
 *   - status gains 'cancelled'. Existing values keep their meaning:
 *     draft, raised (= confirmed/issued to the supplier), partial/received
 *     (set by inward QC).
 *   - confirmed_at/by, cancelled_at/by for the new server-side transitions.
 *   - CHECK: an OC PO must reference its OC; a plan PO must reference its plan.
 *
 * purchase_order_items
 *   - material_requirement_id / material_plan_item_id: traceability of a
 *     garment line back to planning (plan item → requirement → projection item).
 *   - ordered_quantity DECIMAL(18,6): the quantity of a garment line in its
 *     product's UOM. The legacy `qty` column is INT and is read as an integer
 *     by OC-line screens, inward entries and finance, so its type is left
 *     untouched; garment lines store their quantity here instead.
 *
 * No new tables, no new permissions (confirm/cancel use purchase-order.approve).
 * No existing row is modified other than receiving the column defaults.
 */

export async function up(connection) {
  await connection.query('ALTER TABLE `purchase_orders` DROP FOREIGN KEY `purchase_orders_order_confirmation_id_foreign`;');
  await connection.query('ALTER TABLE `purchase_orders` MODIFY `order_confirmation_id` BIGINT UNSIGNED NULL;');
  await connection.query('ALTER TABLE `purchase_orders` ADD CONSTRAINT `purchase_orders_order_confirmation_id_foreign` FOREIGN KEY (`order_confirmation_id`) REFERENCES `order_confirmations` (`id`) ON DELETE RESTRICT;');

  await connection.query(`ALTER TABLE \`purchase_orders\`
    ADD COLUMN \`origin\` ENUM('order_confirmation', 'material_requirement', 'material_plan') NOT NULL DEFAULT 'order_confirmation' AFTER \`company_id\`,
    ADD COLUMN \`material_plan_id\` BIGINT UNSIGNED NULL AFTER \`order_confirmation_id\`,
    MODIFY \`status\` ENUM('draft', 'raised', 'partial', 'received', 'cancelled') NOT NULL DEFAULT 'draft',
    ADD COLUMN \`confirmed_at\` TIMESTAMP NULL AFTER \`status\`,
    ADD COLUMN \`confirmed_by\` BIGINT UNSIGNED NULL AFTER \`confirmed_at\`,
    ADD COLUMN \`cancelled_at\` TIMESTAMP NULL AFTER \`confirmed_by\`,
    ADD COLUMN \`cancelled_by\` BIGINT UNSIGNED NULL AFTER \`cancelled_at\`;`);

  await connection.query(`ALTER TABLE \`purchase_orders\`
    ADD INDEX \`purchase_orders_origin_status_index\` (\`origin\`, \`status\`),
    ADD INDEX \`purchase_orders_material_plan_id_index\` (\`material_plan_id\`),
    ADD CONSTRAINT \`purchase_orders_material_plan_id_foreign\` FOREIGN KEY (\`material_plan_id\`) REFERENCES \`material_plans\` (\`id\`) ON DELETE RESTRICT,
    ADD CONSTRAINT \`purchase_orders_confirmed_by_foreign\` FOREIGN KEY (\`confirmed_by\`) REFERENCES \`users\` (\`id\`) ON DELETE SET NULL,
    ADD CONSTRAINT \`purchase_orders_cancelled_by_foreign\` FOREIGN KEY (\`cancelled_by\`) REFERENCES \`users\` (\`id\`) ON DELETE SET NULL,
    ADD CONSTRAINT \`purchase_orders_origin_source_check\` CHECK (
      (\`origin\` <> 'order_confirmation' OR \`order_confirmation_id\` IS NOT NULL)
      AND (\`origin\` <> 'material_plan' OR \`material_plan_id\` IS NOT NULL)
    );`);

  await connection.query(`ALTER TABLE \`purchase_order_items\`
    ADD COLUMN \`material_requirement_id\` BIGINT UNSIGNED NULL AFTER \`order_confirmation_item_id\`,
    ADD COLUMN \`material_plan_item_id\` BIGINT UNSIGNED NULL AFTER \`material_requirement_id\`,
    ADD COLUMN \`ordered_quantity\` DECIMAL(18, 6) NULL AFTER \`qty\`,
    ADD INDEX \`purchase_order_items_material_requirement_id_index\` (\`material_requirement_id\`),
    ADD INDEX \`purchase_order_items_material_plan_item_id_index\` (\`material_plan_item_id\`),
    ADD CONSTRAINT \`purchase_order_items_material_requirement_id_foreign\` FOREIGN KEY (\`material_requirement_id\`) REFERENCES \`material_requirements\` (\`id\`) ON DELETE RESTRICT,
    ADD CONSTRAINT \`purchase_order_items_material_plan_item_id_foreign\` FOREIGN KEY (\`material_plan_item_id\`) REFERENCES \`material_plan_items\` (\`id\`) ON DELETE RESTRICT;`);
}

export async function down(connection) {
  await connection.query(`ALTER TABLE \`purchase_order_items\`
    DROP FOREIGN KEY \`purchase_order_items_material_plan_item_id_foreign\`,
    DROP FOREIGN KEY \`purchase_order_items_material_requirement_id_foreign\`;`);
  await connection.query(`ALTER TABLE \`purchase_order_items\`
    DROP INDEX \`purchase_order_items_material_plan_item_id_index\`,
    DROP INDEX \`purchase_order_items_material_requirement_id_index\`,
    DROP COLUMN \`ordered_quantity\`,
    DROP COLUMN \`material_plan_item_id\`,
    DROP COLUMN \`material_requirement_id\`;`);

  await connection.query(`ALTER TABLE \`purchase_orders\`
    DROP CHECK \`purchase_orders_origin_source_check\`,
    DROP FOREIGN KEY \`purchase_orders_cancelled_by_foreign\`,
    DROP FOREIGN KEY \`purchase_orders_confirmed_by_foreign\`,
    DROP FOREIGN KEY \`purchase_orders_material_plan_id_foreign\`;`);
  await connection.query(`ALTER TABLE \`purchase_orders\`
    DROP INDEX \`purchase_orders_material_plan_id_index\`,
    DROP INDEX \`purchase_orders_origin_status_index\`,
    DROP COLUMN \`cancelled_by\`, DROP COLUMN \`cancelled_at\`,
    DROP COLUMN \`confirmed_by\`, DROP COLUMN \`confirmed_at\`,
    DROP COLUMN \`material_plan_id\`, DROP COLUMN \`origin\`,
    MODIFY \`status\` ENUM('draft', 'raised', 'partial', 'received') NOT NULL DEFAULT 'draft';`);

  // Only reversible while no PO lacks an order confirmation.
  await connection.query('ALTER TABLE `purchase_orders` DROP FOREIGN KEY `purchase_orders_order_confirmation_id_foreign`;');
  await connection.query('ALTER TABLE `purchase_orders` MODIFY `order_confirmation_id` BIGINT UNSIGNED NOT NULL;');
  await connection.query('ALTER TABLE `purchase_orders` ADD CONSTRAINT `purchase_orders_order_confirmation_id_foreign` FOREIGN KEY (`order_confirmation_id`) REFERENCES `order_confirmations` (`id`) ON DELETE RESTRICT;');
}
