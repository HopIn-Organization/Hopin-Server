import { Router } from 'express';
import { OnboardingController } from './onboarding.controller';

const router = Router();
const onboardingController = new OnboardingController();

router.post('/onboarding/generate', onboardingController.generateOnboarding);

export default router;
