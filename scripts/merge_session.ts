import * as fs from 'fs';
import * as path from 'path';
import { spawnSync } from 'child_process';
import { request, getApiKey } from './jules_client';

function runGit(args: string[]): { success: boolean; stdout: string; stderr: string } {
  const res = spawnSync('git', args, { encoding: 'utf8' });
  return {
    success: res.status === 0,
    stdout: res.stdout ? res.stdout.trim() : '',
    stderr: res.stderr ? res.stderr.trim() : ''
  };
}

function parseArgs(args: string[]): Record<string, string | boolean> {
  const params: Record<string, string | boolean> = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      const value = args[i + 1];
      if (value && !value.startsWith('--')) {
        params[key] = value;
        i++;
      } else {
        params[key] = true;
      }
    }
  }
  return params;
}

export async function mergeSession() {
  const params = parseArgs(process.argv.slice(2));
  const sessionId = String(params.session || params.id || '');

  if (!sessionId) {
    console.log(`
Jules Session Patch & Merge Helper (TypeScript)

Usage:
  npx tsx scripts/merge_session.ts --session <sessionId> [--target <targetBranch>]

Options:
  --session   Session ID from Google Jules
  --target    Target branch to merge patch into (defaults to current active branch)
`);
    process.exit(1);
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    console.error('Error: JULES_API_KEY not found in environment or .env file.');
    process.exit(1);
  }

  const headers = { 'X-Goog-Api-Key': apiKey };

  // 1. Git Pre-Flight Check
  console.log('=== Step 1: Pre-flight Git Status Check ===');
  const statusRes = runGit(['status', '--porcelain']);
  let didStash = false;

  if (statusRes.stdout) {
    console.log('Uncommitted working tree changes detected. Stashing local backup...');
    const stashRes = runGit(['stash', 'push', '-u', '-m', `jules-merge-backup-${sessionId}`]);
    if (!stashRes.success) {
      console.error('Error: Failed to stash local changes:', stashRes.stderr);
      process.exit(1);
    }
    didStash = true;
    console.log('Stash created successfully.');
  } else {
    console.log('Working tree is clean.');
  }

  const originalBranchRes = runGit(['branch', '--show-current']);
  const originalBranch = originalBranchRes.stdout || 'main';
  const targetBranch = String(params.target || originalBranch);

  // 2. Fetch patch from Jules REST API
  console.log(`\n=== Step 2: Fetching unidiff patch for session ${sessionId} ===`);
  const scratchDir = path.join(process.cwd(), '.jules-companion', 'scratch');
  fs.mkdirSync(scratchDir, { recursive: true });
  const patchPath = path.join(scratchDir, `${sessionId}.patch`);

  try {
    const data = await request(`https://jules.googleapis.com/v1alpha/sessions/${sessionId}/activities`, { headers });
    const activities = data.activities || [];
    let patchContent: string | null = null;

    for (const act of activities) {
      if (act.artifacts) {
        for (const art of act.artifacts) {
          if (art.changeSet && art.changeSet.gitPatch && art.changeSet.gitPatch.unidiffPatch) {
            patchContent = art.changeSet.gitPatch.unidiffPatch;
            break;
          }
        }
      }
      if (patchContent) break;
    }

    if (!patchContent) {
      throw new Error(`No git patch found in activity artifacts for session ${sessionId}`);
    }

    fs.writeFileSync(patchPath, patchContent, 'utf8');
    console.log(`Patch saved to ${patchPath}`);
  } catch (err: any) {
    console.error(`Failed to fetch patch: ${err.message}`);
    if (didStash) {
      console.log('Restoring stashed changes...');
      runGit(['stash', 'pop']);
    }
    process.exit(1);
  }

  // 3. Isolated Branch & Patch Application
  const patchBranch = `jules/patch-${sessionId.slice(0, 8)}`;
  console.log(`\n=== Step 3: Applying patch on isolated branch: ${patchBranch} ===`);

  // Create isolated branch from target branch
  const checkoutBranchRes = runGit(['checkout', '-b', patchBranch, targetBranch]);
  if (!checkoutBranchRes.success) {
    console.warn(`Could not create branch ${patchBranch}, trying checkout existing...`);
    runGit(['checkout', patchBranch]);
  }

  // Apply patch
  const applyRes = runGit(['apply', '--check', patchPath]);
  if (!applyRes.success) {
    console.error(`❌ Error: Git patch application check failed:\n${applyRes.stderr}`);
    console.log('Aborting merge and returning to original branch...');
    runGit(['checkout', originalBranch]);
    runGit(['branch', '-D', patchBranch]);
    if (didStash) {
      console.log('Restoring stashed changes...');
      runGit(['stash', 'pop']);
    }
    process.exit(1);
  }

  // Apply the patch for real
  runGit(['apply', patchPath]);
  runGit(['add', '.']);
  runGit(['commit', '-m', `Apply Jules patch from session ${sessionId}`]);
  console.log(`✓ Patch applied and committed cleanly on branch ${patchBranch}`);

  // 4. Merge to target branch
  console.log(`\n=== Step 4: Merging ${patchBranch} into ${targetBranch} ===`);
  runGit(['checkout', targetBranch]);
  const mergeRes = runGit(['merge', patchBranch, '--no-edit']);

  if (mergeRes.success) {
    console.log(`✅ Successfully merged ${patchBranch} into ${targetBranch}!`);
    runGit(['branch', '-d', patchBranch]);
    fs.unlinkSync(patchPath);
  } else {
    console.error(`⚠️ Merge conflict occurred when merging ${patchBranch} into ${targetBranch}:`);
    console.error(mergeRes.stderr);
    console.log(`Branch ${patchBranch} has been preserved for manual conflict resolution.`);
  }

  if (didStash) {
    console.log('\nRestoring your original local stashed changes...');
    runGit(['stash', 'pop']);
  }

  console.log('\nMerge operation completed.');
}

if (require.main === module) {
  mergeSession();
}
