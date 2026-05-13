import { Router } from 'express';
import { onboardingController } from './onboarding.controller';
import { requireProjectAdmin } from '../projectMember/projectMember.middleware';

const router = Router();

router.get('/:id/status', onboardingController.getOnboardingStatus);
router.get('/user/:userId/job/:jobId', onboardingController.getOnboarding);
router.get('/id/:id', onboardingController.getOnboardingById);
router.get('/project/:projectId', onboardingController.getOnboardingsByProject);
router.post('/generate', requireProjectAdmin, onboardingController.generateOnboarding);

export default router;
