import { Router } from 'express';
import { generateOnboarding } from '../controllers/onboarding.controller';

const router = Router();

// POST /onboarding/generate
// Body: { userId: number, jobId: number, documents?: string[] }
router.post('/generate', generateOnboarding);

export default router;
