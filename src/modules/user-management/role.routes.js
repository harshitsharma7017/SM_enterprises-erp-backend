import express from 'express';
import { roleController } from './role.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/rbac.middleware.js';

const router = express.Router();

router.use(authenticate);

router.get('/roles', requirePermission('role.view'), roleController.index);
router.post('/roles', requirePermission('role.create'), roleController.store);
router.get('/roles/:role', requirePermission('role.view'), roleController.show);
router.put('/roles/:role', requirePermission('role.edit'), roleController.update);
router.delete('/roles/:role', requirePermission('role.delete'), roleController.destroy);

router.get('/permissions', requirePermission('permission.view'), roleController.permissions);
router.post('/permissions/sync', requirePermission('permission.sync'), roleController.syncPermissions);

export default router;
