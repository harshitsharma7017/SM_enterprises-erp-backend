import express from 'express';
import { reportController } from './report.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/rbac.middleware.js';

const router = express.Router();

router.use(authenticate);

router.get('/', requirePermission('report.view'), reportController.index);
router.get('/outstanding', requirePermission('outstanding.view'), reportController.outstanding);

export default router;
