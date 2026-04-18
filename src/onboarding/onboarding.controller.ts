import { NextFunction, Request, Response } from 'express';
import { OnboardingService } from './onboarding.service';

export class OnboardingController {
  private onboardingService: OnboardingService;

  constructor() {
    this.onboardingService = new OnboardingService();
  }

  generateOnboarding = async (
    req: Request,
    res: Response,
    next: NextFunction
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
        res
          .status(400)
          .json({ error: 'documents must be an array of strings' });
        return;
      }

      const onBoarding = await this.onboardingService.generateBoard({
        userId,
        jobId,
        documents,
      });

      res.status(200).json({ onBoarding });
    } catch (error) {
      next(error);
    }
  };

  getOnboarding = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = parseInt(req.params.userId as string);
      const jobId = parseInt(req.params.jobId as string);

      if (isNaN(userId) || isNaN(jobId)) {
        res
          .status(400)
          .json({ error: 'userId and jobId must be valid numbers' });
        return;
      }

      const onboarding = await this.onboardingService.getOnboarding(
        userId,
        jobId
      );

      if (!onboarding) {
        res.status(404).json({ error: 'Onboarding not found' });
        return;
      }

      res.status(200).json({ onboarding });
    } catch (error) {
      next(error);
    }
  };
}

export const onboardingController = new OnboardingController();
