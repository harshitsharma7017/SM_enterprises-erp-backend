/**
 * The QC quantity ledger shared by lots, QC, supplier returns and debit notes.
 *
 *   - claimed on a lot   = inspected quantity of draft + completed QCs
 *                          (never more than the lot quantity)
 *   - inspected/accepted/rejected on a lot = completed QCs only
 *   - returned on a QC   = posted supplier returns; drafts are shown apart
 *                          but still reserve rejected quantity
 *   - debited on a QC    = posted debit notes; drafts reserve quantity too
 *   Cancelled documents count for nothing.
 */
export const ACTIVE_QC = "qi.status IN ('draft', 'completed')";

export const QC_TOTALS_BY_LOT = `
  SELECT qi.lot_id,
         SUM(CASE WHEN ${ACTIVE_QC} THEN qi.inspected_quantity ELSE 0 END) AS claimed_quantity,
         SUM(CASE WHEN qi.status = 'completed' THEN qi.inspected_quantity ELSE 0 END) AS inspected_quantity,
         SUM(CASE WHEN qi.status = 'completed' THEN qi.accepted_quantity ELSE 0 END) AS accepted_quantity,
         SUM(CASE WHEN qi.status = 'completed' THEN qi.rejected_quantity ELSE 0 END) AS rejected_quantity,
         SUM(CASE WHEN qi.status = 'draft' THEN 1 ELSE 0 END) AS draft_count
  FROM quality_inspections qi
  GROUP BY qi.lot_id
`;

export const RETURN_TOTALS_BY_LOT = `
  SELECT lot_id, SUM(quantity) AS returned_quantity
  FROM supplier_returns WHERE status = 'posted' GROUP BY lot_id
`;

export const RETURN_TOTALS_BY_QC = `
  SELECT quality_inspection_id,
         SUM(CASE WHEN status = 'posted' THEN quantity ELSE 0 END) AS returned_quantity,
         SUM(CASE WHEN status = 'draft' THEN quantity ELSE 0 END) AS return_draft_quantity
  FROM supplier_returns GROUP BY quality_inspection_id
`;

export const DEBIT_TOTALS_BY_QC = `
  SELECT quality_inspection_id,
         SUM(CASE WHEN status = 'posted' THEN quantity ELSE 0 END) AS debited_quantity,
         SUM(CASE WHEN status = 'draft' THEN quantity ELSE 0 END) AS debit_draft_quantity,
         SUM(CASE WHEN status = 'posted' THEN COALESCE(amount, 0) ELSE 0 END) AS debited_amount
  FROM debit_notes GROUP BY quality_inspection_id
`;
