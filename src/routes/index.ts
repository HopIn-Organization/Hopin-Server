import { Router, Request, Response } from 'express';
import onboardingRoutes from './../onBoarding/onboarding.routes';
import userRoutes from '../user/user.routes';
import jobRoutes from '../job/job.routes';
import projectRoutes from '../project/project.routes';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.json({ message: 'Welcome to Hopin API' });
});

router.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

router.use('/users', userRoutes);
router.use('/jobs', jobRoutes);
router.use('/projects', projectRoutes);
router.use('/onboarding', onboardingRoutes);

export default router;
