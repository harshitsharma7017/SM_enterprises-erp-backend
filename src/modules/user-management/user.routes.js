import express from 'express';
import { userController } from './user.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';

// The Laravel application didn't specify explicit permissions for users/roles in the docs, 
// usually this implies 'user.view' or a generic superadmin check. 
// We will apply authenticate and a placeholder check if needed, but for now just auth.
// Wait, original-erp-route-inventory.md didn't show permission name, it was blank!
// We will just use auth, and in controller we can use rbacRepository.hasSuperAdminRole if needed.
const router = express.Router();

router.use(authenticate);

router.get('/', userController.index);
router.post('/', userController.store);
router.get('/:user', userController.show);
router.put('/:user', userController.update);
router.patch('/:user/toggle-status', userController.toggleStatus);
router.delete('/:user', userController.destroy);

export default router;
