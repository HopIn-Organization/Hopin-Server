import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { GithubConnectionRepository } from './github-connection.repository';
import { GithubSyncService } from './github-sync.service';
import { SyncStatus } from './github-connection.entity';

export class GithubWebhookController {
  private connectionRepo: GithubConnectionRepository;
  private syncService: GithubSyncService;

  constructor() {
    this.connectionRepo = new GithubConnectionRepository();
    this.syncService = new GithubSyncService();
  }

  handle = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Verify the HMAC-SHA256 signature before processing anything else.
      // req.body is a raw Buffer here because the route uses express.raw().
      const sig = req.headers['x-hub-signature-256'] as string | undefined;
      const secret = process.env.GITHUB_WEBHOOK_SECRET;

      if (!secret) {
        console.error('[GitHub Webhook] GITHUB_WEBHOOK_SECRET is not set');
        res.status(500).json({ error: 'Webhook secret not configured' });
        return;
      }

      if (!sig) {
        res.status(401).json({ error: 'Missing x-hub-signature-256 header' });
        return;
      }

      const computed =
        'sha256=' +
        crypto
          .createHmac('sha256', secret)
          .update(req.body as Buffer)
          .digest('hex');

      const sigBuffer = Buffer.from(sig);
      const computedBuffer = Buffer.from(computed);

      // Buffers must be same length for timingSafeEqual
      if (
        sigBuffer.length !== computedBuffer.length ||
        !crypto.timingSafeEqual(sigBuffer, computedBuffer)
      ) {
        res.status(401).json({ error: 'Invalid signature' });
        return;
      }

      const event = req.headers['x-github-event'] as string;
      const payload = JSON.parse((req.body as Buffer).toString('utf8'));

      if (event === 'installation') {
        if (payload.action === 'deleted' || payload.action === 'suspend') {
          const installationId = String(payload.installation.id);
          await this.connectionRepo.markRevoked(installationId);
          console.log(
            `[GitHub Webhook] Installation ${installationId} revoked (${payload.action})`
          );
        }
        // Ack quickly — no further processing needed for installation events
        res.sendStatus(200);
        return;
      }

      if (event === 'push') {
        const installationId = payload.installation?.id
          ? String(payload.installation.id)
          : null;

        if (installationId) {
          // One installation can cover many connected repos (and the same repo
          // may be connected to several projects) — match the pushed repo and
          // sync every matching connection.
          const connections =
            await this.connectionRepo.findByInstallationId(installationId);

          const pushedRepoId = payload.repository?.id
            ? String(payload.repository.id)
            : null;
          const pushedRef: string = payload.ref ?? '';

          for (const connection of connections) {
            if (connection.syncStatus === SyncStatus.REVOKED) continue;
            if (pushedRepoId !== connection.repoId) continue;
            if (pushedRef !== `refs/heads/${connection.defaultBranch}`) continue;

            this.syncService.runSync(connection).catch(err =>
              console.error(
                `[GitHub Webhook] Sync failed for connection ${connection.id} (installation ${installationId}):`,
                err
              )
            );
          }
        }
      }

      // Always ack immediately — GitHub retries if we return non-2xx
      res.sendStatus(200);
    } catch (error) {
      next(error);
    }
  };
}

export const githubWebhookController = new GithubWebhookController();
