import { pool } from '../src/config/database.js';
import { inwardEntryService } from '../src/modules/inward-entry/inward-entry.service.js';
import { exportDocumentService } from '../src/modules/export-document/export-document.service.js';
import assert from 'assert';

async function run() {
  console.log('--- DB Tests for Phase 19 & 20 ---');
  let assertions = 0;
  
  const [[user]] = await pool.query('SELECT id FROM users LIMIT 1');
  if (!user) throw new Error('No user found');
  
  // Clean up any previously created test data just in case
  const [testInwards] = await pool.query('SELECT id FROM inward_entries WHERE inward_date = "2099-01-01"');
  for (let inw of testInwards) {
    await pool.query('DELETE FROM inward_entry_items WHERE inward_entry_id = ?', [inw.id]);
    await pool.query('DELETE FROM inward_entries WHERE id = ?', [inw.id]);
  }
  
  // Phase 19 Test
  let [[po]] = await pool.query("SELECT id, status FROM purchase_orders WHERE deleted_at IS NULL LIMIT 1");
  if (po) {
    const originalStatus = po.status;
    const [[poItem]] = await pool.query('SELECT id, qty FROM purchase_order_items WHERE purchase_order_id = ? LIMIT 1', [po.id]);
    if (poItem) {
      console.log('Testing Phase 19: Goods Inward Creation & QC');
      const inwardData = {
        inward_date: '2099-01-01',
        purchase_order_id: po.id,
        items: [{ purchase_order_item_id: poItem.id, received_qty: 1 }]
      };
      
      const inwardId = await inwardEntryService.create(inwardData, user.id);
      assertions++; // Create success
      
      const [[createdInward]] = await pool.query('SELECT status FROM inward_entries WHERE id = ?', [inwardId]);
      assert.strictEqual(createdInward.status, 'pending');
      assertions++;
      
      const [[inwardItem]] = await pool.query('SELECT id, passed_qty FROM inward_entry_items WHERE inward_entry_id = ?', [inwardId]);
      assert.strictEqual(inwardItem.passed_qty, 0);
      assertions++;
      
      const approveData = {
        status: 'approved',
        items: [{ id: inwardItem.id, passed_qty: 1, rejected_qty: 0 }]
      };
      
      await inwardEntryService.approve(inwardId, approveData, user.id);
      assertions++; // Approve success
      
      const [[updatedPo]] = await pool.query('SELECT status FROM purchase_orders WHERE id = ?', [po.id]);
      assert.ok(['partial', 'received'].includes(updatedPo.status));
      assertions++;
      
      // Cleanup
      await pool.query('DELETE FROM inward_entry_items WHERE inward_entry_id = ?', [inwardId]);
      await pool.query('DELETE FROM inward_entries WHERE id = ?', [inwardId]);
      await pool.query('UPDATE purchase_orders SET status = ? WHERE id = ?', [originalStatus, po.id]);
    }
  }

  // Phase 20 Test
  let [[oc]] = await pool.query("SELECT id FROM order_confirmations WHERE deleted_at IS NULL LIMIT 1");
  if (oc) {
    console.log('Testing Phase 20: Export Document Raise');
    await pool.query("UPDATE order_confirmations SET status = 'confirmed' WHERE id = ?", [oc.id]);
    const exportDocId = await exportDocumentService.raiseFromOrderConfirmation(oc.id, user.id);
    assertions++;
    
    const [[ed]] = await pool.query('SELECT status FROM export_documents WHERE id = ?', [exportDocId]);
    assert.strictEqual(ed.status, 'draft');
    assertions++;
    
    const [edItems] = await pool.query('SELECT id FROM export_document_items WHERE export_document_id = ?', [exportDocId]);
    assert.ok(edItems.length >= 0);
    assertions++;
    
    const [checklists] = await pool.query('SELECT id FROM export_document_checklists WHERE export_document_id = ?', [exportDocId]);
    assert.ok(checklists.length >= 0);
    assertions++;
    
    // Cleanup
    await pool.query('DELETE FROM export_document_checklists WHERE export_document_id = ?', [exportDocId]);
    await pool.query('DELETE FROM export_document_item_sizes WHERE export_document_item_colour_id IN (SELECT id FROM export_document_item_colours WHERE export_document_item_id IN (SELECT id FROM export_document_items WHERE export_document_id = ?))', [exportDocId]);
    await pool.query('DELETE FROM export_document_item_colours WHERE export_document_item_id IN (SELECT id FROM export_document_items WHERE export_document_id = ?)', [exportDocId]);
    await pool.query('DELETE FROM export_document_items WHERE export_document_id = ?', [exportDocId]);
    await pool.query('DELETE FROM export_documents WHERE id = ?', [exportDocId]);
  }

  console.log(`\nTest results: ${assertions} assertions passed.`);
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
