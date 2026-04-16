import { Job } from '../database/entities/job.entity';
import { JobRepository } from './job.repository';

export class JobService {
  private jobRepository: JobRepository;

  constructor() {
    this.jobRepository = new JobRepository();
  }

  async getAllJobs(): Promise<Job[]> {
    return this.jobRepository.findAll();
  }

  async getJobById(id: number): Promise<Job | null> {
    return this.jobRepository.findById(id);
  }

  async createJob(jobData: Partial<Job>): Promise<Job> {
    return this.jobRepository.create(jobData);
  }

  async addSkillsToJob(jobId: number, skillNames: string[]): Promise<Job | null> {
    return this.jobRepository.addSkillsToJob(jobId, skillNames);
  }
}