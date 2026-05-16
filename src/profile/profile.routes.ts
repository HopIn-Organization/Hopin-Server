import { Router } from 'express';
import { ProfileController } from './profile.controller';

const router = Router();
const profileController = new ProfileController();

router.get('/me', profileController.getProfile);
router.put('/me', profileController.updateProfile);

export default router;
