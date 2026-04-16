import { Router } from 'express';
import { AuthController } from './auth.controller';
import { authenticateAccessToken } from './auth.middleware';

const router = Router();
const authController = new AuthController();

router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.post('/auth/refresh', authController.refresh);
router.post('/auth/logout', authenticateAccessToken, authController.logout);

export default router;