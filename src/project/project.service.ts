import { Project } from './project.entity';
import { ProjectRepository } from './project.repository';
import { JobRepository } from '../job/job.repository';
import { Job } from '../job/job.entity';
import { SkillRepository } from '../skill/skill.repository';
import { Skill } from '../skill/skill.entity';
import { ProjectMemberRepository } from '../projectMember/projectMember.repository';
import {
  ProjectMember,
  ProjectRole,
} from '../projectMember/projectMember.entity';
import { DocumentRepository } from '../document/document.repository';
import { DocumentChunkRepository } from '../document/document-chunk.repository';
import { S3Service } from '../document/s3.service';
import { PineconeService } from '../document/pinecone.service';
import { TaskRepository } from '../task/task.repository';

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
  private documentRepository: DocumentRepository;
  private documentChunkRepository: DocumentChunkRepository;
  private s3Service: S3Service;
  private pineconeService: PineconeService;
  private taskRepository: TaskRepository;

  constructor() {
    this.projectRepository = new ProjectRepository();
    this.jobRepository = new JobRepository();
    this.skillRepository = new SkillRepository();
    this.projectMemberRepository = new ProjectMemberRepository();
    this.documentRepository = new DocumentRepository();
    this.documentChunkRepository = new DocumentChunkRepository();
    this.s3Service = new S3Service();
    this.pineconeService = new PineconeService();
    this.taskRepository = new TaskRepository();
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

  async upsertProject(
    payload: UpsertProjectPayload,
    id?: number
  ): Promise<Project> {
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
          const job = await this.jobRepository.create({
            title: jobData.title,
            project,
          });
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
          member = await this.projectMemberRepository.findByProjectAndId(
            project.id,
            memberData.userId
          );
        }

        if (!member) {
          member = await this.projectMemberRepository.findByUserAndProject(
            memberData.userId,
            project.id
          );
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

  async deleteProject(id: number): Promise<void> {
    const project = await this.projectRepository.findById(id);
    if (!project) throw new Error('Project not found');

    console.log(`[deleteProject] Starting deletion for project id=${id}`);

    // Delete S3 documents and Pinecone vectors first
    const documents = await this.documentRepository.findAllByProjectId(id);
    console.log(`[deleteProject] Found ${documents.length} document(s) to clean up`);
    for (const doc of documents) {
      await this.s3Service.delete(doc.s3Key);

      const chunks = await this.documentChunkRepository.findByDocumentId(
        doc.id
      );
      if (chunks.length > 0) {
        const vectorIds = chunks.map(
          c => `chunk-${c.documentId}-${c.chunkIndex}`
        );
        await this.pineconeService.deleteChunksByDocumentId(vectorIds, id);
      }
    }
    console.log(`[deleteProject] S3/Pinecone cleanup done`);

    // Delete tasks before project members/project to avoid FK violations.
    // task.onboarding_id has NO ACTION, so tasks must be removed before their
    // onboarding rows are cascade-deleted when the project row is deleted.
    await this.taskRepository.deleteByProjectId(id);
    console.log(`[deleteProject] Tasks deleted`);

    // Delete project members (no DB cascade)
    await this.projectMemberRepository.deleteByProjectId(id);
    console.log(`[deleteProject] Members deleted`);

    // Delete project (DB cascade handles onboarding, project_documents, and job records)
    await this.projectRepository.delete(id);
    console.log(`[deleteProject] Project row deleted — done`);
  }

  // convenience aliases
  async createProject(payload: UpsertProjectPayload): Promise<Project> {
    return this.upsertProject(payload);
  }

  async updateProject(
    id: number,
    payload: UpsertProjectPayload
  ): Promise<Project> {
    return this.upsertProject(payload, id);
  }
}
