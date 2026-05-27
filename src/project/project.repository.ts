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
      relations: { jobs: { skills: true }, members: { user: true, job: true } },
      order: { id: "DESC" },
    });
  }

  async findByUserId(userId: number): Promise<Project[]> {
    const projectIds = await this.repository
      .createQueryBuilder("project")
      .innerJoin("project.members", "member")
      .innerJoin("member.user", "user")
      .where("user.id = :userId", { userId })
      .select("project.id")
      .getMany();

    if (projectIds.length === 0) return [];

    return this.repository.find({
      where: projectIds.map((p) => ({ id: p.id })),
      relations: { jobs: { skills: true }, members: { user: true, job: true } },
      order: { id: "DESC" },
    });
  }

  async findById(id: number): Promise<Project | null> {
    return this.repository.findOne({
      where: { id },
      relations: { jobs: { skills: true }, members: { user: true, job: true } },
      order: {
        members: { id: "DESC" }
      }
    });
  }

  async create(projectData: Partial<Project>): Promise<Project> {
    const project = this.repository.create(projectData);

    return this.repository.save(project);
  }
}
