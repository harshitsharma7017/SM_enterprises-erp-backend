import express from 'express';
import { userController } from './user.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/rbac.middleware.js';

// Original ERP: UserController::middleware() — user.view (index/show),
// user.create (create/store), user.edit (edit/update/toggleStatus),
// user.delete (destroy).
const router = express.Router();

router.use(authenticate);

router.get('/', requirePermission('user.view'), userController.index);
router.post('/', requirePermission('user.create'), userController.store);
router.get('/:user', requirePermission('user.view'), userController.show);
router.put('/:user', requirePermission('user.edit'), userController.update);
router.patch('/:user/toggle-status', requirePermission('user.edit'), userController.toggleStatus);
router.delete('/:user', requirePermission('user.delete'), userController.destroy);

export default router;
