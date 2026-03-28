import { Router, Request, Response } from 'express';
import userRoutes from '../user/user.routes';
import jobRoutes from '../job/job.routes';
import projectRoutes from '../project/project.routes';
import onboardingRoutes from './onboarding.routes';

const router = Router();

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

export default router;
