import { AppDataSource } from '../database';
import { Job } from '../database/entities/job.entity';
import { User } from '../database/entities/user.entity';
import { buildOnboardingPrompt } from './onboarding.prompt';
import { LLMService, OnboardingTask } from './llm.service';

export interface GenerateOnboardingInput {
  userId: number;
  jobId: number;
  documents?: string[];
}

export class OnboardingService {
  private llmService: LLMService;

  constructor() {
    this.llmService = new LLMService();
  }

  async generateBoard(input: GenerateOnboardingInput): Promise<OnboardingTask[]> {
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

    const prompt = buildOnboardingPrompt({
      userName: user.name,
      userExperienceYears: user.experienceYears,
      userSkills: user.skills.map((s) => s.name),
      jobTitle: job.title,
      jobRequiredSkills: job.skills.map((s) => s.name),
      projectName: job.project.name,
      projectDescription: job.project.description,
      documents,
    });

    return this.llmService.generateOnboardingTasks(prompt);
  }
}
