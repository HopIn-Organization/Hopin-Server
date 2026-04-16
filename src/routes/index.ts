import { Router, Request, Response } from 'express';
import onboardingRoutes from './onboarding.routes';
import authRoutes from '../auth/auth.routes';
import userRoutes from '../user/user.routes';
import jobRoutes from '../job/job.routes';
import projectRoutes from '../project/project.routes';
import onboardingRoutes from '../onboarding/onboarding.routes';

const router = Router();

router.use('/', authRoutes);
router.use('/', userRoutes);
router.use('/', jobRoutes);
router.use('/', projectRoutes);
router.use('/onboarding', onboardingRoutes);

router.get('/', (_req: Request, res: Response) => {
  res.json({ message: 'Welcome to Hopin API' });
});

router.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

router.use('/onboarding', onboardingRoutes);

export default router;
