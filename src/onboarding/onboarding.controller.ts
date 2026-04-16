import { Request, Response } from 'express';
import { OnboardingService } from './onboarding.service';

export class OnboardingController {
  private onboardingService: OnboardingService;

  constructor() {
    this.onboardingService = new OnboardingService();
  }

  generateOnboarding = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId, jobId, documents } = req.body;

      if (!userId || !jobId) {
        res.status(400).json({ message: 'userId and jobId are required' });
        return;
      }

      if (typeof userId !== 'number' || typeof jobId !== 'number') {
        res.status(400).json({ message: 'userId and jobId must be numbers' });
        return;
      }

      if (documents !== undefined && !Array.isArray(documents)) {
        res.status(400).json({ message: 'documents must be an array of strings' });
        return;
      }

      const tasks = await this.onboardingService.generateBoard({ userId, jobId, documents });

      res.status(200).json({ tasks });
    } catch (error) {
      res.status(500).json({ message: 'Error generating onboarding board' });
    }
  };
}
