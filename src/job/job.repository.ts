import { Repository } from "typeorm";
import { AppDataSource } from "../database/data-source";
import { Job } from "../job/job.entity";
import { SkillRepository } from "../skill/skill.repository";

export class JobRepository {
  private jobRepository: Repository<Job>;
  private skillRepository: SkillRepository;

  constructor() {
    this.jobRepository = AppDataSource.getRepository(Job);
    this.skillRepository = new SkillRepository;
  }

  async findAll(): Promise<Job[]> {
    return this.jobRepository.find({
      relations: {
        skills: true, project: true, members: { user: true, job: true },
      },
      order: { id: "DESC" },
    });
  }

  async findById(id: number): Promise<Job | null> {
    return this.jobRepository.findOne({
      where: { id },
      relations: { skills: true, project: true, members: { user: true, job: true } }
    });
  }

  async findByProjectId(projectId: number): Promise<Job[]> {
    return this.jobRepository.find({
      where: { project: { id: projectId } },
      relations: { skills: true },
    });
  }

  async create(jobData: Partial<Job>): Promise<Job> {
    const job = this.jobRepository.create(jobData);

    return this.jobRepository.save(job);
  }

  async addSkillsToJob(
    jobId: number,
    skillNames: string[]
  ): Promise<Job | null> {
    const job = await this.jobRepository.findOne({
      where: { id: jobId },
      relations: { skills: true },
    });

    if (!job) return null;

    const skills = await Promise.all(
      skillNames.map(name =>
        this.skillRepository.findOrCreate({ name })
      )
    );

    const existingIds = new Set((job.skills || []).map(s => s.id));
    const uniqueSkills = skills.filter(s => !existingIds.has(s.id));

    job.skills = [...(job.skills || []), ...uniqueSkills];

    return this.jobRepository.save(job);
  }

  async save(job: Job): Promise<Job> {
    return this.jobRepository.save(job);
  }
}
