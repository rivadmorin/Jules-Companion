import * as fs from 'fs';
import * as path from 'path';
import { request, getApiKey } from './jules_client';
import { parseArgs, getProjectDirs, runGit, loadSessions, saveSessions, ProjectDirs } from './utils';

/**
 * Validates the safety constraints before executing branch manipulations.
 * Prevents disruptive local branch switching operations if any registered cloud
 * sessions are still actively modifying or generating code.
 *
 * @param {Record<string, string>} headers - API headers including authentication.
 * @returns {Promise<boolean>} True if it's safe to proceed (no active sessions), false otherwise.
 */
export async function checkSafetyGate(headers: Record<string, string>): Promise<boolean> {
  // Load the current local state of all registered sessions from the persistent store
  const sessions = loadSessions();
  
  // Filter for sessions known to be in an intermediate operational state locally
  // We exclude terminal states (completed, merged, error) as they no longer mutate code
  const activeSessions = sessions.filter(s => s.status !== 'completed' && s.status !== 'merged' && s.status !== 'error');

  // If there are no locally recorded active sessions, the safety gate is immediately passed
  if (activeSessions.length === 0) return true;

  // Log the initiation of the safety check for visibility to the user
  console.log(`Checking safety gate: ${activeSessions.length} active sessions found locally.`);
  
  // Track if any session is confirmed to be still running remotely
  let hasRunning = false;

  // Verify against authoritative remote API source of truth concurrently
  await Promise.all(activeSessions.map(async (s) => {
    try {
      // Dispatch an API request to fetch the current authoritative status of the session
      const sessionData = await request(`https://jules.googleapis.com/v1alpha/sessions/${s.id}`, { headers });
      
      // Extract the state, defaulting to 'UNKNOWN' to handle unexpected API responses defensively
      const state = sessionData.state || 'UNKNOWN';
      
      // Determine if the remote session is still in a non-terminal state
      if (state !== 'COMPLETED' && state !== 'ERROR' && state !== 'CANCELLED') {
         // The session is still running; log its status and flag the gate as blocked
         console.log(`- Session ${s.id} (${s.agent}) is still ${state}`);
         hasRunning = true;
      } else if (state === 'COMPLETED' && s.status !== 'completed' && s.status !== 'inspected') {
         // Auto-sync status correction if local state was lagging
         s.status = 'completed';
      }
    } catch (e) {
      // In the event of network failure or API error, we fail open/secure by assuming the session is still active
      console.warn(`- Failed to fetch status for ${s.id}, assuming active for safety.`);
      hasRunning = true;
    }
  }));

  // Persist any auto-sync state corrections back to the local tracking file
  saveSessions(sessions);
  
  // The safety gate passes only if absolutely no running sessions were detected
  return !hasRunning;
}

/**
 * Scans the provided unified diff patch string and generates a human-readable
 * markdown summary abstracting file changes for the code review report.
 *
 * @param {string} patchContent - The raw git unified diff output.
 * @returns {string} Formatted markdown list of touched files and change operations.
 */
function generateDiffSummary(patchContent: string): string {
    // Split the raw patch string into individual lines for sequential parsing
    const lines = patchContent.split('\n');
    
    // Initialize an array to accumulate the formatted markdown list items
    const summary: string[] = [];
    
    // Iterate over each line of the diff to extract file modification paths
    for (const line of lines) {
        // Look for the standard diff prefix indicating a file header
        if (line.startsWith('diff --git')) {
            // Split the line into segments to isolate the file path arguments
            const parts = line.split(' ');
            
            // Ensure the diff line has the expected format (diff --git a/file b/file)
            if (parts.length >= 4) {
               // Extrapolate raw target file path (dropping standard a/ or b/ prefixes)
               // parts[3] corresponds to the destination file path, we strip the 'b/' prefix
               const file = parts[3].replace(/^b\//, '');
               
               // Append the formatted file path to our markdown summary array
               summary.push(`- **Modified:** \`${file}\``);
            }
        }
    }
    
    // Return the joined summary list, or a fallback message if the patch was empty/unparseable
    return summary.length > 0 ? summary.join('\n') : '- No identifiable file changes found in patch.';
}

/**
 * Generates the standardized markdown review report document following Stage 1 inspection.
 * This artifact is intended for human approval (or automated agent secondary review)
 * before the patch is finally merged.
 *
 * @param {string} sessionId - The session identifier.
 * @param {string} agent - The name of the AI agent handling the session.
 * @param {string} mode - The execution mode (e.g., 'code' or 'review').
 * @param {ProjectDirs} dirs - Resolved project standard directories.
 * @param {string} patchBranch - The isolated review branch name.
 * @param {string} targetBranch - The ultimate destination branch for the merge.
 */
function generateMarkdownReport(
    sessionId: string,
    agent: string,
    mode: string,
    dirs: ProjectDirs,
    patchBranch: string,
    targetBranch: string
) {
    const today = new Date().toISOString().split('T')[0];
    const reportPath = path.join(dirs.docsReviewsDir, `${today}-merge-report-${sessionId.slice(0, 8)}.md`);

    const patchPath = path.join(dirs.scratchDir, `${sessionId}.patch`);
    let patchSummary = '- Patch file not found locally.';
    let rawPatch = '';

    // Read the raw diff and generate summary
    if (fs.existsSync(patchPath)) {
        rawPatch = fs.readFileSync(patchPath, 'utf8');
        patchSummary = generateDiffSummary(rawPatch);
    }

    const reportContent = `# 🔍 Jules AI Merge Review Report

**Date:** ${new Date().toLocaleString()}
**Session ID:** \`${sessionId}\`
**Agent:** \`${agent}\`
**Mode:** \`${mode.toUpperCase()}\`

## 🌿 Branch Information
- **Target Branch:** \`${targetBranch}\`
- **Review Branch:** \`${patchBranch}\`

## 📊 Affected Files Summary
${patchSummary}

## ⚙️ Next Steps
1. Carefully review the modified code inside the isolated review branch: \`git checkout ${patchBranch}\`
2. Run your local test suites or linter validation.
3. If the patch quality is acceptable, execute the final merge:
   \`\`\`bash
   # Using CLI
   node dist/merge_session.js --approve ${sessionId}

   # Or via Antigravity slash command
   /jules-merge ${sessionId}
   \`\`\`

---
*This report was automatically generated by the Two-Stage Merge Engine during Stage 1 (Inspection).*
`;

    fs.mkdirSync(dirs.docsReviewsDir, { recursive: true });
    fs.writeFileSync(reportPath, reportContent, 'utf8');
    console.log(`\n📄 Markdown Review Report generated at: ${reportPath}`);
}


/**
 * Stage 1: Inspects a completed session by pulling its cloud patch output,
 * creating an isolated review branch, applying the patch locally, and generating reports.
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

  // Fetch chronological activities (including artifacts) from REST API
  try {
    const data = await request(`https://jules.googleapis.com/v1alpha/sessions/${sessionId}/activities`, { headers });
    const activities = data.activities || [];
    let patchContent: string | null = null;

    // Scan backwards/iteratively to locate the final unidiff Git patch payload generated by the cloud container
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

    // Save remote patch to a temporary local scratch file
    fs.writeFileSync(patchPath, patchContent, 'utf8');
  } catch (err: any) {
    console.error(`❌ Failed to fetch patch: ${err.message}`);
    return false;
  }

  // Define convention for the isolated branch name based on short ID
  const patchBranch = `jules/review-${sessionId.slice(0, 8)}`;
  console.log(`Checking out isolated review branch: ${patchBranch}...`);

  // Create a new isolated branch for this specific session review, starting from the target branch.
  // This allows manual testing and inspection without polluting the main working branch.
  const checkoutBranchRes = runGit(['checkout', '-b', patchBranch, targetBranch]);
  if (!checkoutBranchRes.success) {
    // If the branch already exists from a previous failed run, just check it out
    runGit(['checkout', patchBranch]);
  }

  // Apply check
  // Perform a dry-run patch application to detect fatal merge conflicts before modifying the working tree.
  const applyCheckRes = runGit(['apply', '--check', patchPath]);
  if (!applyCheckRes.success) {
    console.error(`❌ Error: Git patch dry-run failed:\n${applyCheckRes.stderr}`);
    // Rollback safely
    runGit(['checkout', originalBranch]);
    runGit(['branch', '-D', patchBranch]);
    if (fs.existsSync(patchPath)) fs.unlinkSync(patchPath);
    return false;
  }

  // Apply patch & commit on review branch
  runGit(['apply', patchPath]);
  runGit(['add', '.']);
  runGit(['commit', '-m', `Review patch for Jules session ${sessionId}`]);

  // Generate local visual code diff summary in terminal
  console.log(`\n📊 === Code Diff Summary Report (${sessionId.slice(0, 8)}) ===`);
  const statRes = runGit(['diff', 'HEAD~1..HEAD', '--stat']);
  if (statRes.stdout) {
    console.log(statRes.stdout);
  }

  const fullDiffRes = runGit(['diff', 'HEAD~1..HEAD']);
  fs.writeFileSync(path.join(dirs.scratchDir, `diff-${sessionId.slice(0, 8)}.log`), fullDiffRes.stdout || '', 'utf8');

  // Generate universal Markdown report for user review
  generateMarkdownReport(sessionId, agent, mode, dirs, patchBranch, targetBranch);

  // Return to original branch for safety, protecting user working tree
  runGit(['checkout', originalBranch]);

  if (sessionRecord) {
    // Escalate local state machine status indicating readiness for Stage 2
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

  // Verify the inspection branch actually exists before attempting to merge
  const branchCheck = runGit(['branch', '--list', patchBranch]);
  if (!branchCheck.stdout.trim()) {
    console.error(`❌ Error: Inspection branch '${patchBranch}' not found.`);
    console.log(`Please run Option 5 (Inspect Completed Sessions) first.`);
    return false;
  }

  console.log(`Merging review branch ${patchBranch} into ${targetBranch}...`);
  // Must checkout target before merging into it
  runGit(['checkout', targetBranch]);
  // Execute non-interactive fast-forward or standard merge strategy
  const mergeRes = runGit(['merge', patchBranch, '--no-edit']);

  if (mergeRes.success) {
    console.log(`✅ Successfully merged review branch into ${targetBranch}!`);
    // Cleanup the temporary inspection branch
    runGit(['branch', '-D', patchBranch]);
    
    // Clean up temporary patch file artifact
    const patchPath = path.join(dirs.scratchDir, `${sessionId}.patch`);
    if (fs.existsSync(patchPath)) fs.unlinkSync(patchPath);

    if (sessionRecord) {
       // Mark terminal state so it won't be processed again
      sessionRecord.status = 'merged';
      saveSessions(sessions);
    }
    
    runGit(['checkout', originalBranch]);
    return true;
  } else {
    console.error(`❌ Error: Merge conflict occurred during final integration:\n${mergeRes.stderr}`);
    // Revert back on failure so user can manually resolve conflicts in the IDE if needed
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
  // Safety Mechanism: We stash any uncommitted local changes (WIP) before switching branches.
  // This prevents dirty working tree errors during git checkout and protects the user's uncommitted work.
  const statusRes = runGit(['status', '--porcelain']);
  let didStash = false;
  if (statusRes.stdout) {
    console.log('Stashing uncommitted working tree changes...');
    // Create uniquely named stash to avoid conflicting with user's own stashes
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
    // We do not want to merge patches while other agents are concurrently generating code,
    // which could result in stale baseline states or chaotic merge conflicts.
    const safetyGateOk = await checkSafetyGate(headers);
    if (!safetyGateOk) {
      console.error('\n❌ Execution Blocked: One or more active sessions are still in progress.');
      console.error('Please wait until ALL active sessions are COMPLETED to avoid code conflicts.');
      if (didStash) runGit(['stash', 'pop']);
      process.exit(1);
    }

    if (isInspectAll) {
      const sessions = loadSessions();
      // Find all sessions ready for the Stage 1 inspection process
      const completedSessions = sessions.filter(s => s.status === 'completed' || s.status === 'launched' || s.status === 'plan_approved');
      console.log(`Found ${completedSessions.length} completed session(s) to inspect.`);
      // Run sequentially to ensure isolated branching operations don't collide
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
    // Safety Mechanism Recovery: Restore the user's uncommitted WIP changes back to their working directory
    console.log('Restoring stashed changes...');
    runGit(['stash', 'pop']);
  }
}

if (require.main === module) {
  mergeSession();
}
