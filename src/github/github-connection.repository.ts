import { AppDataSource } from '../database/data-source';
import { GithubConnection, SyncStatus } from './github-connection.entity';

export class GithubConnectionRepository {
  private get repo() {
    return AppDataSource.getRepository(GithubConnection);
  }

  async findByProjectId(projectId: number): Promise<GithubConnection | null> {
    return this.repo.findOne({ where: { project: { id: projectId } } });
  }

  async findSyncedByProjectId(projectId: number): Promise<GithubConnection | null> {
    return this.repo.findOne({
      where: { project: { id: projectId }, syncStatus: SyncStatus.SYNCED },
    });
  }

  async findByInstallationId(installationId: string): Promise<GithubConnection | null> {
    return this.repo.findOne({ where: { installationId } });
  }

  async upsertByProjectId(
    projectId: number,
    data: Partial<Omit<GithubConnection, 'id' | 'project' | 'project_id' | 'connectedAt' | 'updatedAt'>>
  ): Promise<GithubConnection> {
    const existing = await this.findByProjectId(projectId);
    if (existing) {
      this.repo.merge(existing, data);
      return this.repo.save(existing);
    }
    const conn = this.repo.create({ ...data, project: { id: projectId } as any });
    return this.repo.save(conn);
  }

  async update(id: number, data: Partial<GithubConnection>): Promise<void> {
    await this.repo.update({ id }, data);
  }

  async markRevoked(installationId: string): Promise<void> {
    await this.repo.update({ installationId }, { syncStatus: SyncStatus.REVOKED });
  }

  async deleteByProjectId(projectId: number): Promise<void> {
    await this.repo.delete({ project: { id: projectId } });
  }
}
