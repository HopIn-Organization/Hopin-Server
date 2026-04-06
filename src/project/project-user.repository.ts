import { Repository } from 'typeorm';
import { AppDataSource } from '../database/data-source';
import { ProjectUser, ProjectRole } from '../database/entities/project-user.entity';

export class ProjectUserRepository {
  private repository: Repository<ProjectUser>;

  constructor() {
    this.repository = AppDataSource.getRepository(ProjectUser);
  }

  async findByProject(projectId: number): Promise<ProjectUser[]> {
    return this.repository.find({ where: { projectId }, relations: ['user'] });
  }

  async findByProjectAndUser(projectId: number, userId: number): Promise<ProjectUser | null> {
    return this.repository.findOne({ where: { projectId, userId } });
  }

  async countByProject(projectId: number): Promise<number> {
    return this.repository.count({ where: { projectId } });
  }

  async addUser(projectId: number, userId: number, role: ProjectRole): Promise<ProjectUser> {
    const projectUser = this.repository.create({ projectId, userId, role });
    return this.repository.save(projectUser);
  }

  async updateRole(projectId: number, userId: number, role: ProjectRole): Promise<ProjectUser | null> {
    const projectUser = await this.findByProjectAndUser(projectId, userId);
    if (!projectUser) return null;
    projectUser.role = role;
    return this.repository.save(projectUser);
  }
}
