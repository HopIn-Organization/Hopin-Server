import { Repository } from 'typeorm';
import { AppDataSource } from '../database/data-source';
import { Onboarding } from './onBoarding.entity';
import { log } from 'console';

export class OnboardingRepository {
  private onboardingRepository: Repository<Onboarding>;

  constructor() {
    this.onboardingRepository = AppDataSource.getRepository(Onboarding);
  }

  async getOnboarding(id: number): Promise<Onboarding | null> {
    return this.onboardingRepository.findOne({
      where: { id },
      relations: { user: true, job: true, project: true, tasks: true },
    });
  }

  async getOnboardingByUserIdAndJobId(
    userId: number,
    jobId: number
  ): Promise<Onboarding | null> {
    return this.onboardingRepository.findOne({
      where: { user: { id: userId }, job: { id: jobId } },
      relations: { user: true, job: true, project: true, tasks: true },
    });
  }

  async createOnboarding(data: Partial<Onboarding>): Promise<Onboarding> {
    const onboarding = this.onboardingRepository.create({
      job: { id: data.jobId },
      user: { id: data.userId },
      project: { id: 1 },
    });

    return await this.onboardingRepository.save(onboarding);
  }
}
