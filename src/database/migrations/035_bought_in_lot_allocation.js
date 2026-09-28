/**
 * Bought-in stock can be allocated to orders and dispatched from stock.
 *
 * Until now only finished production lots could be allocated to an order item
 * (and so dispatched from stock). Traded goods — silicon / metal badges,
 * ready-made elastic, drawcords — arrive through a GRN, pass QC and sit in
 * stock with no processing record. An allocation of such a lot has no
 * processing record, so the column becomes nullable. The foreign key stays.
 */

export async function up(connection) {
  await connection.query(
    'ALTER TABLE `order_item_production_allocations` MODIFY `processing_record_id` BIGINT UNSIGNED NULL'
  );
}

export async function down(connection) {
  const [[{ n }]] = await connection.query(
    'SELECT COUNT(*) AS n FROM `order_item_production_allocations` WHERE `processing_record_id` IS NULL'
  );
  if (n > 0) throw new Error(`${n} allocation(s) of bought-in lots exist; cancel/remove them before rolling back.`);
  await connection.query(
    'ALTER TABLE `order_item_production_allocations` MODIFY `processing_record_id` BIGINT UNSIGNED NOT NULL'
  );
}
