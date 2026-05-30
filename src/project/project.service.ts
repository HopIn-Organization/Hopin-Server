import { Project } from "./project.entity";
import { ProjectRepository } from "./project.repository";
import { JobRepository } from "../job/job.repository";
import { Job } from "../job/job.entity";
import { SkillRepository } from "../skill/skill.repository";
import { Skill } from "../skill/skill.entity";
import { ProjectMemberRepository } from "../projectMember/projectMember.repository";
import { ProjectMember, ProjectRole } from "../projectMember/projectMember.entity";

interface UpsertProjectPayload {
  name: string;
  description?: string;
  repositoryUrl?: string;
  jobs?: Array<{ id?: number; title: string; skills?: Skill[] }>;
  members?: Array<{
    id?: number;
    userId: number;
    jobId?: number;
    role?: ProjectRole;
  }>;
}

export class ProjectService {
  private projectRepository: ProjectRepository;
  private jobRepository: JobRepository;
  private skillRepository: SkillRepository;
  private projectMemberRepository: ProjectMemberRepository;

  constructor() {
    this.projectRepository = new ProjectRepository();
    this.jobRepository = new JobRepository();
    this.skillRepository = new SkillRepository();
    this.projectMemberRepository = new ProjectMemberRepository();
  }

  async getAllProjects(): Promise<Project[]> {
    return this.projectRepository.findAll();
  }

  async getProjectsByUser(userId: number): Promise<Project[]> {
    return this.projectRepository.findByUserId(userId);
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

    const jobs = [...existingJobs];

    if (payload.jobs && payload.jobs.length > 0) {
      for (const jobData of payload.jobs) {
        if (!jobData.title?.trim()) {
          continue;
        }

        const processedSkills: Skill[] = [];

        if (jobData.skills && jobData.skills.length > 0) {
          for (const skillItem of jobData.skills) {
            const skill = await this.skillRepository.findOrCreate(skillItem);
            processedSkills.push(skill);
          }
        }

        const normalizedTitle = jobData.title.trim().toLowerCase();
        const jobToUpdate = jobData.id
          ? jobs.find(j => j.id === jobData.id)
          : jobs.find(j => j.title?.trim().toLowerCase() === normalizedTitle);

        if (jobToUpdate) {
          jobToUpdate.title = jobData.title;
          jobToUpdate.skills = processedSkills;
          await this.jobRepository.save(jobToUpdate);
        } else {
          const job = await this.jobRepository.create({ title: jobData.title, project });
          job.skills = processedSkills;
          await this.jobRepository.save(job);
          jobs.push(job);
        }
      }
    }

    if (payload.members && payload.members.length > 0) {
      for (const memberData of payload.members) {
        let member: ProjectMember | null = null;

        if (memberData.userId) {
          member = await this.projectMemberRepository.findByProjectAndId(project.id, memberData.userId);
        }

        if (!member) {
          member = await this.projectMemberRepository.findByUserAndProject(memberData.userId, project.id);
        }

        let resolvedJobId = memberData.jobId;

        if (!resolvedJobId && jobs.length > 0) {
          resolvedJobId = jobs[0].id;
        }

        if (!resolvedJobId) {
          throw new Error(
            `Unable to resolve job for project member with userId=${memberData.userId}`
          );
        }

        if (member) {
          member.job = { id: resolvedJobId } as Job;
          member.role = memberData.role || member.role || ProjectRole.TRAINEE;
          await this.projectMemberRepository.save(member);
        } else {
          await this.projectMemberRepository.create({
            userId: memberData.userId,
            projectId: project.id,
            jobId: resolvedJobId,
            role: memberData.role,
          });
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