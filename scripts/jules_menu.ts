/**
 * @fileoverview Jules Menu CLI Interface
 *
 * This file serves as the primary CLI routing interface for the Jules Companion AI.
 * It parses incoming command-line arguments to trigger various session management
 * actions (e.g., deploy, inspect, merge, monitor) and strictly formats all output
 * as JSON to act as an API layer for external IDE extensions and clients.
 */

import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';
import { runSetup } from './setup';
import { getProjectDirs, runGit, loadSessions } from './utils';
import { deploySession } from './deploy_session';
import { inspectSession, approveMerge, checkSafetyGate } from './merge_session';
import { autoProcess } from './auto_process';
import { getApiKey } from './jules_client';

/**
 * A predefined registry of specialist AI agents available for deployment.
 * Each entry maps an agent's internal identifier to a descriptive summary
 * of its designated capability area, utilized for both UI presentation
 * and heuristic intent routing during a "Smart Launch".
 *
 * @constant {Array<{name: string, desc: string}>}
 */
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
  // Validate presence of required arguments to prevent malformed deployments
  if (!agent || !task) {
    // Output error in strict JSON format for external IDE client consumption
    console.error(JSON.stringify({ error: "Missing --agent or --task arguments" }));
    return; // Abort execution early
  }

  // Overwrite process.argv to inject command-line arguments programmatically.
  // This satisfies the internal deploySession CLI parser dependency without needing a separate shell spawn.
  process.argv = [process.argv[0], process.argv[1], '--type', 'start', '--agents', agent, '--task', task, '--mode', mode];

  try {
    // Await the completion of the core deployment orchestrator
    await deploySession();
    // Communicate successful deployment back to the calling client via JSON
    console.log(JSON.stringify({ status: "success", action: "deploy", agent, mode }));
  } catch (err: any) {
    // Catch and format any deployment errors as JSON to avoid breaking the expected API contract
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
  // Verify the natural language goal was provided
  if (!goal) {
    console.error(JSON.stringify({ error: "Missing --goal argument for smart launch" }));
    return; // Stop execution if no goal is provided
  }

  // Provide initial status update to the client that analysis has begun
  console.log(JSON.stringify({ info: "Analyzing intent..." }));
  // Normalize the input string to lowercase for case-insensitive matching
  const goalLower = goal.toLowerCase();

  // Basic heuristic keyword matching routing logic
  // Begin by establishing 'innovator' as the default general-purpose fallback agent
  let selectedAgent = 'innovator';

  // Conditionally override the selected agent based on the presence of specific keywords
  if (goalLower.includes('ui') || goalLower.includes('css') || goalLower.includes('style')) selectedAgent = 'palette';
  else if (goalLower.includes('security') || goalLower.includes('audit')) selectedAgent = 'sentinel';
  else if (goalLower.includes('speed') || goalLower.includes('optimize') || goalLower.includes('memory')) selectedAgent = 'bolt';
  else if (goalLower.includes('bug') || goalLower.includes('fix') || goalLower.includes('error')) selectedAgent = 'exterminator';
  else if (goalLower.includes('test') || goalLower.includes('coverage')) selectedAgent = 'inspector';
  else if (goalLower.includes('clean') || goalLower.includes('refactor')) selectedAgent = 'janitor';
  else if (goalLower.includes('docker') || goalLower.includes('container')) selectedAgent = 'dockerist';
  else if (goalLower.includes('docs') || goalLower.includes('readme')) {
      selectedAgent = 'scribe';
      // Force 'review' mode for scribe to prevent its code-generation tools from accidentally corrupting logic
      mode = 'review';
  } else if (goalLower.includes('review')) {
      selectedAgent = 'critic';
      // Force 'review' mode to restrict critic to providing feedback rather than implementing features
      mode = 'review';
  }

  // Retrieve the descriptive metadata for the dynamically selected agent
  const agentData = SPECIALIST_AGENTS.find(a => a.name === selectedAgent);

  // Output the analysis results and intent mapping back to the client
  console.log(JSON.stringify({
    action: "smart_launch_analysis",
    selectedAgent: selectedAgent,
    description: agentData?.desc,
    mode: mode
  }));

  try {
    // Overwrite process.argv to dispatch to standard deployment logic using the dynamically selected parameters
    process.argv = [process.argv[0], process.argv[1], '--type', 'start', '--agents', selectedAgent, '--task', goal, '--mode', mode];

    // Execute the deployment using the derived parameters
    await deploySession();

    // Report a successful smart launch back to the client via JSON
    console.log(JSON.stringify({ status: "success", action: "smart_launch", agent: selectedAgent, mode }));
  } catch (err: any) {
    // Catch and report any execution errors in the expected JSON format
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
  // Read and deserialize the local session cache from disk
  const sessions = loadSessions();

  // Handle the empty state gracefully by providing a clear message to the client
  if (sessions.length === 0) {
    console.log(JSON.stringify({ status: "success", data: [], message: "No active sessions found" }));
    return; // Halt execution after reporting empty state
  }

  // Output the loaded sessions array wrapped in a successful JSON response envelope
  console.log(JSON.stringify({ status: "success", data: sessions }));
}

/**
 * Triggers the auto-process engine to poll and automatically advance all
 * active Jules sessions (e.g., auto-approving plans, auto-replying).
 *
 * @returns {Promise<void>}
 */
async function handleAutoProcess() {
  // Inject the '--all' flag into process.argv to instruct the core autoProcess
  // engine to iterate over all currently active sessions.
  process.argv = [process.argv[0], process.argv[1], '--all'];

  try {
    // Await the completion of the background auto-processing loop
    await autoProcess();
    // Notify the client that auto-processing completed without fatal errors
    console.log(JSON.stringify({ status: "success", action: "auto_process" }));
  } catch (err: any) {
    // Format any unhandled exceptions during the auto-process loop as JSON errors
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
  // Load the complete local session cache
  const sessions = loadSessions();
  // Filter for sessions that have reached a terminal state in the cloud
  // and are ready to have their patches inspected locally
  const completed = sessions.filter(s => s.status === 'completed' || s.status === 'launched' || s.status === 'plan_approved');
  
  // Abort if there are no sessions eligible for inspection
  if (completed.length === 0) {
    console.log(JSON.stringify({ error: "No completed sessions available for inspection" }));
    return;
  }

  // If no ID provided, return context to the UI to prompt the user
  // Provides a list of available session IDs and their associated agents for the UI dropdown
  if (!sessionId) {
    console.log(JSON.stringify({
      error: "Missing --session argument",
      available_sessions: completed.map(s => ({ id: s.id, agent: s.agent }))
    }));
    return;
  }

  // Allow partial ID matching for convenience (e.g., using the first few characters of the UUID)
  const target = completed.find(s => s.id === sessionId || s.id.startsWith(sessionId));
  if (!target) {
     // Report error if the specified ID is invalid or points to a non-completed session
     console.error(JSON.stringify({ error: `Session ${sessionId} not found or not in completed state` }));
     return;
  }

  // Determine the current local Git branch to use as the base for the review branch
  const targetBranchRes = runGit(['branch', '--show-current']);
  const targetBranch = targetBranchRes.stdout || 'main'; // Fallback to 'main' if parsing fails

  // Retrieve the required API key for remote authentication
  const apiKey = getApiKey();
  if (!apiKey) {
    console.error(JSON.stringify({ error: "JULES_API_KEY not found" }));
    return;
  }

  try {
    // Check the safety gate to ensure no other sessions are actively modifying the codebase
    const ok = await checkSafetyGate({ 'X-Goog-Api-Key': apiKey });
    if (!ok) {
      console.error(JSON.stringify({ error: "Execution Blocked: Some active sessions are still in progress" }));
      return;
    }

    // Delegate to Stage 1 merge engine to apply the patch to a new isolated review branch
    await inspectSession(target.id, targetBranch, { 'X-Goog-Api-Key': apiKey }, targetBranch);
    // Report successful inspection preparation back to the client
    console.log(JSON.stringify({ status: "success", action: "inspect", session: target.id }));
  } catch (err: any) {
    // Format any inspection engine errors as standard JSON responses
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
  // Load the complete local session cache
  const sessions = loadSessions();
  // Filter for sessions that have completed Stage 1 inspection
  // and are awaiting final merge approval
  const inspected = sessions.filter(s => s.status === 'inspected');

  // Abort if no sessions are currently in the 'inspected' state
  if (inspected.length === 0) {
    console.log(JSON.stringify({ error: "No inspected sessions ready for final merge" }));
    return;
  }

  // If no specific session is requested, output the list of eligible sessions to the UI
  if (!sessionId) {
    console.log(JSON.stringify({
      error: "Missing --session argument",
      available_sessions: inspected.map(s => ({ id: s.id, agent: s.agent }))
    }));
    return;
  }

  // Allow partial matching of the session UUID for ease of CLI use
  const target = inspected.find(s => s.id === sessionId || s.id.startsWith(sessionId));
  if (!target) {
     console.error(JSON.stringify({ error: `Session ${sessionId} not found or not in inspected state` }));
     return;
  }

  // Identify the target branch to merge the approved changes into
  const targetBranchRes = runGit(['branch', '--show-current']);
  const targetBranch = targetBranchRes.stdout || 'main'; // Fallback to 'main'

  // Retrieve the required API key
  const apiKey = getApiKey();
  if (!apiKey) {
    console.error(JSON.stringify({ error: "JULES_API_KEY not found" }));
    return;
  }

  try {
    // Check the safety gate to ensure no conflicting operations are in progress
    const ok = await checkSafetyGate({ 'X-Goog-Api-Key': apiKey });
    if (!ok) {
      console.error(JSON.stringify({ error: "Execution Blocked: Active sessions are in progress" }));
      return;
    }

    // Delegate to Stage 2 merge engine to perform the final Git merge operation
    await approveMerge(target.id, targetBranch, targetBranch);
    // Report successful merge completion to the client
    console.log(JSON.stringify({ status: "success", action: "approve_merge", session: target.id }));
  } catch (err: any) {
    // Format any merge conflicts or errors as JSON
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
    // Validate the presence of the required new API key
    if (!newKey) {
        console.error(JSON.stringify({ error: "Missing --key argument" }));
        return;
    }

    // Resolve the absolute path to the local .jules companion directory
    const { julesDir } = getProjectDirs();
    const envPath = path.join(julesDir, '.env');

    try {
        // Ensure the config directory exists before attempting to write to it
        if (!fs.existsSync(julesDir)) {
             fs.mkdirSync(julesDir, { recursive: true });
        }

        // Read existing .env contents if the file already exists
        let envContent = '';
        if (fs.existsSync(envPath)) {
            envContent = fs.readFileSync(envPath, 'utf8');
        }

        // Parse and rewrite to overwrite existing key without losing other vars
        // Split file content into individual lines for processing
        const lines = envContent.split('\n');
        // Filter out any existing definition of the JULES_API_KEY
        const newLines = lines.filter(l => !l.startsWith('JULES_API_KEY='));
        // Append the newly provided API key configuration
        newLines.push(`JULES_API_KEY=${newKey}`);

        // Commit the modified environment variables back to disk
        fs.writeFileSync(envPath, newLines.join('\n'));
        // Confirm successful update to the calling client via JSON
        console.log(JSON.stringify({ status: "success", action: "update_api_key", message: "API key updated successfully" }));
    } catch(err: any) {
        // Report file system or permission errors in JSON format
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
  // Strip node executable and script path to isolate arguments
  const args = process.argv.slice(2);

  // If no arguments provided, output discovery metadata
  // This acts as a manifest for external clients to discover supported commands
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
  // Safely retrieves the value immediately following a specified flag argument
  const getArg = (flag: string) => {
    const idx = args.indexOf(flag);
    return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : undefined;
  };

  // The primary command flag is expected as the first argument
  const action = args[0];

  // Primary routing switch
  // Maps the provided action flag to the corresponding internal handler function
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
      // Inform the client that the workspace setup routines completed successfully
      console.log(JSON.stringify({ status: "success", action: "setup" }));
      break;
    case '--update-key':
      await handleUpdateApiKey(getArg('--key'));
      break;
    default:
      // Fallback handler for unrecognized commands to maintain API contract
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
