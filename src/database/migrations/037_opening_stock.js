/**
 * Opening stock (client requirement 15: move current Excel inventory into the
 * ERP). An opening lot is stock that existed before the ERP — no PO, GRN or
 * processing record behind it — brought in by the Opening Stock import:
 *
 *   lots.source_type 'opening'     no PO / GRN / processing links; supplier
 *                                  optional; width optional (the import asks
 *                                  for it where the product is a fabric).
 *   OPENING_BALANCE movement       direction 'in', source 'opening_balance',
 *                                  no source-record links; immutable like
 *                                  every other ledger row (existing triggers).
 *
 * The existing GRN / production and movement rules are unchanged; each CHECK
 * gains one more allowed shape.
 */

const LOTS_CHECK_OLD = `(
  (\`source_type\` = 'grn' AND \`processing_record_id\` IS NULL AND \`inward_entry_id\` IS NOT NULL AND \`inward_entry_item_id\` IS NOT NULL
    AND \`purchase_order_id\` IS NOT NULL AND \`purchase_order_item_id\` IS NOT NULL AND \`supplier_id\` IS NOT NULL AND \`width_inch\` IS NOT NULL)
  OR (\`source_type\` = 'production' AND \`processing_record_id\` IS NOT NULL AND \`inward_entry_id\` IS NULL AND \`inward_entry_item_id\` IS NULL
    AND \`purchase_order_id\` IS NULL AND \`purchase_order_item_id\` IS NULL AND \`supplier_id\` IS NULL)
)`;
const LOTS_CHECK_NEW = LOTS_CHECK_OLD.replace(/\n\)$/, `
  OR (\`source_type\` = 'opening' AND \`processing_record_id\` IS NULL AND \`inward_entry_id\` IS NULL AND \`inward_entry_item_id\` IS NULL
    AND \`purchase_order_id\` IS NULL AND \`purchase_order_item_id\` IS NULL)
)`);

const MOVES_CHECK_OLD = `(
  (\`movement_type\` = 'QC_ACCEPTED_RECEIPT' AND \`direction\` = 'in' AND \`source_type\` = 'quality_inspection' AND \`quality_inspection_id\` IS NOT NULL AND \`material_issue_item_id\` IS NULL AND \`processing_record_id\` IS NULL AND \`dispatch_item_id\` IS NULL)
  OR (\`movement_type\` = 'STOCK_ADJUSTMENT' AND \`source_type\` = 'stock_adjustment' AND \`quality_inspection_id\` IS NULL AND \`material_issue_item_id\` IS NULL AND \`processing_record_id\` IS NULL AND \`dispatch_item_id\` IS NULL AND \`reason\` IS NOT NULL)
  OR (\`movement_type\` = 'MATERIAL_ISSUE' AND \`direction\` = 'out' AND \`source_type\` = 'material_issue' AND \`quality_inspection_id\` IS NULL AND \`material_issue_item_id\` IS NOT NULL AND \`processing_record_id\` IS NULL AND \`dispatch_item_id\` IS NULL)
  OR (\`movement_type\` = 'PRODUCTION_OUTPUT' AND \`direction\` = 'in' AND \`source_type\` = 'processing_record' AND \`quality_inspection_id\` IS NULL AND \`material_issue_item_id\` IS NULL AND \`processing_record_id\` IS NOT NULL AND \`dispatch_item_id\` IS NULL)
  OR (\`movement_type\` = 'DISPATCH' AND \`direction\` = 'out' AND \`source_type\` = 'dispatch' AND \`quality_inspection_id\` IS NULL AND \`material_issue_item_id\` IS NULL AND \`processing_record_id\` IS NULL AND \`dispatch_item_id\` IS NOT NULL)
)`;
const MOVES_CHECK_NEW = MOVES_CHECK_OLD.replace(/\n\)$/, `
  OR (\`movement_type\` = 'OPENING_BALANCE' AND \`direction\` = 'in' AND \`source_type\` = 'opening_balance' AND \`quality_inspection_id\` IS NULL AND \`material_issue_item_id\` IS NULL AND \`processing_record_id\` IS NULL AND \`dispatch_item_id\` IS NULL)
)`);

const MOVE_TYPES = "'QC_ACCEPTED_RECEIPT', 'STOCK_ADJUSTMENT', 'MATERIAL_ISSUE', 'PRODUCTION_OUTPUT', 'DISPATCH'";
const MOVE_SOURCES = "'quality_inspection', 'stock_adjustment', 'material_issue', 'processing_record', 'dispatch'";

export async function up(connection) {
  await connection.query('ALTER TABLE `lots` DROP CHECK `lots_source_consistent`');
  await connection.query("ALTER TABLE `lots` MODIFY `source_type` ENUM('grn', 'production', 'opening') NOT NULL DEFAULT 'grn'");
  await connection.query(`ALTER TABLE \`lots\` ADD CONSTRAINT \`lots_source_consistent\` CHECK ${LOTS_CHECK_NEW}`);

  await connection.query('ALTER TABLE `stock_movements` DROP CHECK `stock_movements_source_consistent`');
  await connection.query(`ALTER TABLE \`stock_movements\`
    MODIFY \`movement_type\` ENUM(${MOVE_TYPES}, 'OPENING_BALANCE') NOT NULL,
    MODIFY \`source_type\` ENUM(${MOVE_SOURCES}, 'opening_balance') NOT NULL`);
  await connection.query(`ALTER TABLE \`stock_movements\` ADD CONSTRAINT \`stock_movements_source_consistent\` CHECK ${MOVES_CHECK_NEW}`);
}

export async function down(connection) {
  const [[{ n }]] = await connection.query("SELECT COUNT(*) AS n FROM `lots` WHERE `source_type` = 'opening'");
  if (n > 0) throw new Error(`${n} opening lot(s) exist; their ledger rows are immutable, so this migration cannot be rolled back.`);
  await connection.query('ALTER TABLE `stock_movements` DROP CHECK `stock_movements_source_consistent`');
  await connection.query(`ALTER TABLE \`stock_movements\`
    MODIFY \`movement_type\` ENUM(${MOVE_TYPES}) NOT NULL,
    MODIFY \`source_type\` ENUM(${MOVE_SOURCES}) NOT NULL`);
  await connection.query(`ALTER TABLE \`stock_movements\` ADD CONSTRAINT \`stock_movements_source_consistent\` CHECK ${MOVES_CHECK_OLD}`);
  await connection.query('ALTER TABLE `lots` DROP CHECK `lots_source_consistent`');
  await connection.query("ALTER TABLE `lots` MODIFY `source_type` ENUM('grn', 'production') NOT NULL DEFAULT 'grn'");
  await connection.query(`ALTER TABLE \`lots\` ADD CONSTRAINT \`lots_source_consistent\` CHECK ${LOTS_CHECK_OLD}`);
}
