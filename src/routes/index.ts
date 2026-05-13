import { Router, Request, Response } from 'express';
import onboardingRoutes from '../onboarding/onboarding.routes';
import userRoutes from '../user/user.routes';
import jobRoutes from '../job/job.routes';
import projectRoutes from '../project/project.routes';
import taskRoutes from '../task/task.routes';
import { authenticateAccessToken } from '../auth/auth.middleware';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.json({ message: 'Welcome to Hopin API' });
});

router.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

router.use('/users', userRoutes);
router.use('/jobs', authenticateAccessToken, jobRoutes);
router.use('/projects', authenticateAccessToken, projectRoutes);
router.use('/onboarding', authenticateAccessToken, onboardingRoutes);
router.use('/tasks', authenticateAccessToken, taskRoutes);

export default router;
