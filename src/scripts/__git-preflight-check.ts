/**
 * Prints the git environment exactly as the server process sees it.
 *
 * Run it wherever a sync is failing — most usefully *inside* the container
 * (`docker exec -it hopin-server npx ts-node src/scripts/__git-preflight-check.ts`,
 * or `docker exec -it hopin-server git --version` against a built image) — since
 * git being present on the host says nothing about the image.
 */
import { inspectGit, logGitDiagnostics } from '../github/git-binary';

logGitDiagnostics('preflight')
  .then(async () => {
    const d = await inspectGit();
    console.log('\nFull diagnostics:\n' + JSON.stringify(d, null, 2));
    process.exit(d.ok ? 0 : 1);
  })
  .catch(e => {
    // logGitDiagnostics is designed not to throw; if it ever does, that itself
    // is the finding.
    console.error('preflight itself threw (unexpected):', e);
    process.exit(1);
  });
