import { GithubConnectionRepository } from '../github-connection.repository';
import { GithubSyncService } from '../github-sync.service';
import { SyncStatus } from '../github-connection.entity';
import { PushEventPayload } from './webhook.types';

export class PushEventHandler {
  private connectionRepo: GithubConnectionRepository;
  private syncService: GithubSyncService;

  constructor(
    connectionRepo = new GithubConnectionRepository(),
    syncService = new GithubSyncService()
  ) {
    this.connectionRepo = connectionRepo;
    this.syncService = syncService;
  }

  async handle(payload: PushEventPayload): Promise<void> {
    if (!payload.installation) return;

    const installationId = String(payload.installation.id);

    // One installation can cover many connected repos (and the same repo
    // may be connected to several projects) — match the pushed repo and
    // sync every matching connection.
    const connections =
      await this.connectionRepo.findByInstallationId(installationId);

    const pushedRepoId = payload.repository
      ? String(payload.repository.id)
      : null;
    const pushedRef: string = payload.ref ?? '';

    for (const connection of connections) {
      if (connection.syncStatus === SyncStatus.REVOKED) continue;
      if (pushedRepoId !== connection.repoId) continue;
      if (pushedRef !== `refs/heads/${connection.defaultBranch}`) continue;

      this.syncService
        .runSync(connection)
        .catch(err =>
          console.error(
            `[GitHub Webhook] Sync failed for connection ${connection.id} (installation ${installationId}):`,
            err
          )
        );
    }
  }
}
