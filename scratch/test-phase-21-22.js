import { pool } from '../src/config/database.js';
import assert from 'assert';
import { exportDocumentService } from '../src/modules/export-document/export-document.service.js';
import { packingController } from '../src/modules/packing/packing.controller.js';
import { financeRepository } from '../src/modules/finance/finance.repository.js';
import { reportRepository } from '../src/modules/report/report.repository.js';
import { userRepository } from '../src/modules/user-management/user.repository.js';
import { companyProfileRepository } from '../src/modules/company-profile/company-profile.repository.js';

async function runTests() {
  console.log('--- DB Tests for Phase 21 & 22 ---');
  let assertions = 0;
  
  // Backup company profile
  const originalProfile = await companyProfileRepository.get();

  try {
    const [user] = await pool.query('SELECT id FROM users LIMIT 1');
    const userId = user.length > 0 ? user[0].id : null;

    // We need an export document for packing tests
    const [ed] = await pool.query('SELECT id, buyer_id, currency_id FROM export_documents LIMIT 1');
    if (ed.length > 0) {
      console.log('Testing Phase 21: Packing Extensions');
      const exportDocId = ed[0].id;
      
      const payload = {
        buyer_id: ed[0].buyer_id,
        currency_id: ed[0].currency_id,
        status: 'draft',
        total_cartons: 15,
        net_weight: 200.5,
        gross_weight: 210.0,
        vessel_flight_no: 'TEST-FLIGHT-456',
        cartons: [
          {
            carton_no: 'C-001',
            net_weight: 15.0,
            gross_weight: 16.0,
            dimensions: '50x50x50',
            lines: [
              { description: 'Test Line 1', qty: 100, unit: 'PCS' },
              { description: 'Test Line 2', qty: 50, unit: 'PCS' }
            ]
          },
          {
            carton_no: 'C-002',
            net_weight: 10.0,
            gross_weight: 11.0,
            dimensions: '40x40x40',
            lines: [
              { description: 'Test Line 3', qty: 200, unit: 'PCS' }
            ]
          }
        ]
      };
      
      await exportDocumentService.update(exportDocId, payload, userId);
      
      const [updatedEd] = await pool.query('SELECT total_cartons, vessel_flight_no, gross_weight, net_weight FROM export_documents WHERE id = ?', [exportDocId]);
      assert.strictEqual(updatedEd[0].total_cartons, 15);
      assert.strictEqual(updatedEd[0].vessel_flight_no, 'TEST-FLIGHT-456');
      assert.strictEqual(parseFloat(updatedEd[0].gross_weight), 210.0);
      assert.strictEqual(parseFloat(updatedEd[0].net_weight), 200.5);
      assertions += 4;
      
      const [cartons] = await pool.query('SELECT id, carton_no, gross_weight, net_weight, dimensions FROM export_document_cartons WHERE export_document_id = ? ORDER BY carton_no', [exportDocId]);
      assert.strictEqual(cartons.length, 2);
      assert.strictEqual(cartons[0].carton_no, 'C-001');
      assert.strictEqual(cartons[1].carton_no, 'C-002');
      assert.strictEqual(parseFloat(cartons[0].gross_weight), 16.0);
      assert.strictEqual(parseFloat(cartons[1].gross_weight), 11.0);
      assertions += 5;
      
      const [lines] = await pool.query('SELECT description FROM export_document_carton_lines WHERE export_document_carton_id = ?', [cartons[0].id]);
      assert.strictEqual(lines.length, 2);
      assertions += 1;

      // Check Packing Controller retrieval
      const mockReq = { query: {} };
      const mockRes = {
        json: (data) => {
          assert.ok(data.data);
          assertions += 1;
        }
      };
      await packingController.index(mockReq, mockRes);
      
      const mockReqShow = { params: { id: exportDocId } };
      const mockResShow = {
        json: (data) => {
          assert.strictEqual(data.data.id, exportDocId);
          assert.strictEqual(data.data.cartons.length, 2);
          assertions += 2;
        }
      };
      await packingController.show(mockReqShow, mockResShow);
    }

    console.log('Testing Phase 22: Finance Reports');
    const pb = await financeRepository.getPurchaseBills({}, 10, 0);
    assert.ok(pb.data);
    const sp = await financeRepository.getSupplierPayments({}, 10, 0);
    assert.ok(sp.data);
    const dn = await financeRepository.getDebitNotes({}, 10, 0);
    assert.ok(dn.data);
    const br = await financeRepository.getBuyerReceipts({}, 10, 0);
    assert.ok(br.data);
    const ac = await financeRepository.getAgentCommission({}, 10, 0);
    assert.ok(ac.data);
    assertions += 5;

    console.log('Testing Phase 22: Reports');
    const out = await reportRepository.getOutstanding({}, 10, 0);
    assert.ok(out.data);
    const gr = await reportRepository.getIndex({}, 10, 0);
    assert.ok(gr.data);
    assertions += 2;

    console.log('Testing Phase 22: Admin (Company Profile)');
    await companyProfileRepository.update({
      company_name: 'Test Company LLC',
      email: 'test@example.com'
    });
    const cp = await companyProfileRepository.get();
    assert.strictEqual(cp.company_name, 'Test Company LLC');
    assert.strictEqual(cp.email, 'test@example.com');
    assertions += 2;

    // Restore Company Profile
    await companyProfileRepository.update(originalProfile);
    
    // Testing Admin (Users)
    console.log('Testing Phase 22: Admin (Users)');
    const testEmail = `test_admin_${Date.now()}@example.com`;
    const conn = await pool.getConnection();
    let newUser;
    try {
      await conn.beginTransaction();
      newUser = await userRepository.create(conn, {
        name: 'Test User',
        email: testEmail,
        password: 'password123',
        role_ids: [1],
        is_active: 1
      });
      await conn.commit();
      assert.ok(newUser);
      assertions += 1;
      
      try {
        await conn.beginTransaction();
        await userRepository.create(conn, {
          name: 'Duplicate User',
          email: testEmail, // duplicate email
          password: 'password123',
          role_ids: [1]
        });
        await conn.commit();
        assert.fail('Duplicate email should have been rejected');
      } catch (e) {
        await conn.rollback();
        assert.ok(e.message.includes('Duplicate entry') || e.message.includes('already exists'));
        assertions += 1;
      }

      await conn.beginTransaction();
      await userRepository.update(conn, newUser, { 
        name: 'UpdatedName',
        email: testEmail,
        is_active: 1
      });
      await conn.commit();
      
      const uAfterUpdate = await userRepository.findById(newUser);
      assert.strictEqual(uAfterUpdate.name, 'UpdatedName');
      assertions += 1;

    } finally {
      conn.release();
    }

    await userRepository.delete(newUser);
    const uAfterDelete = await userRepository.findById(newUser);
    assert.strictEqual(uAfterDelete, null);
    assertions += 1;

    console.log(`\nTest results: ${assertions} assertions passed.`);
    process.exit(0);
  } catch (error) {
    console.error('Test Failed:', error);
    
    // Attempt restore even on fail
    await companyProfileRepository.update(originalProfile);
    process.exit(1);
  }
}

runTests();
