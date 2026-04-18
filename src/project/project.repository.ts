import { Repository } from "typeorm";
import { AppDataSource } from "../database/data-source";
import { Project } from "../project/project.entity";

export class ProjectRepository {
  private repository: Repository<Project>;

  constructor() {
    this.repository = AppDataSource.getRepository(Project);
  }

  async findAll(): Promise<Project[]> {
    return this.repository.find({
      relations: ["jobs", "members", "members.user", "members.jobs"],
      order: { id: "DESC" },
    });
  }

  async findById(id: number): Promise<Project | null> {
    return this.repository.findOne({
      where: { id },
      relations: ["jobs", "members", "members.user", "members.jobs"],
    });
  }

  async create(projectData: Partial<Project>): Promise<Project> {
    const project = this.repository.create(projectData);

    return this.repository.save(project);
  }
}
