import { Router } from 'express';
import { authController } from '../controllers/auth.controller.js';
import { validateLogin } from '../validators/auth.validator.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/login', validateLogin, authController.login);
router.get('/me', authenticate, authController.me);
router.post('/logout', authController.logout);

export default router;
