import { Router } from 'express';
import { onboardingController } from './onboarding.controller';

const router = Router();

router.get('/:id/status', onboardingController.getOnboardingStatus);
router.get('/user/:userId/job/:jobId', onboardingController.getOnboarding);
router.get('/id/:id', onboardingController.getOnboardingById);
router.get('/project/:projectId', onboardingController.getOnboardingsByProject);
router.post('/generate', onboardingController.generateOnboarding);

export default router;
