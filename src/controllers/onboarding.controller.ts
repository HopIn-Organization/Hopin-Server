import { NextFunction, Request, Response } from 'express';
import { OnboardingService } from '../services/onboarding.service';

const onboardingService = new OnboardingService();

export const generateOnboarding = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { userId, jobId, documents } = req.body;

    if (!userId || !jobId) {
      res.status(400).json({ error: 'userId and jobId are required' });
      return;
    }

    if (typeof userId !== 'number' || typeof jobId !== 'number') {
      res.status(400).json({ error: 'userId and jobId must be numbers' });
      return;
    }

    if (documents !== undefined && !Array.isArray(documents)) {
      res.status(400).json({ error: 'documents must be an array of strings' });
      return;
    }

    const tasks = await onboardingService.generateBoard({ userId, jobId, documents });

    res.status(200).json({ tasks });
  } catch (error) {
    next(error);
  }
};
