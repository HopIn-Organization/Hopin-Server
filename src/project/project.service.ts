import { Project } from '../database/entities/project.entity';
import { ProjectUser, ProjectRole } from '../database/entities/project-user.entity';
import { ProjectRepository } from './project.repository';
import { ProjectUserRepository } from './project-user.repository';

export class ProjectService {
  private projectRepository: ProjectRepository;
  private projectUserRepository: ProjectUserRepository;

  constructor() {
    this.projectRepository = new ProjectRepository();
    this.projectUserRepository = new ProjectUserRepository();
  }

  async getAllProjects(): Promise<Project[]> {
    return this.projectRepository.findAll();
  }

  async getProjectById(id: number): Promise<Project | null> {
    return this.projectRepository.findById(id);
  }

  async createProject(projectData: Partial<Project>): Promise<Project> {
    return this.projectRepository.create(projectData);
  }

  async getProjectMembers(projectId: number): Promise<ProjectUser[]> {
    return this.projectUserRepository.findByProject(projectId);
  }

  async countProjectMembers(projectId: number): Promise<number> {
    return this.projectUserRepository.countByProject(projectId);
  }

  async getMembership(projectId: number, userId: number): Promise<ProjectUser | null> {
    return this.projectUserRepository.findByProjectAndUser(projectId, userId);
  }

  async addUserToProject(projectId: number, userId: number, role: ProjectRole): Promise<ProjectUser> {
    return this.projectUserRepository.addUser(projectId, userId, role);
  }

  async assignRole(projectId: number, userId: number, role: ProjectRole): Promise<ProjectUser | null> {
    return this.projectUserRepository.updateRole(projectId, userId, role);
  }
}