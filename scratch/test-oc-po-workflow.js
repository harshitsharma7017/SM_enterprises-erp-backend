import { pool } from '../src/config/database.js';
import { orderConfirmationService } from '../src/modules/order-confirmation/order-confirmation.service.js';
import { purchaseOrderRepository } from '../src/modules/purchase-order/purchase-order.repository.js';
import { inquiryService } from '../src/modules/inquiry/inquiry.service.js';

async function run() {
  try {
    const [[user]] = await pool.query("SELECT id FROM users LIMIT 1");
    const userId = user ? user.id : 1;

    const [[buyer]] = await pool.query('SELECT id FROM buyers LIMIT 1');
    const [[category]] = await pool.query('SELECT id FROM categories LIMIT 1');
    const [[format]] = await pool.query('SELECT id FROM document_formats LIMIT 1');
    const [[supplier1]] = await pool.query('SELECT id FROM suppliers LIMIT 1 OFFSET 0');
    const [[supplier2]] = await pool.query('SELECT id FROM suppliers LIMIT 1 OFFSET 1');
    const [[currency]] = await pool.query('SELECT id FROM currencies LIMIT 1');

    console.log('1. Creating Inquiry...');
    const inquiryData = {
      inquiry_date: new Date().toISOString().split('T')[0],
      buyer_id: buyer.id,
      category_id: category.id,
      document_format_id: format.id,
      currency_id: currency.id,
      status: 'quote_sent',
      items: [
        { supplier_id: supplier1.id, qty: 10, price: 100, cost_price: 80, status: 'confirmed' },
        { supplier_id: supplier2 ? supplier2.id : supplier1.id, qty: 20, price: 200, cost_price: 150, status: 'confirmed' },
        { supplier_id: supplier1.id, qty: 5, price: 50, cost_price: 40, status: 'draft' }
      ]
    };
    
    const inquiry = await inquiryService.create(inquiryData, userId);
    console.log(`Created Inquiry ID: ${inquiry.id}, Num: ${inquiry.inquiry_num}`);

    console.log('\n2. Converting to OC...');
    const oc = await orderConfirmationService.convertFromInquiry(inquiry.id, userId);
    console.log(`Created OC ID: ${oc.id}, Num: ${oc.oc_num}`);

    console.log('\n3. Raising POs...');
    await pool.query('UPDATE order_confirmations SET status = "confirmed" WHERE id = ?', [oc.id]);
    
    const itemIds = oc.items.map(i => i.id);
    const pos = await orderConfirmationService.raisePurchaseOrders(oc.id, itemIds, userId);
    
    console.log(`Created POs: ${pos.map(p => p.po_num).join(', ')}`);

    for (const p of pos) {
      const poDetails = await purchaseOrderRepository.findById(p.id);
      console.log(`\nPO ${poDetails.po_num} items: ${poDetails.items.length}, total amount: ${poDetails.items.reduce((sum, i) => sum + parseFloat(i.amount), 0)}`);
    }

    console.log('\nWorkflow Test Successful!');
    process.exit(0);

  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}
run();
