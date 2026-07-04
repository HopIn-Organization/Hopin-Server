import { Request, Response, NextFunction } from 'express';
import { GithubService } from './github.service';
import { GithubConnectionRepository } from './github-connection.repository';
import { GithubSyncService } from './github-sync.service';
import { SyncStatus } from './github-connection.entity';

export class GithubController {
  private githubService: GithubService;
  private connectionRepo: GithubConnectionRepository;
  private syncService: GithubSyncService;

  constructor() {
    this.githubService = new GithubService();
    this.connectionRepo = new GithubConnectionRepository();
    this.syncService = new GithubSyncService();
  }

  private getSettingsUrl(projectId: number): string {
    const clientOrigin = process.env.CLIENT_ORIGIN ?? 'http://localhost:5173';
    return `${clientOrigin}/projects/${projectId}/settings`;
  }

  /**
   * POST /projects/:id/github/connect
   * Body: { repoOwner: string, repoName: string }
   * Returns the GitHub App install URL. Frontend redirects the user there.
   */
  connect = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
   
    try {
      const projectId = parseInt(req.params.id as string, 10);
      const { repoOwner, repoName } = req.body as {
        repoOwner?: string;
        repoName?: string;
      };

      if (!repoOwner || typeof repoOwner !== 'string') {
        res.status(400).json({ error: 'repoOwner is required' });
        return;
      }
      if (!repoName || typeof repoName !== 'string') {
        res.status(400).json({ error: 'repoName is required' });
        return;
      }

      const owner = repoOwner.trim();
      const repo = repoName.trim();

      const existingInstallationId = await this.githubService.isAlreadyInstalled('', owner, repo);
      if (existingInstallationId) {
        const repoInfo = await this.githubService.getRepoInfo(existingInstallationId, owner, repo);
        const connection = await this.connectionRepo.upsertByProjectId(projectId, {
          installationId: existingInstallationId,
          repoOwner: owner,
          repoName: repo,
          repoId: repoInfo.repoId,
          isPrivate: repoInfo.isPrivate,
          defaultBranch: repoInfo.defaultBranch,
          syncStatus: SyncStatus.PENDING,
          lastError: null,
        });

        this.syncService.runSync(connection).catch(err =>
          console.error(`[GitHub] Unhandled error in runSync for project ${projectId}:`, err)
        );

        res.json({ alreadyConnected: true });
        return;
      }

      const installUrl = this.githubService.buildInstallUrl(projectId, owner, repo);
      res.json({ installUrl });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /github/callback?installation_id=...&state=<base64>&setup_action=install
   * GitHub redirects here after the user installs the App.
   * This is a global route (not under /projects/:id) because GitHub App
   * callback URLs are fixed — the projectId travels inside the state param.
   */
  callback = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {
        installation_id,
        state,
        setup_action,
      } = req.query as Record<string, string>;

      if (setup_action === 'delete') {
        res.status(200).json({ message: 'App uninstalled' });
        return;
      }

      if (!installation_id || !state) {
        res.status(400).json({ error: 'Missing installation_id or state' });
        return;
      }

      let decoded: { projectId: number; repoOwner: string; repoName: string };
      try {
        decoded = this.githubService.decodeState(state);
      } catch {
        res.status(400).json({ error: 'Invalid state param' });
        return;
      }

      const { projectId, repoOwner, repoName } = decoded;

      const settingsUrl = this.getSettingsUrl(projectId);

      const confirmedInstallationId = await this.githubService.isAlreadyInstalled(
        '',
        repoOwner,
        repoName
      );
      if (!confirmedInstallationId) {
        const reason = `The GitHub App is not installed on ${repoOwner}/${repoName}. Please install it and grant access to this repository.`;
        res.redirect(`${settingsUrl}?github=error&reason=${encodeURIComponent(reason)}`);
        return;
      }

      let repoInfo: Awaited<ReturnType<typeof this.githubService.getRepoInfo>>;
      try {
        repoInfo = await this.githubService.getRepoInfo(
          installation_id,
          repoOwner,
          repoName
        );
      } catch (err: unknown) {
        const status = (err as { status?: number })?.status;
        const reason =
          status === 404
            ? `Repository ${repoOwner}/${repoName} not found. Make sure the name is correct and the app was granted access to it.`
            : status === 403
            ? `No permission to access ${repoOwner}/${repoName}. Grant the app access to this repository on GitHub.`
            : `Could not reach ${repoOwner}/${repoName}. Please try again.`;
        res.redirect(`${settingsUrl}?github=error&reason=${encodeURIComponent(reason)}`);
        return;
      }

      const connection = await this.connectionRepo.upsertByProjectId(projectId, {
        installationId: installation_id,
        repoOwner,
        repoName,
        repoId: repoInfo.repoId,
        isPrivate: repoInfo.isPrivate,
        defaultBranch: repoInfo.defaultBranch,
        syncStatus: SyncStatus.PENDING,
        lastError: null,
      });

      this.syncService.runSync(connection).catch(err =>
        console.error(`[GitHub] Unhandled error in runSync for project ${projectId}:`, err)
      );

      res.redirect(`${settingsUrl}?github=connected`);
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /projects/:id/github/sync
   * Triggers a manual sync. Returns 202 immediately; sync runs in background.
   */
  sync = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const projectId = parseInt(req.params.id as string, 10);
      const connection = await this.connectionRepo.findByProjectId(projectId);

      if (!connection) {
        res.status(404).json({ error: 'No GitHub connection found for this project' });
        return;
      }

      if (connection.syncStatus === SyncStatus.REVOKED) {
        res.status(409).json({ error: 'GitHub connection has been revoked' });
        return;
      }

      this.syncService.runSync(connection).catch(err =>
        console.error(
          `[GitHub] Unhandled error in runSync for project ${projectId}:`,
          err
        )
      );

      res.status(202).json({ message: 'Sync started' });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /projects/:id/github/status
   */
  status = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const projectId = parseInt(req.params.id as string, 10);
      const connection = await this.connectionRepo.findByProjectId(projectId);

      if (!connection) {
        res.status(404).json({ error: 'No GitHub connection found for this project' });
        return;
      }

      res.json({
        syncStatus: connection.syncStatus,
        repoOwner: connection.repoOwner,
        repoName: connection.repoName,
        isPrivate: connection.isPrivate,
        defaultBranch: connection.defaultBranch,
        lastSyncedAt: connection.lastSyncedAt,
        lastCommitSha: connection.lastCommitSha,
        lastError: connection.lastError,
        connectedAt: connection.connectedAt,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /projects/:id/github
   * Removes the DB record. Does NOT uninstall the App on GitHub — the user
   * does that from their GitHub org/account settings.
   */
  disconnect = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const projectId = parseInt(req.params.id as string, 10);
      await this.connectionRepo.deleteByProjectId(projectId);
      res.sendStatus(204);
    } catch (error) {
      next(error);
    }
  };
}

export const githubController = new GithubController();
