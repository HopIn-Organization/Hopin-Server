import { GithubConnectionRepository } from '../github-connection.repository';
import { InstallationEventPayload } from './webhook.types';

export class InstallationEventHandler {
  private connectionRepo: GithubConnectionRepository;

  constructor(connectionRepo = new GithubConnectionRepository()) {
    this.connectionRepo = connectionRepo;
  }

  async handle(payload: InstallationEventPayload): Promise<void> {
    if (payload.action !== 'deleted' && payload.action !== 'suspend') return;
    if (!payload.installation) return;

    const installationId = String(payload.installation.id);
    await this.connectionRepo.markRevoked(installationId);
    console.log(
      `[GitHub Webhook] Installation ${installationId} revoked (${payload.action})`
    );
  }
}
