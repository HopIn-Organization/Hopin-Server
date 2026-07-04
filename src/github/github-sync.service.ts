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

// README candidates checked in priority order
const README_FILENAMES = ['README.md', 'readme.md', 'README.rst', 'README.txt', 'README'];

const MAX_README_CHARS = 12000;
const MAX_FILE_CHARS = 6000;
const TREE_DEPTH = 5;

// LLM-driven file selection: initial pick, then "need more?" refinement rounds
const MAX_INITIAL_FILES = 8;
const MAX_ADDITIONAL_FILES = 4;
const MAX_REFINEMENT_ROUNDS = 2;

export interface RepoKnowledgeSummary {
  architectureOverview: string;
  keyLibraries: Array<{ name: string; purpose: string; whereUsed: string[] }>;
  moduleBreakdown: Array<{ path: string; purpose: string; dependsOn: string[] }>;
  /** Each entry has the actual relative file path and a short description of what to learn from it. */
  suggestedReadingOrder: Array<{ path: string; description: string }>;
  techStack: { language: string; framework: string; database: string; other: string[] };
  /** Full directory tree (up to TREE_DEPTH levels, build artefacts excluded). */
  fileTree: string;
  /** Filename of the README found at root (e.g. "README.md"), or null if none. */
  readmeFile: string | null;
  /** Relative paths of the files the LLM selected and read to build this summary. */
  analyzedFiles: string[];
  repoOwner: string;
  repoName: string;
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

        const repo = `${connection.repoOwner}/${connection.repoName}`;

        if (headSha === connection.lastCommitSha) {
          await this.connectionRepo.update(connection.id, { syncStatus: SyncStatus.SYNCED });
          console.log(`[GitHub Sync] ${repo}: no new commits since ${headSha.slice(0, 7)}, skipping`);
          return;
        }

        const summary = await this.extractKnowledge(tmpDir, headSha, connection.repoOwner, connection.repoName);

        const s3Key = `projects/${connection.project_id}/repo-knowledge/${connection.id}/${headSha}.json`;
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

        console.log(`[GitHub Sync] ${repo}: synced commit ${headSha.slice(0, 7)}`);
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const repo = `${connection.repoOwner}/${connection.repoName}`;
      console.error(`[GitHub Sync] ${repo}: sync failed —`, msg);
      await this.connectionRepo.update(connection.id, {
        syncStatus: SyncStatus.ERROR,
        lastError: msg,
      });
    }
  }

  private async extractKnowledge(
    repoDir: string,
    commitSha: string,
    repoOwner: string,
    repoName: string
  ): Promise<RepoKnowledgeSummary> {
    const pkgPath = path.join(repoDir, 'package.json');
    const packageJson = fs.existsSync(pkgPath)
      ? fs.readFileSync(pkgPath, 'utf8')
      : null;

    const tree = this.buildFileTree(repoDir, TREE_DEPTH);
    const readme = this.readReadme(repoDir);
    const files = await this.selectImportantFiles(repoDir, { packageJson, tree, readme }, repoOwner, repoName);

    const prompt = this.buildExtractionPrompt({ packageJson, tree, files, readme });
    console.log(`[GitHub Sync] ${repoOwner}/${repoName}: sending extraction prompt to LLM (${files.length} files, commit ${commitSha.slice(0, 7)})`);
    const raw = await this.llmService.generateJson(prompt);
    console.log(`[GitHub Sync] ${repoOwner}/${repoName}: LLM extraction complete`);

    const summary = raw as Omit<RepoKnowledgeSummary, 'commitSha' | 'generatedAt' | 'fileTree' | 'readmeFile' | 'analyzedFiles' | 'repoOwner' | 'repoName'>;
    return {
      ...summary,
      commitSha,
      generatedAt: new Date().toISOString(),
      fileTree: tree,
      readmeFile: readme?.path ?? null,
      analyzedFiles: files.map(f => f.path),
      repoOwner,
      repoName,
    };
  }

  /**
   * Asks the LLM which files matter most for the summary (max MAX_INITIAL_FILES),
   * reads them, then runs up to MAX_REFINEMENT_ROUNDS "is this enough?" rounds where
   * the LLM may request up to MAX_ADDITIONAL_FILES more files each time.
   */
  private async selectImportantFiles(
    repoDir: string,
    ctx: {
      packageJson: string | null;
      tree: string;
      readme: { path: string; content: string } | null;
    },
    repoOwner: string,
    repoName: string
  ): Promise<Array<{ path: string; content: string }>> {
    const repo = `${repoOwner}/${repoName}`;
    const files: Array<{ path: string; content: string }> = [];
    const seen = new Set<string>();

    console.log(`[GitHub Sync] ${repo}: sending file-selection prompt to LLM`);
    const initialRaw = await this.llmService.generateJson(
      this.buildFileSelectionPrompt(ctx)
    );
    const requested = this.extractRequestedPaths(initialRaw);
    console.log(`[GitHub Sync] ${repo}: LLM initial file selection: ${requested.join(', ') || '(none)'}`);
    files.push(...this.readRequestedFiles(repoDir, requested, MAX_INITIAL_FILES, seen));

    for (let round = 1; round <= MAX_REFINEMENT_ROUNDS; round++) {
      console.log(`[GitHub Sync] ${repo}: sending refinement prompt to LLM (round ${round}, ${files.length} files so far)`);
      const raw = await this.llmService.generateJson(
        this.buildRefinementPrompt(ctx, files)
      );
      const res = (raw ?? {}) as { enough?: unknown; files?: unknown };
      if (res.enough === true) {
        console.log(`[GitHub Sync] ${repo}: LLM confirmed context sufficient after round ${round}`);
        break;
      }

      const more = this.extractRequestedPaths(raw);
      console.log(`[GitHub Sync] ${repo}: LLM refinement round ${round} requested: ${more.join(', ') || '(none)'}`);
      const added = this.readRequestedFiles(repoDir, more, MAX_ADDITIONAL_FILES, seen);
      if (added.length === 0) break; // nothing new to read — stop iterating
      files.push(...added);
    }

    return files;
  }

  /** Pulls a string[] of file paths out of an LLM JSON response, tolerating malformed shapes. */
  private extractRequestedPaths(raw: unknown): string[] {
    const value = (raw as { files?: unknown } | null)?.files;
    return Array.isArray(value) ? value.filter((p): p is string => typeof p === 'string') : [];
  }

  /** Reads requested paths (up to `limit`), skipping duplicates, missing files, and paths outside the repo. */
  private readRequestedFiles(
    repoDir: string,
    requested: string[],
    limit: number,
    seen: Set<string>
  ): Array<{ path: string; content: string }> {
    const repoRoot = path.resolve(repoDir);
    const results: Array<{ path: string; content: string }> = [];

    for (const rawPath of requested) {
      if (results.length >= limit) break;
      const rel = rawPath.replace(/\\/g, '/').replace(/^\.?\//, '').trim();
      if (!rel || seen.has(rel)) continue;

      const fullPath = path.resolve(repoRoot, rel);
      if (fullPath !== repoRoot && !fullPath.startsWith(repoRoot + path.sep)) {
        console.warn(`[GitHub Sync] LLM requested path outside repo, skipping: ${rawPath}`);
        continue;
      }
      if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isFile()) {
        console.warn(`[GitHub Sync] LLM requested non-existent file, skipping: ${rel}`);
        continue;
      }

      seen.add(rel);
      results.push({ path: rel, content: fs.readFileSync(fullPath, 'utf8').slice(0, MAX_FILE_CHARS) });
    }

    return results;
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

  /** Returns the first README found at repo root, or null. */
  private readReadme(repoDir: string): { path: string; content: string } | null {
    for (const name of README_FILENAMES) {
      const fullPath = path.join(repoDir, name);
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf8').slice(0, MAX_README_CHARS);
        return { path: name, content };
      }
    }
    return null;
  }

  /** Shared context header (tree + README + package.json) used by the selection prompts. */
  private buildRepoContextSection(ctx: {
    packageJson: string | null;
    tree: string;
    readme: { path: string; content: string } | null;
  }): string {
    return [
      `Repository file structure (${TREE_DEPTH} levels deep):\n${ctx.tree}`,
      ctx.readme ? `README (${ctx.readme.path}):\n${ctx.readme.content}` : '',
      ctx.packageJson ? `package.json:\n${ctx.packageJson}` : '',
    ]
      .filter(Boolean)
      .join('\n\n');
  }

  private buildFileSelectionPrompt(ctx: {
    packageJson: string | null;
    tree: string;
    readme: { path: string; content: string } | null;
  }): string {
    return `You are a senior software architect preparing to write a structured onboarding knowledge summary of a code repository.

${this.buildRepoContextSection(ctx)}

Based on the file tree, README and package.json above, choose the files whose contents are most important to read in order to understand the architecture, key libraries, module structure, and tech stack of this project.

Rules:
- Select at most ${MAX_INITIAL_FILES} files.
- Only use relative file paths that appear verbatim in the file tree above — never invent paths.
- Prefer entry points, core services/modules, configuration, and routing/wiring files over tests or assets.

Output ONLY valid JSON — no markdown fences, no explanation:
{ "files": ["relative/path/to/file.ext"] }`.trim();
  }

  private buildRefinementPrompt(
    ctx: {
      packageJson: string | null;
      tree: string;
      readme: { path: string; content: string } | null;
    },
    filesRead: Array<{ path: string; content: string }>
  ): string {
    const filesSection = filesRead.length > 0
      ? filesRead.map(f => `--- ${f.path} ---\n${f.content}`).join('\n\n')
      : 'No files read yet.';

    return `You are a senior software architect preparing to write a structured onboarding knowledge summary of a code repository (architecture overview, key libraries, module breakdown, suggested reading order, tech stack).

${this.buildRepoContextSection(ctx)}

Files already read:
${filesSection}

Decide whether the files read so far give you enough context to produce an accurate summary. If not, request the additional files you still need.

Rules:
- If the context is sufficient, respond with { "enough": true, "files": [] }.
- If not, respond with { "enough": false, "files": [...] } listing at most ${MAX_ADDITIONAL_FILES} additional files.
- Only use relative file paths that appear verbatim in the file tree above — never invent paths, and never repeat files already read.

Output ONLY valid JSON — no markdown fences, no explanation:
{ "enough": boolean, "files": ["relative/path/to/file.ext"] }`.trim();
  }

  private buildExtractionPrompt(input: {
    packageJson: string | null;
    tree: string;
    files: Array<{ path: string; content: string }>;
    readme: { path: string; content: string } | null;
  }): string {
    const readmeSection = input.readme
      ? `README (${input.readme.path}) — primary project documentation, weight this most heavily:\n${input.readme.content}`
      : '';

    const filesSection =
      input.files.length > 0
        ? input.files
            .map(f => `--- ${f.path} ---\n${f.content}`)
            .join('\n\n')
        : 'No key files were read.';

    return `You are a senior software architect analyzing a code repository to produce a structured onboarding knowledge summary.

Repository file structure (${TREE_DEPTH} levels deep):
${input.tree}

${readmeSection}

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
    { "path": "string (relative directory or file path, e.g. src/api)", "purpose": "string", "dependsOn": ["string"] }
  ],
  "suggestedReadingOrder": [
    { "path": "relative/file/path.ext (actual file that exists in the repo)", "description": "why a new developer should read this file and what to learn from it" }
  ],
  "techStack": {
    "language": "string",
    "framework": "string",
    "database": "string",
    "other": ["string"]
  }
}`.trim();
  }
}
