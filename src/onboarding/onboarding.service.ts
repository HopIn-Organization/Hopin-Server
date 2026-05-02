import { DeepPartial } from 'typeorm';
import { AppDataSource } from '../database';
import { User } from '../database/entities/user.entity';
import { Job } from '../job/job.entity';
import { buildOnboardingPrompt } from '../prompts/onboarding.prompt';
import { LLMService } from '../services/llm.service';
import { Task } from '../task/task.entity';
import { TaskService } from '../task/task.service';
import { OnBoarding } from './onBoarding.entity';
import { OnboardingRepository } from './onBoarding.repository';

export interface GenerateOnboardingInput {
  userId: number;
  jobId: number;
  documents?: string[];
  daysDuration: number;
}

export type OnboardingWithProgress = OnBoarding & { progress: number };

export class OnboardingService {
  private llmService: LLMService;
  private taskService: TaskService;
  private onboardingRepository: OnboardingRepository;

  constructor() {
    this.llmService = new LLMService();
    this.taskService = new TaskService();
    this.onboardingRepository = new OnboardingRepository();
  }

  private calculateProgress(onboarding: OnBoarding): number {
    const tasks = onboarding.tasks ?? [];
    const totalDays = tasks.reduce((sum, t) => sum + t.estimatedDays, 0);
    const completedDays = tasks
      .filter((t) => t.isCompleted)
      .reduce((sum, t) => sum + t.estimatedDays, 0);
    return +(totalDays > 0 ? (completedDays / totalDays) * 100 : 0).toFixed(2);
  }

  private withProgress(onboarding: OnBoarding): OnboardingWithProgress {
    return { ...onboarding, progress: this.calculateProgress(onboarding) };
  }

  async getOnBoardingById(id: number): Promise<OnboardingWithProgress | null> {
    const onboarding = await this.onboardingRepository.getOnboarding(id);
    return onboarding ? this.withProgress(onboarding) : null;
  }

  async getOnboardingsByProject(projectId: number): Promise<OnboardingWithProgress[]> {
    const onboardings = await this.onboardingRepository.getOnboardingsByProjectId(projectId);
    return onboardings.map((o) => this.withProgress(o));
  }

  async getOnboarding(
    userId: number,
    jobId: number,
  ): Promise<OnboardingWithProgress | null> {
    const onboarding = await this.onboardingRepository.getOnboardingByUserIdAndJobId(
      userId,
      jobId
    );
    return onboarding ? this.withProgress(onboarding) : null;
  }

  async startGeneration(input: GenerateOnboardingInput): Promise<number> {
    const { userId, jobId } = input;

    const userRepo = AppDataSource.getRepository(User);
    const jobRepo = AppDataSource.getRepository(Job);

    const [user, job] = await Promise.all([
      userRepo.findOne({ where: { id: userId }, relations: { skills: true } }),
      jobRepo.findOne({ where: { id: jobId }, relations: { skills: true, project: true } }),
    ]);

    if (!user) throw new Error(`User with id ${userId} not found`);
    if (!job) throw new Error(`Job with id ${jobId} not found`);
    if (!job.project) throw new Error(`Job with id ${jobId} is not associated with any project`);

    const onboarding = await this.onboardingRepository.createOnboarding({
      userId: user.id,
      jobId: job.id,
      projectId: job.project.id,
    });

    console.log(`[Onboarding] Created onboarding record id=${onboarding.id}`);
    return onboarding.id;
  }

  async runGeneration(onboardingId: number, input: GenerateOnboardingInput): Promise<void> {
    const { userId, jobId, documents = [], daysDuration } = input;

    try {
      await this.onboardingRepository.updateStatus(onboardingId, 'generating');

      const userRepo = AppDataSource.getRepository(User);
      const jobRepo = AppDataSource.getRepository(Job);

      const [user, job] = await Promise.all([
        userRepo.findOne({ where: { id: userId }, relations: { skills: true } }),
        jobRepo.findOne({ where: { id: jobId }, relations: { skills: true, project: true } }),
      ]);

      if (!user) throw new Error(`User with id ${userId} not found`);
      if (!job) throw new Error(`Job with id ${jobId} not found`);
      if (!job.project) throw new Error(`Job with id ${jobId} is not associated with any project`);

      const prompt = buildOnboardingPrompt({
        onboardingId,
        userName: user.name,
        userExperienceYears: user.experienceYears,
        userSkills: user.skills.map(s => s.name),
        jobTitle: job.title,
        jobRequiredSkills: job.skills.map(s => s.name),
        projectName: job.project.name,
        projectDescription: job.project.description,
        documents,
        daysDuration,
      });

      console.log(`[Onboarding] Sending prompt to LLM for onboarding id=${onboardingId}`);
      const tasks = await this.llmService.generateOnboardingTasks(prompt);
      console.log(`[Onboarding] LLM returned ${tasks.length} tasks for onboarding id=${onboardingId}`);

      // Fetch the OnBoarding entity for the relation reference
      const onboardingEntity = { id: onboardingId } as OnBoarding;

      const savedParents = await this.taskService.createTasks(
        tasks.map(task => ({ ...task, subtasks: undefined, onboarding: onboardingEntity }))
      );

      const parentByOrder = new Map(savedParents.map((p) => [p.order, p]));

      const subtaskData: DeepPartial<Task>[] = tasks.flatMap((task) => {
        const parent = parentByOrder.get(task.order);
        if (!parent) return [];
        return (task.subtasks ?? []).map((sub, j) => ({
          title: sub.title,
          description: sub.description,
          estimatedDays: sub.estimatedDays,
          links: sub.links,
          isCompleted: false,
          order: j + 1,
          parent: { id: parent.id },
        }));
      });

      if (subtaskData.length > 0) {
        await this.taskService.createTasks(subtaskData);
      }

      await this.onboardingRepository.updateStatus(onboardingId, 'ready');
      console.log(`[Onboarding] Generation complete for onboarding id=${onboardingId}`);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      console.error(`[Onboarding] Generation failed for onboarding id=${onboardingId}:`, reason);
      await this.onboardingRepository.updateStatus(onboardingId, 'failed', reason);
    }
  }

  async getOnboardingStatus(id: number) {
    return this.onboardingRepository.getStatus(id);
  }
}
