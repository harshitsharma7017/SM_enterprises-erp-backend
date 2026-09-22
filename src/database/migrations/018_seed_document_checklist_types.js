/**
 * Seeds `document_checklist_types` — the fixed list of 26 required documents
 * an Export Document's checklist is built from. This table has existed since
 * migration 002 but nothing ever populated it (no seeder, no migration
 * INSERT), so `raiseFromOrderConfirmation`'s
 * `SELECT id FROM document_checklist_types WHERE status = "active"` has
 * always returned zero rows — every Export Document's checklist has been
 * permanently empty. Discovered while building the Export Documents
 * frontend (Phase 5A).
 *
 * The list, order, category (generated/uploaded/manual) and variant labels
 * below are copied from the original Guru Traders ERP's own
 * `database/seeders/DocumentChecklistTypeSeeder.php` — a faithful
 * reproduction, not an invented list. `code` values are newly assigned
 * (the Laravel source keys checklist rows by `str($label)->slug()` at
 * runtime rather than a stored code) but are only used internally by this
 * Node backend to link `generated`-category rows to their PDF-stub routes;
 * they don't need to match the Laravel slugs byte-for-byte.
 *
 * Purely additive — inserts into an unpopulated table, touches no other
 * schema or data.
 */

const TYPES = [
  { code: 'packing_list', name: 'Packing List', category: 'generated', variants: ['For Our Record (with Supplier)', 'Without Supplier (for Carton)', 'For Export Documentation'] },
  { code: 'item_summary', name: 'Item Summary', category: 'generated', variants: ['Raw Data', 'Split by Description & Price Band (AA/AB)', 'Supplier-wise Split'] },
  { code: 'export_invoice', name: 'Export Invoice', category: 'generated', variants: ['For Customs', 'For Buyer', 'For Bank', 'For E-way Bill'] },
  { code: 'cha_checklist', name: 'Checklist [from CHA]', category: 'uploaded', variants: null },
  { code: 'e_sanchit_documents', name: 'E-Sanchit Documents', category: 'uploaded', variants: null },
  { code: 'purchase_bills', name: 'Purchase Bills (Part of E-Sanchit)', category: 'generated', variants: ['By Carton No. & Export Invoice/Balance Shipment', 'By Carton No., Item Description & Supplier'] },
  { code: 'delivery_challan', name: 'Delivery Challan', category: 'generated', variants: null },
  { code: 'examination', name: 'Examination', category: 'manual', variants: null },
  { code: 'assessed_copy', name: 'Assessed Copy', category: 'uploaded', variants: null },
  { code: 'leo_copy', name: 'LEO Copy', category: 'uploaded', variants: null },
  { code: 'container_seal_numbers', name: 'Container & Seal Numbers', category: 'manual', variants: null },
  { code: 'vgm', name: 'VGM', category: 'generated', variants: ['LCL Shipment', 'FCL Shipment'] },
  { code: 'measurement_copy', name: 'Measurement Copy', category: 'uploaded', variants: null },
  { code: 'clp', name: 'CLP', category: 'uploaded', variants: null },
  { code: 'bl_draft', name: 'Bill of Lading (Draft)', category: 'generated', variants: null },
  { code: 'bl_final', name: 'Bill of Lading (Final)', category: 'uploaded', variants: null },
  { code: 'insurance', name: 'Insurance Certificate', category: 'uploaded', variants: null },
  { code: 'e_invoice', name: 'E-Invoice', category: 'generated', variants: null },
  { code: 'bank_docs', name: 'Docs to Bank', category: 'generated', variants: ['GR Waiver', 'Bill of Exchange'] },
  { code: 'buyer_docs', name: 'Buyer Docs', category: 'generated', variants: ['GR Release Email', 'Bill of Exchange Intimation'] },
  { code: 'goods_received_by_client', name: 'Goods Received by Client', category: 'manual', variants: null },
  { code: 'payment_received_swift', name: 'Payment Received (Swift Copy)', category: 'uploaded', variants: null },
  { code: 'payment_proof_eefc', name: 'Payment Proof to Bank (EEFC A/c)', category: 'uploaded', variants: null },
  { code: 'firc', name: 'FIRC', category: 'uploaded', variants: null },
  { code: 'bank_certificate', name: 'Bank Certificate', category: 'uploaded', variants: null },
  { code: 'ebrc', name: 'eBRC', category: 'uploaded', variants: null, closesShipment: true },
];

export async function up(connection) {
  for (let i = 0; i < TYPES.length; i++) {
    const t = TYPES[i];
    await connection.query(
      `INSERT IGNORE INTO document_checklist_types
        (code, name, category, variant_labels, closes_shipment, sort_order, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'active', NOW(), NOW())`,
      [t.code, t.name, t.category, t.variants ? JSON.stringify(t.variants) : null, t.closesShipment ? 1 : 0, i + 1]
    );
  }
}

export async function down(connection) {
  const codes = TYPES.map((t) => t.code);
  await connection.query(
    `DELETE FROM document_checklist_types WHERE code IN (${codes.map(() => '?').join(',')})`,
    codes
  );
}
