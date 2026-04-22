import { Repository } from "typeorm";
import { AppDataSource } from "../database/data-source";
import { ProjectMember } from "./projectMember.entity";

export class ProjectMemberRepository {
    private repository: Repository<ProjectMember>;

    constructor() {
        this.repository = AppDataSource.getRepository(ProjectMember);
    }

    async findByProjectAndId(projectId: number, memberId: number): Promise<ProjectMember | null> {
        return this.repository.findOne({
            where: { id: memberId, project: { id: projectId } },
            relations: { project: true },
        });
    }

    async save(member: ProjectMember): Promise<ProjectMember> {
        return this.repository.save(member);
    }

    async delete(memberId: number) {
        const result = await this.repository.delete({ id: memberId });

        return result.affected !== 0;
    }
}