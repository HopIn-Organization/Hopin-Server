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
import { OnboardingRepository } from '../onboarding/onBoarding.repository';

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
  private onboardingRepository: OnboardingRepository;

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
    this.onboardingRepository = new OnboardingRepository();
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

  async getDetailedStatistics(projectId: number) {
    const project = await this.projectRepository.findById(projectId);
    if (!project) throw new Error('Project not found');

    const onboardings =
      await this.onboardingRepository.getOnboardingsByProjectId(projectId);

    // --- Avg Onboard Days ---
    // Sum estimatedDays across all root tasks for each onboarding, then average.
    const onboardDays = onboardings.map(ob => {
      const rootTasks = (ob.tasks ?? []).filter(t => !t.parent);
      return rootTasks.reduce((sum, t) => sum + (t.estimatedDays ?? 0), 0);
    });
    const avgOnboardDays =
      onboardDays.length > 0
        ? Math.round(
            onboardDays.reduce((a, b) => a + b, 0) / onboardDays.length
          )
        : 0;

    // --- Slowest Tasks ---
    // Aggregate all root tasks across onboardings, find the ones with highest estimatedDays.
    const taskDurations = new Map<string, number>();
    for (const ob of onboardings) {
      for (const task of ob.tasks ?? []) {
        if (task.parent) continue; // skip subtasks
        const current = taskDurations.get(task.title) ?? 0;
        taskDurations.set(
          task.title,
          Math.max(current, task.estimatedDays ?? 0)
        );
      }
    }
    const sortedTasks = [...taskDurations.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
    const maxDuration = sortedTasks.length > 0 ? sortedTasks[0]![1] : 1;

    const taskColors = ['#F87171', '#FBBF24', '#34D399'];
    const slowestTasks = sortedTasks.map(([name, days], index) => ({
      name,
      duration: days >= 1 ? `${Math.round(days)} day${Math.round(days) !== 1 ? 's' : ''}` : `${Math.round(days * 24)} hours`,
      percentage: Math.round((days / maxDuration) * 100),
      color: taskColors[index] ?? '#9CA3AF',
    }));

    // --- Overdue Members ---
    // A member is "overdue" if elapsed calendar days > total estimatedDays and tasks are incomplete.
    const overdueMembers: Array<{ initials: string; label: string }> = [];
    const now = new Date();
    for (const ob of onboardings) {
      const rootTasks = (ob.tasks ?? []).filter(t => !t.parent);
      const totalEstimatedDays = rootTasks.reduce(
        (sum, t) => sum + (t.estimatedDays ?? 0),
        0
      );
      const allCompleted =
        rootTasks.length > 0 && rootTasks.every(t => t.isCompleted);

      if (allCompleted || totalEstimatedDays === 0) continue;

      const startDate = ob.createdAt ? new Date(ob.createdAt) : null;
      if (!startDate) continue;

      const elapsedMs = now.getTime() - startDate.getTime();
      const elapsedDays = Math.floor(elapsedMs / (1000 * 60 * 60 * 24));
      const overdueDays = elapsedDays - Math.ceil(totalEstimatedDays);

      if (overdueDays > 0) {
        const userName = ob.user?.name ?? 'Unknown';
        const parts = userName.split(' ');
        const initials = parts
          .slice(0, 2)
          .map(p => p.charAt(0).toUpperCase())
          .join('');
        const label =
          overdueDays >= 7
            ? `${Math.round(overdueDays / 7)} week${Math.round(overdueDays / 7) !== 1 ? 's' : ''} over`
            : `${overdueDays} day${overdueDays !== 1 ? 's' : ''} over`;

        overdueMembers.push({ initials, label });
      }
    }

    // --- Employee Progress ---
    // For each trainee onboarding, show planned vs actual completed tasks.
    const employeeProgress = onboardings.map(ob => {
      const rootTasks = (ob.tasks ?? []).filter(t => !t.parent);
      const planned = rootTasks.length;
      const actual = rootTasks.filter(t => t.isCompleted).length;
      const name = ob.user?.name?.split(' ')[0] ?? 'Unknown';
      return { name, planned, actual };
    });

    // --- Job Distribution ---
    // Count members per job title.
    const jobCounts = new Map<string, number>();
    for (const member of project.members ?? []) {
      const title = member.job?.title ?? 'Other';
      jobCounts.set(title, (jobCounts.get(title) ?? 0) + 1);
    }
    const distColors = ['#F87171', '#34D399', '#FBBF24', '#9CA3AF', '#60A5FA', '#A78BFA'];
    const jobDistribution = [...jobCounts.entries()].map(
      ([label, value], index) => ({
        label,
        value,
        color: distColors[index % distColors.length]!,
      })
    );

    return {
      projectId: String(projectId),
      avgOnboardDays,
      slowestTasks,
      overdueCount: overdueMembers.length,
      overdueMembers: overdueMembers.slice(0, 5),
      employeeProgress: employeeProgress.slice(0, 6),
      jobDistribution,
    };
  }
}
