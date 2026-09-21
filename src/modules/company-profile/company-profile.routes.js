import express from 'express';
import { companyProfileController } from './company-profile.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/rbac.middleware.js';

const router = express.Router();

router.use(authenticate);

router.get('/', requirePermission('company-profile.view'), companyProfileController.get);
router.put('/', requirePermission('company-profile.edit'), companyProfileController.update);

export default router;
