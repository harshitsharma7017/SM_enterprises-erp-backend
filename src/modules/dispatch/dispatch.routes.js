import express from 'express';
import { dispatchController } from './dispatch.controller.js';
import { dispatchValidator } from './dispatch.validator.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requirePermission, requireAnyPermission } from '../../middleware/rbac.middleware.js';
import { validate } from '../../middleware/validation.middleware.js';

// One dispatch system: finished stock against orders, and direct supplier (mill) dispatch.
const router = express.Router();

router.use(authenticate);

router.get('/', requirePermission('dispatch.view'), dispatchController.index);
router.get('/form-data', requireAnyPermission(['dispatch.create', 'dispatch.edit']), dispatchController.formData);
router.get('/:id', requirePermission('dispatch.view'), dispatchController.show);
router.post('/', requirePermission('dispatch.create'), validate(dispatchValidator.create), dispatchController.create);
router.put('/:id', requirePermission('dispatch.edit'), validate(dispatchValidator.update), dispatchController.update);
router.post('/:id/post', requirePermission('dispatch.post'), dispatchController.post);
router.post('/:id/cancel', requirePermission('dispatch.cancel'), validate(dispatchValidator.cancel), dispatchController.cancel);

export default router;
