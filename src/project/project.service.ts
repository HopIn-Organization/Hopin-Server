import { Project } from "./project.entity";
import { ProjectRepository } from "./project.repository";
import { JobRepository } from "../job/job.repository";
import { SkillRepository } from "../skill/skill.repository"; // Adjust path as needed
import { Skill } from "../database/entities/skill.entity";
import { AppDataSource } from "../database/data-source";
import { ProjectMember, ProjectRole } from "../database/entities/projectMember.entity";

interface CreateProjectPayload {
  name: string;
  description?: string;
  repositoryUrl?: string;
  jobs?: Array<{ title: string; skills?: Skill[] }>;
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

  async createProject(payload: CreateProjectPayload): Promise<Project> {
    const project = await this.projectRepository.create({
      name: payload.name,
      description: payload.description || null,
    });

    if (!payload.jobs || payload.jobs.length === 0) {
      return project;
    }

    for (const jobData of payload.jobs) {
      const processedSkills: Skill[] = [];

      if (jobData.skills && jobData.skills.length > 0) {
        for (const skillItem of jobData.skills) {
          const skill = await this.skillRepository.findOrCreate(skillItem);
          processedSkills.push(skill);
        }
      }

      const job = await this.jobRepository.create({
        title: jobData.title,
        project: project,
      });

      job.skills = processedSkills;

      await this.jobRepository.create(job);
    }

    const completeProject = await this.projectRepository.findById(project.id);

    if (!completeProject) {
      throw new Error("Failed to retrieve created project")
    };

    return completeProject;
  }

  async updateMemberRole(projectId: number, memberId: number, role: ProjectRole): Promise<ProjectMember> {
    const projectMemberRepository = AppDataSource.getRepository(ProjectMember);

    const member = await projectMemberRepository.findOne({
      where: { id: memberId, project: { id: projectId } },
      relations: ["project"],
    });

    if (!member) {
      throw new Error("Project member not found");
    }

    member.role = role;

    return projectMemberRepository.save(member);
  }
}