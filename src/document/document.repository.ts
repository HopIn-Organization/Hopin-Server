import { IsNull, Repository } from "typeorm";
import { AppDataSource } from "../database/data-source";
import { ProjectDocument } from "./document.entity";

export class DocumentRepository {
    private repository: Repository<ProjectDocument>;

    constructor() {
        this.repository = AppDataSource.getRepository(ProjectDocument);
    }

    async findByProjectId(projectId: number): Promise<ProjectDocument[]> {
        return this.repository.find({
            where: { projectId, jobId: IsNull() },
            order: { uploadedAt: "DESC" },
        });
    }

    async findAllByProjectId(projectId: number): Promise<ProjectDocument[]> {
        return this.repository.find({ where: { projectId } });
    }

    async findByJobId(projectId: number, jobId: number): Promise<ProjectDocument[]> {
        return this.repository.find({
            where: { projectId, jobId },
            order: { uploadedAt: "DESC" },
        });
    }

    async countByProjectId(projectId: number): Promise<number> {
        return this.repository.count({ where: { projectId } });
    }

    async countByJobId(projectId: number, jobId: number): Promise<number> {
        return this.repository.count({ where: { projectId, jobId } });
    }

    async findById(id: number): Promise<ProjectDocument | null> {
        return this.repository.findOne({ where: { id } });
    }

    async create(data: Partial<ProjectDocument>): Promise<ProjectDocument> {
        const doc = this.repository.create(data);
        return this.repository.save(doc);
    }

    async delete(id: number): Promise<void> {
        await this.repository.delete(id);
    }
}
