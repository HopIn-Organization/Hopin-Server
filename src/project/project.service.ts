import { Project } from '../database/entities/project.entity';
import { ProjectRepository } from './project.repository';

export class ProjectService {
  private projectRepository: ProjectRepository;

  constructor() {
    this.projectRepository = new ProjectRepository();
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
}