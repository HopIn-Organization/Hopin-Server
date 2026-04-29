import { Repository } from 'typeorm';
import { AppDataSource } from '../database/data-source';
import { OnBoarding } from './onBoarding.entity';

export class OnboardingRepository {
  private onboardingRepository: Repository<OnBoarding>;

  constructor() {
    this.onboardingRepository = AppDataSource.getRepository(OnBoarding);
  }

  async getOnboarding(id: number): Promise<OnBoarding | null> {
    return this.onboardingRepository.findOne({
      where: { id },
      relations: { user: true, job: true, project: true, tasks: true },
    });
  }

  async getOnboardingByUserIdAndJobId(
    userId: number,
    jobId: number
  ): Promise<OnBoarding | null> {
    return this.onboardingRepository.findOne({
      where: { user: { id: userId }, job: { id: jobId } },
      relations: { user: true, job: true, project: true, tasks: true },
    });
  }

  async createOnboarding(data: Partial<OnBoarding>): Promise<OnBoarding> {
    const onboarding = this.onboardingRepository.create({
      job: { id: data.jobId },
      user: { id: data.userId },
      project: { id: 1 },
    });

    return await this.onboardingRepository.save(onboarding);
  }
}
