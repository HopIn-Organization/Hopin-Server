import { Repository } from 'typeorm';
import { AppDataSource } from '../database/data-source';
import { Job } from '../database/entities/job.entity';
import { Skill } from '../database/entities/skill.entity';

export class JobRepository {
  private jobRepository: Repository<Job>;
  private skillRepository: Repository<Skill>;

  constructor() {
    this.jobRepository = AppDataSource.getRepository(Job);
    this.skillRepository = AppDataSource.getRepository(Skill);
  }

  async findAll(): Promise<Job[]> {
    return this.jobRepository.find({
      relations: ['skills', 'project']
    });
  }

  async findById(id: number): Promise<Job | null> {
    return this.jobRepository.findOne({
      where: { id },
      relations: ['skills', 'project']
    });
  }

  async create(jobData: Partial<Job>): Promise<Job> {
    const job = this.jobRepository.create(jobData);
    return this.jobRepository.save(job);
  }

  async addSkillsToJob(jobId: number, skillNames: string[]): Promise<Job | null> {
    const job = await this.jobRepository.findOne({
      where: { id: jobId },
      relations: ['skills']
    });
    if (!job) return null;

    // Fetch existing skills in one query
    const existingSkills = await this.skillRepository.find({
      where: skillNames.map(name => ({ name }))
    });
    const existingSkillNames = new Set(existingSkills.map(skill => skill.name));

    // Create missing skills
    const skillsToCreate = skillNames.filter(name => !existingSkillNames.has(name));
    const newSkills = await Promise.all(
      skillsToCreate.map(name => this.skillRepository.save(this.skillRepository.create({ name })))
    );

    // Combine existing and new skills
    const allSkills = [...existingSkills, ...newSkills];

    job.skills = [...(job.skills || []), ...allSkills];
    return this.jobRepository.save(job);
  }
}