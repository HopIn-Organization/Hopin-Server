import { createAppAuth } from '@octokit/auth-app';
import { Octokit } from '@octokit/rest';

interface InstallState {
  projectId: number;
  repoOwner: string;
  repoName: string;
}

export interface RepoInfo {
  repoId: string;
  isPrivate: boolean;
  defaultBranch: string;
}

export class GithubService {
  private get appId(): string {
    const id = process.env.GITHUB_APP_ID;
    if (!id) throw new Error('GITHUB_APP_ID env var is not set');
    return id;
  }

  private get privateKey(): string {
    const raw = process.env.GITHUB_APP_PRIVATE_KEY;
    if (!raw) throw new Error('GITHUB_APP_PRIVATE_KEY env var is not set');

    // Normalize line endings (literal \n from .env files, Windows CRLF)
    const normalized = raw.replace(/\\n/g, '\n').replace(/\r\n/g, '\n').trim();

    // Re-wrap PEM body to 64-char lines — required by OpenSSL.
    // Covers the case where the key was stored as one long base64 blob.
    const headerMatch = normalized.match(/-----BEGIN ([A-Z ]+)-----/);
    const footerMatch = normalized.match(/-----END ([A-Z ]+)-----/);
    if (headerMatch && footerMatch) {
      const header = headerMatch[0];
      const footer = footerMatch[0];
      const body = normalized.replace(header, '').replace(footer, '').replace(/\s+/g, '');
      const wrapped = (body.match(/.{1,64}/g) ?? [body]).join('\n');
      return `${header}\n${wrapped}\n${footer}`;
    }

    return normalized;
  }

  private get appSlug(): string {
    const slug = process.env.GITHUB_APP_SLUG;
    if (!slug) throw new Error('GITHUB_APP_SLUG env var is not set');
    return slug;
  }

  private get callbackUrl(): string {
    const url = process.env.GITHUB_APP_CALLBACK_URL;
    if (!url) throw new Error('GITHUB_APP_CALLBACK_URL env var is not set');
    return url;
  }

  /** URL the user visits to install the App and pick which repos to grant access to. */
  buildInstallUrl(projectId: number, repoOwner: string, repoName: string): string {
    const state = Buffer.from(
      JSON.stringify({ projectId, repoOwner, repoName } satisfies InstallState)
    ).toString('base64');
    // redirect_uri overrides the default Setup URL in GitHub App settings so we
    // always land on the exact callback endpoint we control, regardless of what
    // is configured in the App admin page.
    return (
      `https://github.com/apps/${this.appSlug}/installations/new` +
      `?state=${state}&redirect_uri=${encodeURIComponent(this.callbackUrl)}`
    );
  }

  /** Decodes the base64 state param that GitHub echoes back in the callback. */
  decodeState(state: string): InstallState {
    return JSON.parse(Buffer.from(state, 'base64').toString('utf8')) as InstallState;
  }

  /** Mints a short-lived installation token (~1 hr). Always call fresh — never cache. */
  async getInstallationToken(installationId: string): Promise<string> {
    const auth = createAppAuth({
      appId: this.appId,
      privateKey: this.privateKey,
    });
    const result = await auth({
      type: 'installation',
      installationId: Number(installationId),
    });
    return result.token;
  }

  /** Fetches repo metadata from the GitHub API using the installation's token. */
  async getRepoInfo(
    installationId: string,
    owner: string,
    repo: string
  ): Promise<RepoInfo> {
    const token = await this.getInstallationToken(installationId);
    const octokit = new Octokit({ auth: token });
    const { data } = await octokit.repos.get({ owner, repo });
    return {
      repoId: String(data.id),
      isPrivate: data.private,
      defaultBranch: data.default_branch,
    };
  }

  /**
   * Returns the installation ID if the GitHub App is installed on the given repo,
   * or null if it is not. Uses app-level JWT so no installation token is needed.
   */
  async isAlreadyInstalled(
    _installationId: string,
    owner: string,
    repo: string
  ): Promise<string | null> {
    try {
      const octokit = new Octokit({
        authStrategy: createAppAuth,
        auth: { appId: this.appId, privateKey: this.privateKey },
      });
      const { data } = await octokit.apps.getRepoInstallation({ owner, repo });
      return String(data.id);
    } catch (error: any) {
      if (error.status === 404) return null;
      throw error;
    }
  }

  /** HTTPS clone URL that uses the installation token as the password. */
  buildCloneUrl(token: string, owner: string, repo: string): string {
    return `https://x-access-token:${token}@github.com/${owner}/${repo}.git`;
  }
}
