import express from 'express';
import { lotController } from './lot.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/rbac.middleware.js';

// Lots are part of receiving, so they share the goods-receipt view permission.
const router = express.Router();

router.use(authenticate);

// GET /api/procurement/lots
router.get('/', requirePermission('inward-entry.view'), lotController.index);

// GET /api/procurement/lots/:id
router.get('/:id', requirePermission('inward-entry.view'), lotController.show);

export default router;
