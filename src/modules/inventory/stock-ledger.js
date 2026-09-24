/**
 * Stock ledger rules (single source): stock_movements is the only record of
 * stock. A balance is SUM(in) − SUM(out) over posted movements; nothing
 * stores a mutable quantity.
 */
export const SIGNED_QUANTITY = "CASE WHEN sm.direction = 'in' THEN sm.quantity ELSE -sm.quantity END";

/** Current usable stock and QC-accepted quantity posted to stock, per lot. */
export const STOCK_BY_LOT = `
  SELECT sm.lot_id,
         SUM(${SIGNED_QUANTITY}) AS stock_quantity,
         SUM(CASE WHEN sm.movement_type IN ('QC_ACCEPTED_RECEIPT', 'PRODUCTION_OUTPUT') THEN sm.quantity ELSE 0 END) AS stock_received_quantity,
         SUM(CASE WHEN sm.movement_type = 'MATERIAL_ISSUE' THEN sm.quantity ELSE 0 END) AS stock_issued_quantity,
         SUM(CASE WHEN sm.movement_type = 'DISPATCH' THEN sm.quantity ELSE 0 END) AS stock_dispatched_quantity
  FROM stock_movements sm
  GROUP BY sm.lot_id
`;
