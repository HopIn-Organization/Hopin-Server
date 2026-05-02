import { Repository } from 'typeorm';
import { AppDataSource } from '../database/data-source';
import { OnBoarding } from './onBoarding.entity';
import { OnboardingStatus, OnboardingStatusResponse } from './onboarding.types';

export class OnboardingRepository {
  private onboardingRepository: Repository<OnBoarding>;

  constructor() {
    this.onboardingRepository = AppDataSource.getRepository(OnBoarding);
  }

  async getOnboarding(id: number): Promise<OnBoarding | null> {
    return this.onboardingRepository.findOne({
      where: { id },
      relations: { user: true, job: true, project: true, tasks: { subtasks: true } },
      order: { tasks: { order: 'ASC', subtasks: { order: 'ASC' } } },
    });
  }

  async getOnboardingByUserIdAndJobId(
    userId: number,
    jobId: number,
  ): Promise<OnBoarding | null> {
    return this.onboardingRepository.findOne({
      where: { user: { id: userId }, job: { id: jobId } },
      relations: { user: true, job: true, project: true, tasks: { subtasks: true } },
      order: { tasks: { order: 'ASC', subtasks: { order: 'ASC' } } },
    });
  }

  async getOnboardingsByProjectId(projectId: number): Promise<OnBoarding[]> {
    return this.onboardingRepository.find({
      where: { project: { id: projectId } },
      relations: { user: true, job: true, project: true, tasks: { subtasks: true } },
      order: { tasks: { order: 'ASC', subtasks: { order: 'ASC' } } },
    });
  }

  // TODO: remove the project relation from OnBoarding entirely — project is already
  // reachable via job (onboarding → job → project), so storing it here is redundant
  // and risks getting out of sync. Queries that filter or join by project should go
  // through the job relation instead.
  async updateStatus(id: number, status: OnboardingStatus, failureReason?: string): Promise<void> {
    await this.onboardingRepository.update({ id }, { status, failureReason: failureReason ?? null });
  }

  async getStatus(id: number): Promise<OnboardingStatusResponse | null> {
    const row = await this.onboardingRepository.findOne({
      where: { id },
      select: { id: true, status: true, failureReason: true },
    });
    if (!row) return null;
    return { id: row.id, status: row.status, failureReason: row.failureReason };
  }

  async createOnboarding(data: Partial<OnBoarding>): Promise<OnBoarding> {
    const onboarding = this.onboardingRepository.create({
      job: { id: data.jobId },
      user: { id: data.userId },
      project: { id: data.projectId },
    });

    return await this.onboardingRepository.save(onboarding);
  }
}
