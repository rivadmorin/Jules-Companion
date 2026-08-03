import { request, getApiKey } from './jules_client';
import { parseArgs, loadSessions, saveSessions, SessionRecord } from './utils';

/**
 * Processes a single Jules session by checking its status and taking automatic actions
 * based on its current state (e.g., auto-approving plans, auto-replying to prompts).
 *
 * @param {SessionRecord} sessionRecord - The record of the session to process.
 * @param {Record<string, string>} headers - API headers including authentication.
 * @param {string} [customReply] - Optional custom message to send if awaiting user input.
 * @returns {Promise<boolean>} True if an action was taken or the session is complete, false otherwise.
 */
async function processSingleSession(
  sessionRecord: SessionRecord,
  headers: Record<string, string>,
  customReply?: string
): Promise<boolean> {
  const sessionId = sessionRecord.id;
  console.log(`\nChecking status for session ${sessionId} (${sessionRecord.agent} - ${sessionRecord.mode.toUpperCase()})...`);

  try {
    // Fetch the current session state directly from the Google Jules API
    const sessionData = await request(`https://jules.googleapis.com/v1alpha/sessions/${sessionId}`, { headers });
    // Default to UNKNOWN if state is missing from response payload
    const state = sessionData.state || 'UNKNOWN';
    console.log(`Current state: ${state}`);

    // Handle state machine transitions automatically to unblock autonomous agents
    if (state === 'AWAITING_PLAN_APPROVAL') {
      // The cloud agent has proposed an execution plan and halted, awaiting human approval.
      // We automatically send the 'approvePlan' API request to unblock the agent immediately.
      console.log(`⚡ Session ${sessionId} is awaiting plan approval. Sending auto-approval request...`);
      await request(`https://jules.googleapis.com/v1alpha/sessions/${sessionId}:approvePlan`, {
        method: 'POST',
        headers
      }, {});
      console.log(`✅ Plan approved automatically for session ${sessionId}!`);

      // Update local state so subsequent processes know this phase is complete
      sessionRecord.status = 'plan_approved';
      return true;

    } else if (state === 'AWAITING_USER_INPUT') {
      // The cloud agent has requested clarification or input before proceeding.
      // We send a generic authorization to continue (or custom user flag) to prevent it from stalling.
      const message = customReply || 'Proceed with task execution and implementation.';
      console.log(`⚡ Session ${sessionId} is awaiting user input. Sending auto-reply: "${message}"...`);
      await request(`https://jules.googleapis.com/v1alpha/sessions/${sessionId}:sendMessage`, {
        method: 'POST',
        headers
      }, { prompt: message });
      console.log(`✅ Message sent successfully to session ${sessionId}!`);

      // Mark state as replied so we track our interactions locally
      sessionRecord.status = 'replied';
      return true;

    } else if (state === 'COMPLETED') {
      // The agent has successfully completed all tasks and is ready for the patch review and merge phase.
      console.log(`✓ Session ${sessionId} is COMPLETED. Ready for patch merge.`);
      sessionRecord.status = 'completed';
      return true;
    } else {
      // Handle states like IN_PROGRESS or ERROR where no autonomous input action is possible currently
      console.log(`Session ${sessionId} is in state: ${state}. No immediate action required.`);
      return false;
    }
  } catch (err: any) {
    // Graceful error logging to ensure one failing session doesn't crash the entire auto-process batch
    console.error(`❌ Failed to auto-process session ${sessionId}: ${err.message}`);
    return false;
  }
}

/**
 * Main orchestrator for the Auto-Process Engine.
 *
 * This CLI entry point parses user arguments to determine the scope of operations
 * (processing all active sessions or just a specific session by ID). It handles API key
 * validation, reads the local sessions registry, and executes single-session processing
 * concurrently to clear any blocking states in the cloud.
 *
 * @returns {Promise<void>}
 */
export async function autoProcess() {
  // Extract CLI argument dictionaries
  const params = parseArgs(process.argv.slice(2));
  const isAll = Boolean(params.all);
  const targetId = params.session ? String(params.session) : null;
  const customReply = params.reply ? String(params.reply) : undefined;

  // Enforce usage constraints: must provide either --all or --session
  if (!isAll && !targetId) {
    console.log(`
Jules Session Auto-Approval & Auto-Reply Engine (TypeScript)

Usage:
  node dist/auto_process.js --all
  node dist/auto_process.js --session <sessionId> [--reply "<message>"]

Options:
  --all        Poll and auto-process all registered sessions in .jules-companion/sessions.json
  --session    Poll and auto-process a single specific session ID
  --reply      Optional custom reply message when session is awaiting user input
`);
    process.exit(1);
  }

  // Ensure necessary credentials are setup in the environment before triggering requests
  const apiKey = getApiKey();
  if (!apiKey) {
    console.error('Error: JULES_API_KEY not found in environment or .env file.');
    process.exit(1);
  }

  const headers = { 'X-Goog-Api-Key': apiKey };
  // Load local sessions cache to determine which sessions are active
  const sessions = loadSessions();

  // Fast fail if --all was requested but there's nothing to process
  if (sessions.length === 0 && isAll) {
    console.log('No registered sessions found in .jules-companion/sessions.json');
    process.exit(0);
  }

  let targets: SessionRecord[] = [];
  if (isAll) {
    targets = sessions; // Process everything found
  } else if (targetId) {
    // Search for the requested session in our local tracking file.
    // If not found, we create a dummy 'mock' session record just to force an API call,
    // allowing users to process a session ID they created from another machine or environment.
    const found = sessions.find(s => s.id === targetId);
    if (found) {
      targets = [found];
    } else {
      const newRecord: SessionRecord = {
        id: targetId,
        agent: 'unknown',
        mode: 'code', // Fallback defaults
        task: '',
        status: 'manual',
        timestamp: new Date().toISOString()
      };
      sessions.push(newRecord);
      targets = [newRecord];
    }
  }

  // Concurrently process all targeted sessions to minimize network wait time blockages
  const results = await Promise.all(targets.map(s => processSingleSession(s, headers, customReply)));
  // Filter boolean successes to log how many sessions actually received updates or input
  const processedCount = results.filter(Boolean).length;

  // Ensure our local status markers (e.g., 'plan_approved', 'completed') are persisted back to storage
  saveSessions(sessions);
  console.log(`\nAuto-process completed: ${processedCount} session(s) updated.`);
}

if (require.main === module) {
  autoProcess();
}
