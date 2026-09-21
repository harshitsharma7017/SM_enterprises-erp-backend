import express from 'express';
import { packingController } from './packing.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/rbac.middleware.js';

const router = express.Router();

router.use(authenticate);

router.get('/', requirePermission('packing.view'), packingController.index);
router.get('/:id', requirePermission('packing.view'), packingController.show);

export default router;
