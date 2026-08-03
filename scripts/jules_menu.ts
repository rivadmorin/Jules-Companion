import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';
import { runSetup } from './setup';
import { getProjectDirs, runGit, loadSessions } from './utils';
import { deploySession } from './deploy_session';
import { inspectSession, approveMerge, checkSafetyGate } from './merge_session';
import { autoProcess } from './auto_process';
import { getApiKey } from './jules_client';

const SPECIALIST_AGENTS = [
  { name: "innovator", desc: "Feature Engineering & Core Logic" },
  { name: "bolt", desc: "Performance & Optimization Expert" },
  { name: "sentinel", desc: "Security Auditing & Hardening" },
  { name: "exterminator", desc: "Bug Fixing & Root Cause Analysis" },
  { name: "palette", desc: "UI/UX, CSS, and Styling Expert" },
  { name: "inspector", desc: "Test Coverage & Edge Case Validation" },
  { name: "janitor", desc: "Code Refactoring & Cleanup" },
  { name: "dockerist", desc: "Containerization & DevOps" },
  { name: "scribe", desc: "Documentation & Readme Generation" },
  { name: "critic", desc: "Code Review & PR Feedback" }
];

/**
 * Handles the manual deployment of a Jules session via the TUI or slash commands.
 * Validates inputs and delegates to the core `deploySession` orchestrator.
 *
 * @param {string} [agent] - The target agent name.
 * @param {string} [task] - The task description.
 * @param {string} mode - The execution mode ('code' or 'review').
 * @returns {Promise<void>}
 */
async function handleManualDeploy(agent?: string, task?: string, mode: string = 'code') {
  if (!agent || !task) {
    console.error(JSON.stringify({ error: "Missing --agent or --task arguments" }));
    return;
  }

  // Inject command-line arguments to satisfy the deploySession CLI parser dependency
  process.argv = [process.argv[0], process.argv[1], '--type', 'start', '--agents', agent, '--task', task, '--mode', mode];

  try {
    await deploySession();
    console.log(JSON.stringify({ status: "success", action: "deploy", agent, mode }));
  } catch (err: any) {
    console.error(JSON.stringify({ error: `Deployment failed: ${err.message}` }));
  }
}

/**
 * Executes a "Smart Launch" by heuristically analyzing natural language intent
 * to auto-select the most appropriate specialist AI agent for a given task.
 *
 * @param {string} [goal] - The natural language intent or objective.
 * @param {string} mode - The execution mode ('code' or 'review').
 * @returns {Promise<void>}
 */
async function handleSmartLaunch(goal?: string, mode: string = 'code') {
  if (!goal) {
    console.error(JSON.stringify({ error: "Missing --goal argument for smart launch" }));
    return;
  }

  console.log(JSON.stringify({ info: "Analyzing intent..." }));
  const goalLower = goal.toLowerCase();

  // Basic heuristic keyword matching routing logic
  let selectedAgent = 'innovator'; // Default fallback
  if (goalLower.includes('ui') || goalLower.includes('css') || goalLower.includes('style')) selectedAgent = 'palette';
  else if (goalLower.includes('security') || goalLower.includes('audit')) selectedAgent = 'sentinel';
  else if (goalLower.includes('speed') || goalLower.includes('optimize') || goalLower.includes('memory')) selectedAgent = 'bolt';
  else if (goalLower.includes('bug') || goalLower.includes('fix') || goalLower.includes('error')) selectedAgent = 'exterminator';
  else if (goalLower.includes('test') || goalLower.includes('coverage')) selectedAgent = 'inspector';
  else if (goalLower.includes('clean') || goalLower.includes('refactor')) selectedAgent = 'janitor';
  else if (goalLower.includes('docker') || goalLower.includes('container')) selectedAgent = 'dockerist';
  else if (goalLower.includes('docs') || goalLower.includes('readme')) {
      selectedAgent = 'scribe';
      mode = 'review'; // Force review mode to prevent documentation tools from corrupting code logic
  } else if (goalLower.includes('review')) {
      selectedAgent = 'critic';
      mode = 'review';
  }

  const agentData = SPECIALIST_AGENTS.find(a => a.name === selectedAgent);
  console.log(JSON.stringify({
    action: "smart_launch_analysis",
    selectedAgent: selectedAgent,
    description: agentData?.desc,
    mode: mode
  }));

  try {
    // Dispatch to standard deployment logic with dynamically selected parameters
    process.argv = [process.argv[0], process.argv[1], '--type', 'start', '--agents', selectedAgent, '--task', goal, '--mode', mode];
    await deploySession();
    console.log(JSON.stringify({ status: "success", action: "smart_launch", agent: selectedAgent, mode }));
  } catch (err: any) {
    console.error(JSON.stringify({ error: `Smart launch failed: ${err.message}` }));
  }
}

/**
 * Retrieves and outputs the list of active Jules sessions from local storage.
 * Formats output as JSON for consumption by external IDE clients.
 *
 * @returns {Promise<void>}
 */
async function showActiveSessions() {
  const sessions = loadSessions();
  if (sessions.length === 0) {
    console.log(JSON.stringify({ status: "success", data: [], message: "No active sessions found" }));
    return;
  }
  console.log(JSON.stringify({ status: "success", data: sessions }));
}

/**
 * Triggers the auto-process engine to poll and automatically advance all
 * active Jules sessions (e.g., auto-approving plans, auto-replying).
 *
 * @returns {Promise<void>}
 */
async function handleAutoProcess() {
  process.argv = [process.argv[0], process.argv[1], '--all'];
  try {
    await autoProcess();
    console.log(JSON.stringify({ status: "success", action: "auto_process" }));
  } catch (err: any) {
    console.error(JSON.stringify({ error: `Auto-processing failed: ${err.message}` }));
  }
}

/**
 * Inspects a completed Jules session by fetching its patch, applying it to
 * an isolated review branch, and generating a markdown report.
 * Checks the safety gate before proceeding.
 *
 * @param {string} [sessionId] - The ID of the session to inspect. If not provided, lists available sessions.
 * @returns {Promise<void>}
 */
async function handleInspect(sessionId?: string) {
  const sessions = loadSessions();
  // Filter for sessions that have reached a terminal state in the cloud
  const completed = sessions.filter(s => s.status === 'completed' || s.status === 'launched' || s.status === 'plan_approved');
  
  if (completed.length === 0) {
    console.log(JSON.stringify({ error: "No completed sessions available for inspection" }));
    return;
  }

  // If no ID provided, return context to the UI to prompt the user
  if (!sessionId) {
    console.log(JSON.stringify({
      error: "Missing --session argument",
      available_sessions: completed.map(s => ({ id: s.id, agent: s.agent }))
    }));
    return;
  }

  // Allow partial ID matching for convenience
  const target = completed.find(s => s.id === sessionId || s.id.startsWith(sessionId));
  if (!target) {
     console.error(JSON.stringify({ error: `Session ${sessionId} not found or not in completed state` }));
     return;
  }

  const targetBranchRes = runGit(['branch', '--show-current']);
  const targetBranch = targetBranchRes.stdout || 'main';

  const apiKey = getApiKey();
  if (!apiKey) {
    console.error(JSON.stringify({ error: "JULES_API_KEY not found" }));
    return;
  }

  try {
    const ok = await checkSafetyGate({ 'X-Goog-Api-Key': apiKey });
    if (!ok) {
      console.error(JSON.stringify({ error: "Execution Blocked: Some active sessions are still in progress" }));
      return;
    }

    // Delegate to Stage 1 merge engine
    await inspectSession(target.id, targetBranch, { 'X-Goog-Api-Key': apiKey }, targetBranch);
    console.log(JSON.stringify({ status: "success", action: "inspect", session: target.id }));
  } catch (err: any) {
    console.error(JSON.stringify({ error: `Inspection failed: ${err.message}` }));
  }
}

/**
 * Approves and merges the isolated review branch for a previously inspected
 * Jules session into the current target branch. Checks the safety gate.
 *
 * @param {string} [sessionId] - The ID of the session to merge. If not provided, lists available sessions.
 * @returns {Promise<void>}
 */
async function handleApproveMerge(sessionId?: string) {
  const sessions = loadSessions();
  // Filter for sessions that have completed Stage 1 inspection
  const inspected = sessions.filter(s => s.status === 'inspected');

  if (inspected.length === 0) {
    console.log(JSON.stringify({ error: "No inspected sessions ready for final merge" }));
    return;
  }

  if (!sessionId) {
    console.log(JSON.stringify({
      error: "Missing --session argument",
      available_sessions: inspected.map(s => ({ id: s.id, agent: s.agent }))
    }));
    return;
  }

  const target = inspected.find(s => s.id === sessionId || s.id.startsWith(sessionId));
  if (!target) {
     console.error(JSON.stringify({ error: `Session ${sessionId} not found or not in inspected state` }));
     return;
  }

  const targetBranchRes = runGit(['branch', '--show-current']);
  const targetBranch = targetBranchRes.stdout || 'main';

  const apiKey = getApiKey();
  if (!apiKey) {
    console.error(JSON.stringify({ error: "JULES_API_KEY not found" }));
    return;
  }

  try {
    const ok = await checkSafetyGate({ 'X-Goog-Api-Key': apiKey });
    if (!ok) {
      console.error(JSON.stringify({ error: "Execution Blocked: Active sessions are in progress" }));
      return;
    }

    // Delegate to Stage 2 merge engine
    await approveMerge(target.id, targetBranch, targetBranch);
    console.log(JSON.stringify({ status: "success", action: "approve_merge", session: target.id }));
  } catch (err: any) {
    console.error(JSON.stringify({ error: `Merge failed: ${err.message}` }));
  }
}

/**
 * Updates the Jules API key stored in the local `.jules-companion/.env` file.
 *
 * @param {string} [newKey] - The new API key to save.
 * @returns {Promise<void>}
 */
async function handleUpdateApiKey(newKey?: string) {
    if (!newKey) {
        console.error(JSON.stringify({ error: "Missing --key argument" }));
        return;
    }
    const { julesDir } = getProjectDirs();
    const envPath = path.join(julesDir, '.env');
    try {
        if (!fs.existsSync(julesDir)) {
             fs.mkdirSync(julesDir, { recursive: true });
        }
        let envContent = '';
        if (fs.existsSync(envPath)) {
            envContent = fs.readFileSync(envPath, 'utf8');
        }

        // Parse and rewrite to overwrite existing key without losing other vars
        const lines = envContent.split('\n');
        const newLines = lines.filter(l => !l.startsWith('JULES_API_KEY='));
        newLines.push(`JULES_API_KEY=${newKey}`);

        fs.writeFileSync(envPath, newLines.join('\n'));
        console.log(JSON.stringify({ status: "success", action: "update_api_key", message: "API key updated successfully" }));
    } catch(err: any) {
        console.error(JSON.stringify({ error: `Failed to update API key: ${err.message}` }));
    }
}

/**
 * Main entry point for the Jules menu CLI interface.
 * Parses incoming command-line arguments to route execution to the
 * appropriate handler function. Designed for direct invocation by external IDE extensions.
 *
 * @returns {Promise<void>}
 */
export async function main() {
  const args = process.argv.slice(2);

  // If no arguments provided, output discovery metadata
  if (args.length === 0) {
    console.log(JSON.stringify({
      name: "Jules Companion AI Interface",
      commands: {
        "--deploy": "Deploy specialist session. Requires --agent <agent_name> and --task <task_desc>. Optional: --mode <code|review>",
        "--smart-launch": "Auto-interpret intent. Requires --goal <description>. Optional: --mode <code|review>",
        "--monitor": "Check active sessions status",
        "--auto-process": "Auto-process active sessions",
        "--inspect": "Inspect completed sessions. Requires --session <session_id>",
        "--merge": "Approve and finalize merge. Requires --session <session_id>",
        "--setup": "Run workspace setup",
        "--update-key": "Update API key. Requires --key <api_key>"
      }
    }, null, 2));
    return;
  }

  // Utility to extract flag values
  const getArg = (flag: string) => {
    const idx = args.indexOf(flag);
    return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : undefined;
  };

  const action = args[0];

  // Primary routing switch
  switch (action) {
    case '--deploy':
      await handleManualDeploy(getArg('--agent'), getArg('--task'), getArg('--mode') || 'code');
      break;
    case '--smart-launch':
      await handleSmartLaunch(getArg('--goal'), getArg('--mode') || 'code');
      break;
    case '--monitor':
      await showActiveSessions();
      break;
    case '--auto-process':
      await handleAutoProcess();
      break;
    case '--inspect':
      await handleInspect(getArg('--session'));
      break;
    case '--merge':
      await handleApproveMerge(getArg('--session'));
      break;
    case '--setup':
      await runSetup();
      console.log(JSON.stringify({ status: "success", action: "setup" }));
      break;
    case '--update-key':
      await handleUpdateApiKey(getArg('--key'));
      break;
    default:
      console.error(JSON.stringify({ error: `Unknown command: ${action}` }));
      break;
  }
}

if (require.main === module) {
  main().catch(err => {
    console.error(JSON.stringify({ error: `Unhandled exception: ${err.message}` }));
    process.exit(1);
  });
}
