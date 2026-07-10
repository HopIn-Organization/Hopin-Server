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

  private get clientOrigin(): string {
    return process.env.CLIENT_ORIGIN ?? 'http://localhost:5173';
  }

  /**
   * Builds a redirect back to the client's dedicated GitHub connections page.
   * `from` (e.g. "create") is preserved so the page keeps its flow context
   * across the round-trip to GitHub.
   */
  private buildClientRedirect(
    projectId: number,
    params: Record<string, string>,
    from?: string
  ): string {
    const url = new URL(`${this.clientOrigin}/projects/${projectId}/github`);
    if (from) url.searchParams.set('from', from);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
    return url.toString();
  }

  /**
   * POST /projects/:id/github/connect
   * Body: { repoOwner: string, repoName: string, from?: "create" }
   * Returns the GitHub App install URL. Frontend redirects the user there.
   */
  connect = async (req: Request, res: Response, next: NextFunction): Promise<void> => {

    try {
      const projectId = parseInt(req.params.id as string, 10);
      const { repoOwner, repoName, from: rawFrom } = req.body as {
        repoOwner?: string;
        repoName?: string;
        from?: string;
      };
      // Whitelist the flow marker — it round-trips through GitHub and back
      // into a client redirect, so never echo arbitrary input.
      const from = rawFrom === 'create' ? rawFrom : undefined;

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

      // Cheap duplicate pre-check by owner/name — the repoId-keyed check below
      // (and the callback upsert) stay authoritative.
      const projectConnections = await this.connectionRepo.findAllByProjectId(projectId);
      const duplicate = projectConnections.find(
        c =>
          c.repoOwner.toLowerCase() === owner.toLowerCase() &&
          c.repoName.toLowerCase() === repo.toLowerCase() &&
          c.syncStatus !== SyncStatus.REVOKED
      );
      if (duplicate) {
        res.status(409).json({ error: 'This repository is already connected to the project' });
        return;
      }

      const existingInstallationId = await this.githubService.isAlreadyInstalled('', owner, repo);
      if (existingInstallationId) {
        const repoInfo = await this.githubService.getRepoInfo(existingInstallationId, owner, repo);

        const existing = await this.connectionRepo.findByProjectAndRepoId(projectId, repoInfo.repoId);
        if (existing && existing.syncStatus !== SyncStatus.REVOKED) {
          res.status(409).json({ error: 'This repository is already connected to the project' });
          return;
        }

        const connection = await this.connectionRepo.upsertByProjectAndRepo(projectId, repoInfo.repoId, {
          installationId: existingInstallationId,
          repoOwner: owner,
          repoName: repo,
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

      const installUrl = this.githubService.buildInstallUrl(projectId, owner, repo, from);
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
        // User uninstalled the App from GitHub's UI — nothing to connect,
        // just land them back in the app instead of showing raw JSON.
        res.redirect(`${this.clientOrigin}/projects`);
        return;
      }

      if (!installation_id || !state) {
        res.status(400).json({ error: 'Missing installation_id or state' });
        return;
      }

      let decoded: { projectId: number; repoOwner: string; repoName: string; from?: string };
      try {
        decoded = this.githubService.decodeState(state);
      } catch {
        res.status(400).json({ error: 'Invalid state param' });
        return;
      }

      const { projectId, repoOwner, repoName, from } = decoded;

      const confirmedInstallationId = await this.githubService.isAlreadyInstalled(
        '',
        repoOwner,
        repoName
      );
      if (!confirmedInstallationId) {
        const reason = `The GitHub App is not installed on ${repoOwner}/${repoName}. Please install it and grant access to this repository.`;
        res.redirect(this.buildClientRedirect(projectId, { github: 'error', reason }, from));
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
        res.redirect(this.buildClientRedirect(projectId, { github: 'error', reason }, from));
        return;
      }

      const connection = await this.connectionRepo.upsertByProjectAndRepo(projectId, repoInfo.repoId, {
        installationId: installation_id,
        repoOwner,
        repoName,
        isPrivate: repoInfo.isPrivate,
        defaultBranch: repoInfo.defaultBranch,
        syncStatus: SyncStatus.PENDING,
        lastError: null,
      });

      this.syncService.runSync(connection).catch(err =>
        console.error(`[GitHub] Unhandled error in runSync for project ${projectId}:`, err)
      );

      res.redirect(this.buildClientRedirect(projectId, { github: 'connected' }, from));
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /projects/:id/github/:connectionId/sync
   * Triggers a manual sync of one connection. Returns 202 immediately; sync runs in background.
   */
  sync = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const projectId = parseInt(req.params.id as string, 10);
      const connectionId = parseInt(req.params.connectionId as string, 10);

      if (Number.isNaN(connectionId)) {
        res.status(400).json({ error: 'Invalid connection id' });
        return;
      }

      const connection = await this.connectionRepo.findByIdForProject(projectId, connectionId);

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
   * GET /projects/:id/github
   * Lists all GitHub connections of the project. Always 200 with an array.
   */
  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const projectId = parseInt(req.params.id as string, 10);
      const connections = await this.connectionRepo.findAllByProjectId(projectId);

      res.json(
        connections.map(connection => ({
          id: connection.id,
          syncStatus: connection.syncStatus,
          repoOwner: connection.repoOwner,
          repoName: connection.repoName,
          isPrivate: connection.isPrivate,
          defaultBranch: connection.defaultBranch,
          lastSyncedAt: connection.lastSyncedAt,
          lastCommitSha: connection.lastCommitSha,
          lastError: connection.lastError,
          connectedAt: connection.connectedAt,
        }))
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /projects/:id/github/:connectionId
   * Removes the DB record. Does NOT uninstall the App on GitHub — the user
   * does that from their GitHub org/account settings.
   */
  disconnect = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const projectId = parseInt(req.params.id as string, 10);
      const connectionId = parseInt(req.params.connectionId as string, 10);

      if (Number.isNaN(connectionId)) {
        res.status(400).json({ error: 'Invalid connection id' });
        return;
      }

      const connection = await this.connectionRepo.findByIdForProject(projectId, connectionId);
      if (!connection) {
        res.status(404).json({ error: 'No GitHub connection found for this project' });
        return;
      }

      await this.connectionRepo.deleteById(connection.id);
      res.sendStatus(204);
    } catch (error) {
      next(error);
    }
  };
}

export const githubController = new GithubController();
