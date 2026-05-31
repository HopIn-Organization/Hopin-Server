import { DeepPartial, IsNull, Repository } from 'typeorm';
import { AppDataSource } from '../database/data-source';
import { DocumentChunk } from './document-chunk.entity';

export class DocumentChunkRepository {
  private repository: Repository<DocumentChunk>;

  constructor() {
    this.repository = AppDataSource.getRepository(DocumentChunk);
  }

  async deleteByDocumentId(documentId: number): Promise<void> {
    await this.repository.delete({ documentId });
  }

  async findByDocumentId(documentId: number): Promise<DocumentChunk[]> {
    return this.repository.find({
      where: { documentId },
      order: { chunkIndex: 'ASC' },
    });
  }

  async insertBatch(chunks: DeepPartial<DocumentChunk>[]): Promise<void> {
    await this.repository.save(chunks);
  }

  async findByJobId(projectId: number, jobId: number): Promise<DocumentChunk[]> {
    return this.repository.find({
      where: [
        { projectId, jobId },
        { projectId, jobId: IsNull() },
      ],
      order: { documentId: 'ASC', chunkIndex: 'ASC' },
    });
  }

  async findByProjectId(projectId: number): Promise<DocumentChunk[]> {
    return this.repository.find({
      where: { projectId },
      order: { documentId: 'ASC', chunkIndex: 'ASC' },
    });
  }
}
