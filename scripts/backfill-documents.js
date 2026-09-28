import { pool } from '../src/config/database.js';
import { documentArchive, ARCHIVED_DOCUMENTS } from '../src/services/document-archive.service.js';

/**
 * One-off: archives a copy of every record that reached its final state
 * before the document archive existed (event 'backfilled' — it is the
 * record as it renders today, not necessarily the copy that was sent).
 * Records that already have an archived copy are skipped; safe to re-run.
 */
const FINAL = {
  purchase_order: "status IN ('raised', 'partial', 'received')",
  grn: "receipt_status = 'posted'",
  quality_inspection: "status = 'completed'",
  supplier_return: "status = 'posted'",
  debit_note: "status = 'posted'",
  material_issue: "status = 'issued'",
  processing_record: 'output_posted_at IS NOT NULL',
  proforma_invoice: "status = 'issued'",
  invoice: "status = 'issued'",
  dispatch: "status = 'posted'",
};

async function run() {
  let archived = 0;
  for (const [type, where] of Object.entries(FINAL)) {
    const { table } = ARCHIVED_DOCUMENTS[type];
    const [rows] = await pool.query(
      `SELECT t.id FROM ${table} t WHERE ${where}${table === 'purchase_orders' || table === 'inward_entries' ? ' AND t.deleted_at IS NULL' : ''}
         AND NOT EXISTS (SELECT 1 FROM document_archive d WHERE d.entity_type = ? AND d.entity_id = t.id)`,
      [type]
    );
    for (const { id } of rows) {
      if (await documentArchive.capture(type, id, 'backfilled', null)) archived += 1;
    }
    console.log(`- ${type}: ${rows.length}`);
  }
  console.log(`✅ ${archived} document(s) archived.`);
}

run().then(() => pool.end()).then(() => process.exit(0)).catch((err) => {
  console.error('❌', err.message);
  process.exit(1);
});
