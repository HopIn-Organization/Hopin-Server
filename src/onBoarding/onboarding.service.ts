import { AppDataSource } from '../database';
import { Job } from '../database/entities/job.entity';
import { User } from '../database/entities/user.entity';
import { buildOnboardingPrompt } from '../prompts/onboarding.prompt';
import { LLMService } from '../services/llm.service';
import { Task } from '../task/task.entity';
import { TaskService } from '../task/task.service';
import { Onboarding } from './onBoarding.entity';
import { OnboardingRepository } from './onBoarding.repository';

export interface GenerateOnboardingInput {
  userId: number;
  jobId: number;
  documents?: string[];
}

export class OnboardingService {
  private llmService: LLMService;
  private taskService: TaskService;
  private onboardingRepository: OnboardingRepository;

  constructor() {
    this.llmService = new LLMService();
    this.taskService = new TaskService();
    this.onboardingRepository = new OnboardingRepository();
  }


  async getOnBoardingById(id: number): Promise<Onboarding | null> {
    return this.onboardingRepository.getOnboarding(id);
  }

  async generateBoard(input: GenerateOnboardingInput): Promise<Onboarding> {
    const { userId, jobId, documents = [] } = input;

    const userRepo = AppDataSource.getRepository(User);
    const jobRepo = AppDataSource.getRepository(Job);

    const [user, job] = await Promise.all([
      userRepo.findOne({
        where: { id: userId },
        relations: ['skills'],
      }),
      jobRepo.findOne({
        where: { id: jobId },
        relations: ['skills', 'project'],
      }),
    ]);

    if (!user) {
      throw new Error(`User with id ${userId} not found`);
    }
    if (!job) {
      throw new Error(`Job with id ${jobId} not found`);
    }
    if (!job.project) {
      throw new Error(`Job with id ${jobId} is not associated with any project`);
    }

    const onboarding = await this.onboardingRepository.createOnboarding({
      userId: user.id,
      jobId: job.id,
      projectId: job.project.id,
    });

    const prompt = buildOnboardingPrompt({
      onboardingId: onboarding.id,
      userName: user.name,
      userExperienceYears: user.experienceYears,
      userSkills: user.skills.map((s) => s.name),
      jobTitle: job.title,
      jobRequiredSkills: job.skills.map((s) => s.name),
      projectName: job.project.name,
      projectDescription: job.project.description,
      documents,
    });

    const tasks = await this.llmService.generateOnboardingTasks(prompt);
    await this.taskService.createTasks(
      tasks.map((task) => ({
        ...task,
        onboarding,
      })),
    );

    const fullOnboarding = await this.getOnBoardingById(onboarding.id);
 
    if (!fullOnboarding) {
      throw new Error(`Onboarding with id ${onboarding.id} could not be retrieved after save`);
    }

    return fullOnboarding;
  }
}
