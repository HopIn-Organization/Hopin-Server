import { Repository } from 'typeorm';
import { AppDataSource } from '../database/data-source';
import { Onboarding } from './onBoarding.entity';

export class OnboardingRepository {
  private onboardingRepository: Repository<Onboarding>;

  constructor() {
    this.onboardingRepository = AppDataSource.getRepository(Onboarding);
  }

  async getOnboarding(id: number): Promise<Onboarding | null> {
    return this.onboardingRepository.findOne({
      where: { id },
      relations: {user: true, job: true, project: true, tasks: true},
    });
  }

  async createOnboarding(data: Partial<Onboarding>): Promise<Onboarding> {
    const onboarding = this.onboardingRepository.create(data);
    
    await this.onboardingRepository.insert(onboarding);

    return onboarding;
  }
}