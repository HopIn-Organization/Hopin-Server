import { execFile } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

/**
 * Returns the process working directory, or null if it no longer exists.
 *
 * A deleted cwd (deploy scripts that replace a release dir under a running
 * process) makes EVERY spawn fail with `spawn <cmd> ENOENT` — indistinguishable
 * from a missing binary unless checked separately. On Linux process.cwd()
 * itself throws ENOENT in that state.
 */
function currentWorkingDir(): string | null {
  try {
    return process.cwd();
  } catch {
    return null;
  }
}

/**
 * Path to the git executable. Defaults to bare `git` (resolved from PATH),
 * overridable via GIT_BINARY_PATH for hosts where git lives somewhere unusual.
 */
export const gitBinary = process.env.GIT_BINARY_PATH?.trim() || 'git';

/**
 * Verifies the git binary exists and is runnable.
 *
 * simple-git spawns `git` with shell:false, so a missing binary surfaces as an
 * opaque `spawn git ENOENT` inside runSync — recorded per-connection in
 * lastError, long after startup. Checking once at boot turns a silent,
 * per-sync failure into an immediate, actionable one.
 */
export async function assertGitAvailable(): Promise<string> {
  if (currentWorkingDir() === null) {
    throw new Error(
      'Working directory of this process no longer exists, so every child process ' +
        'fails with ENOENT regardless of whether git is installed. This usually means ' +
        'a deploy replaced the release directory while the server kept running — ' +
        'restart the server from a directory that exists.'
    );
  }

  try {
    // Run from tmpdir so a broken cwd can never be misreported as a missing binary.
    const { stdout } = await execFileAsync(gitBinary, ['--version'], {
      cwd: os.tmpdir(),
    });
    return stdout.trim();
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code === 'ENOENT') {
      throw new Error(
        `git binary not found (tried "${gitBinary}"). GitHub repo sync shells out to git ` +
          `and cannot run without it. Note this reflects THIS process's environment — ` +
          `git working in your login shell does not mean the server can see it (common ` +
          `when the app runs in a container while git is installed on the host). Install ` +
          `git where the server actually runs (Debian/Ubuntu: "apt-get install -y git", ` +
          `Alpine: "apk add --no-cache git"), or set GIT_BINARY_PATH to its full path.\n` +
          `PATH=${process.env.PATH ?? '(unset)'}\ncwd=${currentWorkingDir() ?? '(missing)'}`
      );
    }
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`git binary at "${gitBinary}" is not runnable: ${msg}`);
  }
}

export interface GitDiagnostics {
  ok: boolean;
  binary: string;
  /** Where `binary` came from — helps spot a GIT_BINARY_PATH typo vs. a PATH miss. */
  binarySource: 'GIT_BINARY_PATH' | 'PATH';
  version: string | null;
  failure: { code: string | null; message: string } | null;
  cwd: string | null;
  path: string;
  platform: string;
  /**
   * True when running inside a container. The whole class of "git works when I
   * SSH in but the app says ENOENT" bugs comes from git being on the host and
   * absent from the image, so this flag is what makes the log actionable.
   */
  inContainer: boolean;
  /** Clones land in mkdtemp(os.tmpdir()); an unwritable tmpdir fails right after git starts working. */
  tmpDir: string;
  tmpDirWritable: boolean;
}

function isLikelyContainer(): boolean {
  try {
    return fs.existsSync('/.dockerenv');
  } catch {
    return false;
  }
}

function isTmpDirWritable(): boolean {
  try {
    fs.accessSync(os.tmpdir(), fs.constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Collects everything needed to explain a git spawn failure, without throwing.
 *
 * Deliberately side-effect free with respect to control flow: callers use it for
 * observability only, so a broken git environment still fails exactly where it
 * failed before, with its original error.
 */
export async function inspectGit(): Promise<GitDiagnostics> {
  const base = {
    binary: gitBinary,
    binarySource: (process.env.GIT_BINARY_PATH?.trim()
      ? 'GIT_BINARY_PATH'
      : 'PATH') as 'GIT_BINARY_PATH' | 'PATH',
    cwd: currentWorkingDir(),
    path: process.env.PATH ?? '(unset)',
    platform: `${os.platform()} ${os.arch()}`,
    inContainer: isLikelyContainer(),
    tmpDir: os.tmpdir(),
    tmpDirWritable: isTmpDirWritable(),
  };

  try {
    // Run from tmpdir so a broken cwd can never be misreported as a missing binary.
    const { stdout } = await execFileAsync(gitBinary, ['--version'], {
      cwd: os.tmpdir(),
    });
    return { ...base, ok: true, version: stdout.trim(), failure: null };
  } catch (err) {
    return {
      ...base,
      ok: false,
      version: null,
      failure: {
        code: (err as NodeJS.ErrnoException)?.code ?? null,
        message: err instanceof Error ? err.message : String(err),
      },
    };
  }
}

/** Formats `inspectGit()` output as a single log line. Never throws. */
export async function logGitDiagnostics(
  context: string
): Promise<GitDiagnostics> {
  const d = await inspectGit();
  const where = `container=${d.inContainer} platform=${d.platform} cwd=${d.cwd ?? '(missing)'}`;
  const tmp = `tmpDir=${d.tmpDir} writable=${d.tmpDirWritable}`;

  if (d.ok) {
    console.log(
      `[git] ${context}: OK — ${d.version} (binary="${d.binary}" via ${d.binarySource}) ${where} ${tmp}`
    );
  } else {
    console.error(
      `[git] ${context}: UNAVAILABLE — ${d.failure?.message} (code=${d.failure?.code ?? 'none'}, ` +
        `binary="${d.binary}" via ${d.binarySource}) ${where} ${tmp}\n` +
        `[git] ${context}: PATH=${d.path}\n` +
        `[git] ${context}: PATH entries containing a git executable: ${describeGitOnPath()}`
    );
  }

  return d;
}

/**
 * Scans PATH for a git executable so the log distinguishes "not installed
 * anywhere" from "installed, but this process's PATH does not include it".
 */
function describeGitOnPath(): string {
  const raw = process.env.PATH;
  if (!raw) return '(PATH unset)';

  const names =
    process.platform === 'win32' ? ['git.exe', 'git.cmd', 'git'] : ['git'];
  const hits: string[] = [];

  for (const dir of raw.split(path.delimiter)) {
    if (!dir) continue;
    for (const name of names) {
      try {
        if (fs.existsSync(path.join(dir, name))) {
          hits.push(path.join(dir, name));
          break;
        }
      } catch {
        // Unreadable PATH entry — irrelevant to the diagnosis, keep scanning.
      }
    }
  }

  return hits.length > 0 ? hits.join(', ') : '(none)';
}
