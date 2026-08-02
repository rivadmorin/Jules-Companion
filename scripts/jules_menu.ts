import * as fs from 'fs';
import * as path from 'path';
import { getProjectDirs, loadSessions, saveSessions, runGit } from './utils';
import { runSetup } from './setup';
import { deploySession } from './deploy_session';
import { autoProcess } from './auto_process';
import { inspectSession, approveMerge, checkSafetyGate } from './merge_session';
import { getApiKey, request } from './jules_client';

const SPECIALIST_AGENTS = [
  { id: 1, name: 'palette', desc: 'UI/UX & Tailwind CSS styling implementation.' },
  { id: 2, name: 'sentinel', desc: 'Security auditing, validation, crash prevention.' },
  { id: 3, name: 'bolt', desc: 'Speed optimizations, CPU profiling, efficient loops.' },
  { id: 4, name: 'nomad', desc: 'API endpoints routing, migration, integrations.' },
  { id: 5, name: 'packager', desc: 'NPM dependencies management and library upgrades.' },
  { id: 6, name: 'exterminator', desc: 'Debugging logic bugs and syntax issues.' },
  { id: 7, name: 'builder', desc: 'Automated build fixes and compiler issues resolution.' },
  { id: 8, name: 'conduit', desc: 'REST API clients, networking protocols, WebSockets.' },
  { id: 9, name: 'alchemist', desc: 'High-order functions, complex algorithms, data mapping.' },
  { id: 10, name: 'gatekeeper', desc: 'Authentication systems (OAuth, JWT, session cookies).' },
  { id: 11, name: 'bridge', desc: 'Third-party API integrations, timeouts, mock servers.' },
  { id: 12, name: 'dockerist', desc: 'Dockerfiles, Docker Compose, container orchestration.' },
  { id: 13, name: 'modernizer', desc: 'Refactoring legacy code, deprecation removals.' },
  { id: 14, name: 'inspector', desc: 'Unit testing, integration testing, and test coverage.' },
  { id: 15, name: 'janitor', desc: 'Code cleanup, dead code removal, linter fixes.' },
  { id: 16, name: 'logger', desc: 'Structured logging, tracing, APM configurations.' },
  { id: 17, name: 'benchmarker', desc: 'Load testing, concurrency benchmarks, performance metrics.' },
  { id: 18, name: 'watcher', desc: 'Data schema validation, input typings.' },
  { id: 19, name: 'chameleon', desc: 'Code translation/porting between languages.' },
  { id: 20, name: 'innovator', desc: 'New feature implementation within existing architecture.' },
  { id: 21, name: 'materialist', desc: 'Google Material Design 3 guidelines adherence.' },
  { id: 22, name: 'partisan', desc: 'Decentralization, P2P network integrations.' },
  { id: 23, name: 'netrunner', desc: 'Reverse proxy setups, server configs, SSL.' },
  { id: 24, name: 'adapter', desc: 'Cross-platform compatibility setups (Win/Mac/Lin).' },
  { id: 25, name: 'scribe', desc: 'README.md generation, API documentation. (Markdown Only)' },
  { id: 26, name: 'cartographer', desc: 'Architecture mapping, ASCII diagrams, flowcharts.' },
  { id: 27, name: 'grader', desc: 'Codebase quality assessment, technical debt reporting.' },
  { id: 28, name: 'consultant', desc: 'Architectural Decision Records (ADR) authoring.' },
  { id: 29, name: 'critic', desc: 'PR Review logs, code smells identification.' },
  { id: 30, name: 'proteus', desc: 'Flexible/Custom review agent (Markdown Only).' }
];

/**
 * Deploys a Jules session manually using a specified agent and task.
 * Modifies the process arguments and invokes the underlying deploySession function.
 *
 * @param {string} [agent] - The name of the agent to deploy (e.g., 'bolt').
 * @param {string} [task] - The task description for the agent.
 * @param {string} [mode='code'] - The execution mode ('code' or 'review').
 * @returns {Promise<void>}
 */
async function handleManualDeploy(agent?: string, task?: string, mode: string = 'code') {
  if (!agent || !task) {
    console.error(JSON.stringify({ error: "Missing --agent or --task arguments for manual deploy" }));
    return;
  }
  try {
    process.argv = [process.argv[0], process.argv[1], '--type', 'start', '--agents', agent, '--task', task, '--mode', mode];
    await deploySession();
    console.log(JSON.stringify({ status: "success", action: "manual_deploy", agent, mode }));
  } catch (err: any) {
    console.error(JSON.stringify({ error: `Deploy failed: ${err.message}` }));
  }
}

/**
 * Analyzes the user's goal to automatically select the most appropriate agent,
 * then deploys a Jules session with that agent.
 *
 * @param {string} [goal] - The objective or task description provided by the user.
 * @param {string} [mode='code'] - The execution mode ('code' or 'review').
 * @returns {Promise<void>}
 */
async function handleSmartLaunch(goal?: string, mode: string = 'code') {
  if (!goal) {
    console.error(JSON.stringify({ error: "Missing --goal argument for smart launch" }));
    return;
  }

  console.log(JSON.stringify({ info: "Analyzing intent..." }));
  const goalLower = goal.toLowerCase();

  let selectedAgent = 'innovator';
  if (goalLower.includes('ui') || goalLower.includes('css') || goalLower.includes('style')) selectedAgent = 'palette';
  else if (goalLower.includes('security') || goalLower.includes('audit')) selectedAgent = 'sentinel';
  else if (goalLower.includes('speed') || goalLower.includes('optimize') || goalLower.includes('memory')) selectedAgent = 'bolt';
  else if (goalLower.includes('bug') || goalLower.includes('fix') || goalLower.includes('error')) selectedAgent = 'exterminator';
  else if (goalLower.includes('test') || goalLower.includes('coverage')) selectedAgent = 'inspector';
  else if (goalLower.includes('clean') || goalLower.includes('refactor')) selectedAgent = 'janitor';
  else if (goalLower.includes('docker') || goalLower.includes('container')) selectedAgent = 'dockerist';
  else if (goalLower.includes('docs') || goalLower.includes('readme')) {
      selectedAgent = 'scribe';
      mode = 'review';
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
    process.argv = [process.argv[0], process.argv[1], '--type', 'start', '--agents', selectedAgent, '--task', goal, '--mode', mode];
    await deploySession();
    console.log(JSON.stringify({ status: "success", action: "smart_launch", agent: selectedAgent, mode }));
  } catch (err: any) {
    console.error(JSON.stringify({ error: `Smart launch failed: ${err.message}` }));
  }
}

/**
 * Retrieves and outputs the list of active Jules sessions from local storage.
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
  const completed = sessions.filter(s => s.status === 'completed' || s.status === 'launched' || s.status === 'plan_approved');
  
  if (completed.length === 0) {
    console.log(JSON.stringify({ error: "No completed sessions available for inspection" }));
    return;
  }

  if (!sessionId) {
    console.log(JSON.stringify({
      error: "Missing --session argument",
      available_sessions: completed.map(s => ({ id: s.id, agent: s.agent }))
    }));
    return;
  }

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
 * appropriate handler function.
 *
 * @returns {Promise<void>}
 */
export async function main() {
  const args = process.argv.slice(2);

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

  const getArg = (flag: string) => {
    const idx = args.indexOf(flag);
    return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : undefined;
  };

  const action = args[0];

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
