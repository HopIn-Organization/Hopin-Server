import { Project } from "./project.entity";
import { ProjectRepository } from "./project.repository";
import { JobRepository } from "../job/job.repository";
import { Job } from "../job/job.entity";
import { SkillRepository } from "../skill/skill.repository"; // Adjust path as needed
import { Skill } from "../skill/skill.entity";

interface UpsertProjectPayload {
  name: string;
  description?: string;
  repositoryUrl?: string;
  jobs?: Array<{ id?: number; title: string; skills?: Skill[] }>;
}

export class ProjectService {
  private projectRepository: ProjectRepository;
  private jobRepository: JobRepository;
  private skillRepository: SkillRepository;

  constructor() {
    this.projectRepository = new ProjectRepository();
    this.jobRepository = new JobRepository();
    this.skillRepository = new SkillRepository();
  }

  async getAllProjects(): Promise<Project[]> {
    return this.projectRepository.findAll();
  }

  async getProjectById(id: number): Promise<Project | null> {
    return this.projectRepository.findById(id);
  }

  async upsertProject(payload: UpsertProjectPayload, id?: number): Promise<Project> {
    let project: Project;
    let existingJobs: Job[] = [];

    if (id) {
      const existing = await this.projectRepository.findById(id);
      if (!existing) throw new Error('Project not found');
      project = await this.projectRepository.create({
        ...existing,
        name: payload.name,
        description: payload.description ?? existing.description,
      });
      existingJobs = await this.jobRepository.findByProjectId(id);
    } else {
      project = await this.projectRepository.create({
        name: payload.name,
        description: payload.description || null,
      });
    }

    if (payload.jobs && payload.jobs.length > 0) {
      for (const jobData of payload.jobs) {
        const processedSkills: Skill[] = [];

        if (jobData.skills && jobData.skills.length > 0) {
          for (const skillItem of jobData.skills) {
            const skill = await this.skillRepository.findOrCreate(skillItem);
            processedSkills.push(skill);
          }
        }

        // resolve which job to update: prefer explicit id, then title match
        const jobToUpdate = jobData.id
          ? existingJobs.find(j => j.id === jobData.id)
          : existingJobs.find(j => j.title === jobData.title);

        if (jobToUpdate) {
          jobToUpdate.title = jobData.title;
          jobToUpdate.skills = processedSkills;
          await this.jobRepository.save(jobToUpdate);
        } else {
          const job = await this.jobRepository.create({ title: jobData.title, project });
          job.skills = processedSkills;
          await this.jobRepository.save(job);
        }
      }
    }

    const completeProject = await this.projectRepository.findById(project.id);
    if (!completeProject) throw new Error('Failed to retrieve project');
    return completeProject;
  }

  // convenience aliases
  async createProject(payload: UpsertProjectPayload): Promise<Project> {
    return this.upsertProject(payload);
  }

  async updateProject(id: number, payload: UpsertProjectPayload): Promise<Project> {
    return this.upsertProject(payload, id);
  }
}