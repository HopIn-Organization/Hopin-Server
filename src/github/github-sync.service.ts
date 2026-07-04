import fs from 'fs';
import os from 'os';
import path from 'path';
import simpleGit from 'simple-git';
import { GithubConnection, SyncStatus } from './github-connection.entity';
import { GithubConnectionRepository } from './github-connection.repository';
import { GithubService } from './github.service';
import { LLMService } from '../services/llm.service';
import { S3Service } from '../document/s3.service';

const IGNORED_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', '.next',
  '__pycache__', '.venv', 'vendor', 'coverage', '.turbo',
]);

const KEY_FILENAMES = [
  'index.ts', 'main.ts', 'app.ts', 'server.ts',
  'index.js', 'main.js', 'app.js',
  'tsconfig.json', 'vite.config.ts', 'webpack.config.js',
  'docker-compose.yml', 'Dockerfile', '.env.example',
];

const MAX_FILE_CHARS = 6000;
const MAX_KEY_FILES = 8;
const TREE_DEPTH = 2;

export interface RepoKnowledgeSummary {
  architectureOverview: string;
  keyLibraries: Array<{ name: string; purpose: string; whereUsed: string[] }>;
  moduleBreakdown: Array<{ path: string; purpose: string; dependsOn: string[] }>;
  suggestedReadingOrder: string[];
  techStack: { language: string; framework: string; database: string; other: string[] };
  commitSha: string;
  generatedAt: string;
}

export class GithubSyncService {
  private connectionRepo: GithubConnectionRepository;
  private githubService: GithubService;
  private llmService: LLMService;
  private s3Service: S3Service;

  constructor() {
    this.connectionRepo = new GithubConnectionRepository();
    this.githubService = new GithubService();
    this.llmService = new LLMService();
    this.s3Service = new S3Service();
  }

  async runSync(connection: GithubConnection): Promise<void> {
    try {
      await this.connectionRepo.update(connection.id, {
        syncStatus: SyncStatus.SYNCING,
        lastError: null,
      });

      const token = await this.githubService.getInstallationToken(connection.installationId);
      const cloneUrl = this.githubService.buildCloneUrl(
        token,
        connection.repoOwner,
        connection.repoName
      );

      const tmpDir = fs.mkdtempSync(
        path.join(os.tmpdir(), `hopin-repo-${connection.project_id}-`)
      );

      try {
        await simpleGit().clone(cloneUrl, tmpDir, [
          '--depth', '1',
          '--branch', connection.defaultBranch,
        ]);

        const headSha = (await simpleGit(tmpDir).revparse(['HEAD'])).trim();

        if (headSha === connection.lastCommitSha) {
          await this.connectionRepo.update(connection.id, { syncStatus: SyncStatus.SYNCED });
          console.log(`[GitHub Sync] project ${connection.project_id}: no new commits, skipping`);
          return;
        }

        const summary = await this.extractKnowledge(tmpDir, headSha);

        const s3Key = `projects/${connection.project_id}/repo-knowledge/${headSha}.json`;
        await this.s3Service.upload(
          s3Key,
          Buffer.from(JSON.stringify(summary)),
          'application/json'
        );

        await this.connectionRepo.update(connection.id, {
          syncStatus: SyncStatus.SYNCED,
          lastCommitSha: headSha,
          lastSyncedAt: new Date(),
          lastError: null,
        });

        console.log(`[GitHub Sync] project ${connection.project_id}: synced commit ${headSha}`);
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[GitHub Sync] project ${connection.project_id} failed:`, msg);
      await this.connectionRepo.update(connection.id, {
        syncStatus: SyncStatus.ERROR,
        lastError: msg,
      });
    }
  }

  private async extractKnowledge(
    repoDir: string,
    commitSha: string
  ): Promise<RepoKnowledgeSummary> {
    const pkgPath = path.join(repoDir, 'package.json');
    const packageJson = fs.existsSync(pkgPath)
      ? fs.readFileSync(pkgPath, 'utf8')
      : null;

    const tree = this.buildFileTree(repoDir, TREE_DEPTH);
    const keyFiles = this.readKeyFiles(repoDir);

    const prompt = this.buildExtractionPrompt({ packageJson, tree, keyFiles });
    const raw = await this.llmService.generateJson(prompt);

    const summary = raw as Omit<RepoKnowledgeSummary, 'commitSha' | 'generatedAt'>;
    return { ...summary, commitSha, generatedAt: new Date().toISOString() };
  }

  private buildFileTree(dir: string, maxDepth: number, depth = 0): string {
    if (depth > maxDepth) return '';
    const indent = '  '.repeat(depth);
    try {
      const entries = fs
        .readdirSync(dir, { withFileTypes: true })
        .filter(e => !IGNORED_DIRS.has(e.name))
        .sort((a, b) =>
          a.isDirectory() === b.isDirectory()
            ? a.name.localeCompare(b.name)
            : a.isDirectory()
              ? -1
              : 1
        );

      return entries
        .map(e => {
          if (e.isDirectory()) {
            const children = this.buildFileTree(
              path.join(dir, e.name),
              maxDepth,
              depth + 1
            );
            return children
              ? `${indent}${e.name}/\n${children}`
              : `${indent}${e.name}/`;
          }
          return `${indent}${e.name}`;
        })
        .join('\n');
    } catch {
      return '';
    }
  }

  private readKeyFiles(repoDir: string): Array<{ path: string; content: string }> {
    const results: Array<{ path: string; content: string }> = [];
    for (const name of KEY_FILENAMES) {
      if (results.length >= MAX_KEY_FILES) break;
      const fullPath = path.join(repoDir, name);
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf8').slice(0, MAX_FILE_CHARS);
        results.push({ path: name, content });
      }
    }
    return results;
  }

  private buildExtractionPrompt(input: {
    packageJson: string | null;
    tree: string;
    keyFiles: Array<{ path: string; content: string }>;
  }): string {
    const filesSection =
      input.keyFiles.length > 0
        ? input.keyFiles
            .map(f => `--- ${f.path} ---\n${f.content}`)
            .join('\n\n')
        : 'No key files found at root level.';

    return `You are a senior software architect analyzing a code repository to produce a structured onboarding knowledge summary.

Repository file structure (${TREE_DEPTH} levels deep):
${input.tree}

${input.packageJson ? `package.json:\n${input.packageJson}` : ''}

Key files:
${filesSection}

Produce a JSON object with exactly this structure. Output ONLY valid JSON — no markdown fences, no explanation:
{
  "architectureOverview": "2–4 sentence overview of what this project does and how it is structured",
  "keyLibraries": [
    { "name": "string", "purpose": "string", "whereUsed": ["string"] }
  ],
  "moduleBreakdown": [
    { "path": "string", "purpose": "string", "dependsOn": ["string"] }
  ],
  "suggestedReadingOrder": ["string — path or topic a new developer should understand first"],
  "techStack": {
    "language": "string",
    "framework": "string",
    "database": "string",
    "other": ["string"]
  }
}`.trim();
  }
}
