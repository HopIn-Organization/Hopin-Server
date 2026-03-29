import { Router, Request, Response } from 'express';
import onboardingRoutes from './../onBoarding/onboarding.routes';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.json({ message: 'Welcome to Hopin API' });
});

router.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

router.use('/onboarding', onboardingRoutes);

export default router;
