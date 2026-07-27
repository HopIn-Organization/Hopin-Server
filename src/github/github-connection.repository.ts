import { AppDataSource } from '../database/data-source';
import { GithubConnection, SyncStatus } from './github-connection.entity';

export class GithubConnectionRepository {
  private get repo() {
    return AppDataSource.getRepository(GithubConnection);
  }

  async findAllByProjectId(projectId: number): Promise<GithubConnection[]> {
    return this.repo.find({
      where: { project: { id: projectId } },
      order: { id: 'ASC' },
    });
  }

  async findSyncedByProjectId(projectId: number): Promise<GithubConnection[]> {
    return this.repo.find({
      where: { project: { id: projectId }, syncStatus: SyncStatus.SYNCED },
      order: { id: 'ASC' },
    });
  }

  async findByInstallationId(
    installationId: string
  ): Promise<GithubConnection[]> {
    return this.repo.find({ where: { installationId } });
  }

  async findByIdForProject(
    projectId: number,
    connectionId: number
  ): Promise<GithubConnection | null> {
    return this.repo.findOne({
      where: { id: connectionId, project: { id: projectId } },
    });
  }

  async findByProjectAndRepoId(
    projectId: number,
    repoId: string
  ): Promise<GithubConnection | null> {
    return this.repo.findOne({
      where: { project: { id: projectId }, repoId },
    });
  }

  async upsertByProjectAndRepo(
    projectId: number,
    repoId: string,
    data: Partial<
      Omit<
        GithubConnection,
        'id' | 'project' | 'project_id' | 'connectedAt' | 'updatedAt'
      >
    >
  ): Promise<GithubConnection> {
    const existing = await this.findByProjectAndRepoId(projectId, repoId);
    if (existing) {
      this.repo.merge(existing, { ...data, repoId });
      return this.repo.save(existing);
    }
    const conn = this.repo.create({
      ...data,
      repoId,
      project: { id: projectId } as any,
    });
    return this.repo.save(conn);
  }

  async update(id: number, data: Partial<GithubConnection>): Promise<void> {
    await this.repo.update({ id }, data);
  }

  async markRevoked(installationId: string): Promise<void> {
    await this.repo.update(
      { installationId },
      { syncStatus: SyncStatus.REVOKED }
    );
  }

  async deleteById(id: number): Promise<void> {
    await this.repo.delete({ id });
  }
}
