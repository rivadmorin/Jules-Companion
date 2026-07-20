import * as fs from 'fs';
import * as path from 'path';
import { request, getApiKey } from './jules_client';
import { parseArgs, getProjectDirs, loadSessions, runGit } from './utils';

async function processMergeForSession(
  sessionId: string,
  targetBranch: string,
  headers: Record<string, string>,
  scratchDir: string,
  originalBranch: string
): Promise<boolean> {
  console.log(`\n==========================================================================`);
  console.log(`🚀 Processing Merge for Session ID: ${sessionId}`);
  console.log(`==========================================================================`);

  fs.mkdirSync(scratchDir, { recursive: true });
  const patchPath = path.join(scratchDir, `${sessionId}.patch`);

  // Fetch patch from Jules REST API
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

    if (!patchContent || patchContent.trim().length === 0) {
      console.warn(`⚠️ Warning: No git patch content found for session ${sessionId}. Skipping.`);
      return false;
    }

    fs.writeFileSync(patchPath, patchContent, 'utf8');
    console.log(`✓ Patch fetched and saved to ${patchPath}`);
  } catch (err: any) {
    console.error(`❌ Failed to fetch patch for ${sessionId}: ${err.message}`);
    return false;
  }

  const patchBranch = `jules/patch-${sessionId.slice(0, 8)}`;
  console.log(`Creating isolated branch: ${patchBranch} from ${targetBranch}...`);

  const checkoutBranchRes = runGit(['checkout', '-b', patchBranch, targetBranch]);
  if (!checkoutBranchRes.success) {
    console.warn(`Branch ${patchBranch} exists, checking out...`);
    runGit(['checkout', patchBranch]);
  }

  // Check patch application
  const applyCheckRes = runGit(['apply', '--check', patchPath]);
  if (!applyCheckRes.success) {
    console.error(`❌ Error: Git patch dry-run failed for session ${sessionId}:\n${applyCheckRes.stderr}`);
    console.log('Aborting merge for this session...');
    runGit(['checkout', originalBranch]);
    runGit(['branch', '-D', patchBranch]);
    if (fs.existsSync(patchPath)) fs.unlinkSync(patchPath);
    return false;
  }

  // Apply patch & stage
  runGit(['apply', patchPath]);
  runGit(['add', '.']);

  // Visual Code Diff Report
  console.log(`\n📊 === Code Diff Summary Report (${sessionId.slice(0, 8)}) ===`);
  const statRes = runGit(['diff', '--cached', '--stat']);
  if (statRes.stdout) {
    console.log(statRes.stdout);
  }

  const fullDiffRes = runGit(['diff', '--cached']);
  const diffLogPath = path.join(scratchDir, `diff-${sessionId.slice(0, 8)}.log`);
  fs.writeFileSync(diffLogPath, fullDiffRes.stdout || '', 'utf8');
  console.log(`⚡ Detailed diff log saved to: ${diffLogPath}`);

  const reviewFilesRes = runGit(['diff', '--cached', '--name-only']);
  const reviewFiles = reviewFilesRes.stdout.split('\n').filter(f => f.includes('docs/jules-reviews/'));
  if (reviewFiles.length > 0) {
    console.log(`\n📄 Review Markdown Document(s) Detected:`);
    reviewFiles.forEach(f => console.log(`  - ${f}`));
  }

  // Commit patch
  runGit(['commit', '-m', `Apply Jules patch from session ${sessionId}`]);
  console.log(`✓ Patch committed cleanly on branch ${patchBranch}`);

  // Merge into target branch
  console.log(`Merging ${patchBranch} into ${targetBranch}...`);
  runGit(['checkout', targetBranch]);
  const mergeRes = runGit(['merge', patchBranch, '--no-edit']);

  if (mergeRes.success) {
    console.log(`✅ Successfully merged ${patchBranch} into ${targetBranch}!`);
    runGit(['branch', '-d', patchBranch]);
    if (fs.existsSync(patchPath)) fs.unlinkSync(patchPath);
    return true;
  } else {
    console.error(`⚠️ Merge conflict occurred when merging ${patchBranch} into ${targetBranch}:`);
    console.error(mergeRes.stderr);
    console.log(`Branch ${patchBranch} has been preserved for manual conflict resolution.`);
    return false;
  }
}

export async function mergeSession() {
  const params = parseArgs(process.argv.slice(2));
  const isAll = Boolean(params.all);
  const rawSessionsParam = params.sessions || params.session || params.id;
  const sessionIdList = rawSessionsParam ? String(rawSessionsParam).split(',').map(s => s.trim()) : [];

  if (!isAll && sessionIdList.length === 0) {
    console.log(`
Jules Session Patch & Merge Helper (TypeScript)

Usage:
  node dist/merge_session.js --session <sessionId> [--target <targetBranch>]
  node dist/merge_session.js --sessions <id1,id2> [--target <targetBranch>]
  node dist/merge_session.js --all [--target <targetBranch>]

Options:
  --session   Single session ID from Google Jules
  --sessions  Comma-separated list of session IDs
  --all       Batch merge all registered completed sessions in .jules-companion/sessions.json
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
  const dirs = getProjectDirs();

  // 1. Pre-flight Git Status Check
  console.log('=== Step 1: Pre-flight Git Status Check ===');
  const statusRes = runGit(['status', '--porcelain']);
  let didStash = false;

  if (statusRes.stdout) {
    console.log('Uncommitted working tree changes detected. Stashing local backup...');
    const stashRes = runGit(['stash', 'push', '-u', '-m', `jules-merge-backup-${Date.now()}`]);
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

  let targetSessionIds: string[] = [];

  if (isAll) {
    const registeredSessions = loadSessions();
    targetSessionIds = registeredSessions.map(s => s.id);
    if (targetSessionIds.length === 0) {
      console.log('No registered sessions found in .jules-companion/sessions.json');
      if (didStash) runGit(['stash', 'pop']);
      process.exit(0);
    }
    console.log(`Found ${targetSessionIds.length} registered session(s) for batch merge.`);
  } else {
    targetSessionIds = sessionIdList;
  }

  let successCount = 0;
  let failCount = 0;

  for (const id of targetSessionIds) {
    const ok = await processMergeForSession(id, targetBranch, headers, dirs.scratchDir, originalBranch);
    if (ok) successCount++;
    else failCount++;
  }

  console.log('\n==========================================================================');
  console.log(`🎉 Batch Merge Execution Finished: ${successCount} Succeeded, ${failCount} Failed.`);
  console.log('==========================================================================');

  if (didStash) {
    console.log('Restoring your original local stashed changes...');
    runGit(['stash', 'pop']);
  }
}

if (require.main === module) {
  mergeSession();
}
