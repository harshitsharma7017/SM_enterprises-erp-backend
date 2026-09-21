import express from 'express';
import { financeController } from './finance.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/rbac.middleware.js';

const router = express.Router();

router.use(authenticate);

router.get('/purchase-bills', requirePermission('purchase-bill.view'), financeController.purchaseBills);
router.get('/debit-notes', requirePermission('debit-note.view'), financeController.debitNotes);
router.get('/supplier-payments', requirePermission('payment.view'), financeController.supplierPayments);
router.get('/buyer-receipts', requirePermission('foreign-payment.view'), financeController.buyerReceipts);
router.get('/agent-commission', requirePermission('agent-commission.view'), financeController.agentCommission);

export default router;
