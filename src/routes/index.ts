import { Router, Request, Response } from 'express';
import { authenticateAccessToken } from '../auth/auth.middleware';
import authRoutes from '../auth/auth.routes';
import onboardingRoutes from '../onboarding/onboarding.routes';
import userRoutes from '../user/user.routes';
import jobRoutes from '../job/job.routes';
import projectRoutes from '../project/project.routes';
import taskRoutes from '../task/task.routes';
import profileRoutes from '../profile/profile.routes';
import documentRoutes from '../document/document.routes';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.json({ message: 'Welcome to Hopin API' });
});

router.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

router.use('/', authRoutes);
router.use('/users', authenticateAccessToken, userRoutes);
router.use('/jobs', authenticateAccessToken, jobRoutes);
router.use('/projects', authenticateAccessToken, projectRoutes);
router.use('/projects', authenticateAccessToken, documentRoutes);
router.use('/onboarding', authenticateAccessToken, onboardingRoutes);
router.use('/tasks', authenticateAccessToken, taskRoutes);
router.use('/profile', authenticateAccessToken, profileRoutes);

export default router;
