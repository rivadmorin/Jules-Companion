import * as fs from 'fs';
import * as path from 'path';
import { request, getApiKey } from './jules_client';
import { parseArgs, getProjectDirs, loadSessions, saveSessions, runGit, SessionRecord } from './utils';

/**
 * Evaluates the safety gate by verifying that all active sessions have concluded.
 * This prevents concurrent modifications from interfering with one another.
 *
 * @param {Record<string, string>} headers - The HTTP headers including the authentication token.
 * @returns {Promise<boolean>} True if all tracked sessions are completed or failed, false otherwise.
 */
export async function checkSafetyGate(headers: Record<string, string>): Promise<boolean> {
  const sessions = loadSessions();
  const activeSessions = sessions.filter(s => s.status !== 'merged' && s.status !== 'failed');
  if (activeSessions.length === 0) return true;

  console.log(`Checking Safety Gate for ${activeSessions.length} active session(s)...`);
  let allCompleted = true;

  await Promise.all(activeSessions.map(async (s) => {
    try {
      const data = await request(`https://jules.googleapis.com/v1alpha/sessions/${s.id}`, { headers });
      const state = data.state || 'UNKNOWN';
      if (state !== 'COMPLETED' && state !== 'FAILED') {
        console.warn(`❌ Safety Gate Blocked: Session ${s.id} (${s.agent}) is still in state '${state}'.`);
        allCompleted = false;
      } else if (state === 'FAILED') {
        s.status = 'failed';
      } else if (state === 'COMPLETED') {
        s.status = 'completed';
      }
    } catch (err: any) {
      console.warn(`⚠️ Warning: Failed to query status for session ${s.id}: ${err.message}`);
    }
  }));

  saveSessions(sessions);
  return allCompleted;
}

/**
 * Generates a comprehensive Markdown report summarizing the changes or review findings
 * produced by a Jules session. The report includes Git diff statistics and concatenated reviews.
 *
 * @param {string} sessionId - The unique identifier of the Jules session.
 * @param {string} agent - The name of the agent that executed the session.
 * @param {'code' | 'review'} mode - The execution mode (code implementation or review audit).
 * @param {any} dirs - Project directories context object.
 * @param {string} patchBranch - The isolated Git branch where changes were applied.
 * @param {string} targetBranch - The target branch intended for final merging.
 * @returns {string} The absolute path to the generated Markdown report file.
 */
function generateMarkdownReport(
  sessionId: string,
  agent: string,
  mode: 'code' | 'review',
  dirs: any,
  patchBranch: string,
  targetBranch: string
): string {
  const today = new Date().toISOString().split('T')[0];
  const reportPath = path.join(dirs.targetDir, 'docs', 'jules-reports', `${today}-${mode}-${agent}-${sessionId.slice(0, 8)}.md`);

  const statRes = runGit(['diff', 'HEAD~1..HEAD', '--stat']);
  const diffStat = statRes.stdout || 'No changes detected.';

  let detailedAuditFindings = '';
  if (mode === 'review') {
    const filesRes = runGit(['diff', 'HEAD~1..HEAD', '--name-only']);
    const files = filesRes.stdout.split('\n').filter(f => f.includes('docs/jules-reviews/') && f.endsWith('.md'));
    if (files.length > 0) {
      detailedAuditFindings = `\n## 🔍 Synthesized Audit Findings\n`;
      for (const f of files) {
        const fullPath = path.join(dirs.targetDir, f);
        if (fs.existsSync(fullPath)) {
          const findings = fs.readFileSync(fullPath, 'utf8');
          detailedAuditFindings += `\n### File: [${path.basename(f)}](file://${fullPath})\n${findings}\n`;
        }
      }
    } else {
      detailedAuditFindings = `\n⚠️ No review report files found under docs/jules-reviews/ in the patch.`;
    }
  }

  const reportContent = `# 📄 Jules Session Report: ${agent} (${mode.toUpperCase()})

- **Date**: ${new Date().toLocaleString()}
- **Session ID**: \`${sessionId}\`
- **Mode**: ${mode.toUpperCase()}
- **Agent**: ${agent}
- **Review Branch**: \`${patchBranch}\`
- **Target Branch**: \`${targetBranch}\`

---

## 📊 Code Changes Summary (Git Stat)
\`\`\`text
${diffStat}
\`\`\`
${detailedAuditFindings}

---

## 📋 Inspection Checklist for Main Agent & User
- [ ] Code syntax & type safety verified (\`npx tsc --noEmit\`).
- [ ] Application behavior tested locally.
- [ ] Main Agent & User alignment.
- [ ] Approval Action: Run \`jules-companion\` Option 6 or command \`node dist/merge_session.js --approve ${sessionId}\` to finalize merge.
`;

  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, reportContent, 'utf8');
  console.log(`✓ Markdown Report generated successfully at:`);
  console.log(`  [Report File](file://${reportPath})`);
  return reportPath;
}

/**
 * Stage 1: Inspects a completed session by pulling its patch, applying it to a new
 * isolated Git review branch, and generating a local diff summary report.
 *
 * @param {string} sessionId - The unique identifier of the session to inspect.
 * @param {string} targetBranch - The branch from which the review branch will be cut.
 * @param {Record<string, string>} headers - The HTTP headers for API authentication.
 * @param {string} originalBranch - The branch to return to after inspection operations.
 * @returns {Promise<boolean>} True if inspection completes successfully, false on error.
 */
export async function inspectSession(
  sessionId: string,
  targetBranch: string,
  headers: Record<string, string>,
  originalBranch: string
): Promise<boolean> {
  const dirs = getProjectDirs();
  const sessions = loadSessions();
  const sessionRecord = sessions.find(s => s.id === sessionId);
  const agent = sessionRecord ? sessionRecord.agent : 'unknown';
  const mode = sessionRecord ? sessionRecord.mode : 'code';

  console.log(`\n==========================================================================`);
  console.log(`🔍 Stage 1: Inspecting Session ${sessionId} (${agent})`);
  console.log(`==========================================================================`);

  const patchPath = path.join(dirs.scratchDir, `${sessionId}.patch`);

  // Fetch patch from REST API
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
      console.error(`❌ Error: No git patch content found for session ${sessionId}.`);
      return false;
    }

    fs.writeFileSync(patchPath, patchContent, 'utf8');
  } catch (err: any) {
    console.error(`❌ Failed to fetch patch: ${err.message}`);
    return false;
  }

  const patchBranch = `jules/review-${sessionId.slice(0, 8)}`;
  console.log(`Checking out isolated review branch: ${patchBranch}...`);

  // Create a new isolated branch for this specific session review, starting from the target branch
  const checkoutBranchRes = runGit(['checkout', '-b', patchBranch, targetBranch]);
  if (!checkoutBranchRes.success) {
    runGit(['checkout', patchBranch]);
  }

  // Apply check
  // Perform a dry-run patch application to detect merge conflicts before modifying the working tree
  const applyCheckRes = runGit(['apply', '--check', patchPath]);
  if (!applyCheckRes.success) {
    console.error(`❌ Error: Git patch dry-run failed:\n${applyCheckRes.stderr}`);
    runGit(['checkout', originalBranch]);
    runGit(['branch', '-D', patchBranch]);
    if (fs.existsSync(patchPath)) fs.unlinkSync(patchPath);
    return false;
  }

  // Apply patch & commit on review branch
  runGit(['apply', patchPath]);
  runGit(['add', '.']);
  runGit(['commit', '-m', `Review patch for Jules session ${sessionId}`]);

  // Generate local visual code diff summary
  console.log(`\n📊 === Code Diff Summary Report (${sessionId.slice(0, 8)}) ===`);
  const statRes = runGit(['diff', 'HEAD~1..HEAD', '--stat']);
  if (statRes.stdout) {
    console.log(statRes.stdout);
  }

  const fullDiffRes = runGit(['diff', 'HEAD~1..HEAD']);
  fs.writeFileSync(path.join(dirs.scratchDir, `diff-${sessionId.slice(0, 8)}.log`), fullDiffRes.stdout || '', 'utf8');

  // Generate universal Markdown report
  generateMarkdownReport(sessionId, agent, mode, dirs, patchBranch, targetBranch);

  // Return to original branch for safety
  runGit(['checkout', originalBranch]);

  if (sessionRecord) {
    sessionRecord.status = 'inspected';
    saveSessions(sessions);
  }

  console.log(`\n✅ Stage 1 complete. Review branch '${patchBranch}' is prepared.`);
  return true;
}

/**
 * Stage 2: Approves and merges the isolated review branch back into the main target branch.
 * Cleans up temporary artifacts and branch structures after a successful merge.
 *
 * @param {string} sessionId - The unique identifier of the session being approved.
 * @param {string} targetBranch - The branch that will receive the merged changes.
 * @param {string} originalBranch - The branch to checkout after the merge operation concludes.
 * @returns {Promise<boolean>} True if the merge completes successfully, false otherwise.
 */
export async function approveMerge(
  sessionId: string,
  targetBranch: string,
  originalBranch: string
): Promise<boolean> {
  const dirs = getProjectDirs();
  const sessions = loadSessions();
  const sessionRecord = sessions.find(s => s.id === sessionId);
  const patchBranch = `jules/review-${sessionId.slice(0, 8)}`;

  console.log(`\n==========================================================================`);
  console.log(`✅ Stage 2: Approving Merge for Session ${sessionId}`);
  console.log(`==========================================================================`);

  // Verify branch exists
  const branchCheck = runGit(['branch', '--list', patchBranch]);
  if (!branchCheck.stdout.trim()) {
    console.error(`❌ Error: Inspection branch '${patchBranch}' not found.`);
    console.log(`Please run Option 5 (Inspect Completed Sessions) first.`);
    return false;
  }

  console.log(`Merging review branch ${patchBranch} into ${targetBranch}...`);
  runGit(['checkout', targetBranch]);
  const mergeRes = runGit(['merge', patchBranch, '--no-edit']);

  if (mergeRes.success) {
    console.log(`✅ Successfully merged review branch into ${targetBranch}!`);
    runGit(['branch', '-D', patchBranch]);
    
    // Clean up temporary patch file
    const patchPath = path.join(dirs.scratchDir, `${sessionId}.patch`);
    if (fs.existsSync(patchPath)) fs.unlinkSync(patchPath);

    if (sessionRecord) {
      sessionRecord.status = 'merged';
      saveSessions(sessions);
    }
    
    runGit(['checkout', originalBranch]);
    return true;
  } else {
    console.error(`❌ Error: Merge conflict occurred during final integration:\n${mergeRes.stderr}`);
    runGit(['checkout', originalBranch]);
    return false;
  }
}

/**
 * Main CLI entry point for the Two-Stage Merge & Inspection Engine.
 *
 * This orchestration function parses command line arguments to coordinate either
 * the inspection (Stage 1) or approval (Stage 2) workflows. It includes a critical safety
 * mechanism: it stashes local uncommitted changes before performing branch modifications
 * (to prevent accidental loss of developer work) and pops the stash after the operation
 * is complete. It also enforces a safety gate to block operations if active sessions are
 * still in progress.
 *
 * @returns {Promise<void>}
 */
export async function mergeSession() {
  const params = parseArgs(process.argv.slice(2));
  const isInspect = Boolean(params.inspect);
  const isApprove = Boolean(params.approve);
  const isInspectAll = Boolean(params['inspect-all']);
  
  const rawSessionsParam = params.session || params.sessions || params.id;
  const sessionId = rawSessionsParam ? String(rawSessionsParam).trim() : null;

  if (!isInspect && !isApprove && !isInspectAll) {
    console.log(`
Jules Two-Stage Merge & Inspection Engine

Usage:
  node dist/merge_session.js --inspect <sessionId>
  node dist/merge_session.js --approve <sessionId>
  node dist/merge_session.js --inspect-all

Options:
  --inspect     Stage 1: Apply patch to review branch and generate Markdown report
  --approve     Stage 2: Merge inspected review branch into target branch
  --inspect-all Stage 1: Inspect all completed registered sessions
`);
    process.exit(1);
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    console.error('Error: JULES_API_KEY not found.');
    process.exit(1);
  }

  const headers = { 'X-Goog-Api-Key': apiKey };

  // Git Pre-flight Stash Check
  // Safety Mechanism: We stash any uncommitted local changes before switching branches.
  // This prevents dirty working tree errors during git checkout and protects the user's WIP.
  const statusRes = runGit(['status', '--porcelain']);
  let didStash = false;
  if (statusRes.stdout) {
    console.log('Stashing uncommitted working tree changes...');
    const stashRes = runGit(['stash', 'push', '-u', '-m', `jules-merge-backup-${Date.now()}`]);
    if (!stashRes.success) {
      console.error('Error: Stash failed. Aborting.');
      process.exit(1);
    }
    didStash = true;
  }

  const originalBranchRes = runGit(['branch', '--show-current']);
  const originalBranch = originalBranchRes.stdout || 'main';
  const targetBranch = String(params.target || originalBranch);

  try {
    // Enforce Safety Gate before any inspect/approve operations
    const safetyGateOk = await checkSafetyGate(headers);
    if (!safetyGateOk) {
      console.error('\n❌ Execution Blocked: One or more active sessions are still in progress.');
      console.error('Please wait until ALL active sessions are COMPLETED to avoid code conflicts.');
      if (didStash) runGit(['stash', 'pop']);
      process.exit(1);
    }

    if (isInspectAll) {
      const sessions = loadSessions();
      const completedSessions = sessions.filter(s => s.status === 'completed' || s.status === 'launched' || s.status === 'plan_approved');
      console.log(`Found ${completedSessions.length} completed session(s) to inspect.`);
      for (const s of completedSessions) {
        await inspectSession(s.id, targetBranch, headers, originalBranch);
      }
    } else if (isInspect && sessionId) {
      await inspectSession(sessionId, targetBranch, headers, originalBranch);
    } else if (isApprove && sessionId) {
      await approveMerge(sessionId, targetBranch, originalBranch);
    }

  } catch (err: any) {
    console.error(`Execution failed: ${err.message}`);
  }

  if (didStash) {
    console.log('Restoring stashed changes...');
    runGit(['stash', 'pop']);
  }
}

if (require.main === module) {
  mergeSession();
}
