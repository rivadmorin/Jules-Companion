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
    const sessionData = await request(`https://jules.googleapis.com/v1alpha/sessions/${sessionId}`, { headers });
    const state = sessionData.state || 'UNKNOWN';
    console.log(`Current state: ${state}`);

    // Handle state machine transitions automatically to unblock autonomous agents
    if (state === 'AWAITING_PLAN_APPROVAL') {
      // Auto-approve the plan immediately to let the agent continue its work
      console.log(`⚡ Session ${sessionId} is awaiting plan approval. Sending auto-approval request...`);
      await request(`https://jules.googleapis.com/v1alpha/sessions/${sessionId}:approvePlan`, {
        method: 'POST',
        headers
      }, {});
      console.log(`✅ Plan approved automatically for session ${sessionId}!`);
      sessionRecord.status = 'plan_approved';
      return true;

    } else if (state === 'AWAITING_USER_INPUT') {
      // Provide a generic or custom reply to keep the agent moving forward
      const message = customReply || 'Proceed with task execution and implementation.';
      console.log(`⚡ Session ${sessionId} is awaiting user input. Sending auto-reply: "${message}"...`);
      await request(`https://jules.googleapis.com/v1alpha/sessions/${sessionId}:sendMessage`, {
        method: 'POST',
        headers
      }, { prompt: message });
      console.log(`✅ Message sent successfully to session ${sessionId}!`);
      sessionRecord.status = 'replied';
      return true;

    } else if (state === 'COMPLETED') {
      console.log(`✓ Session ${sessionId} is COMPLETED. Ready for patch merge.`);
      sessionRecord.status = 'completed';
      return true;
    } else {
      console.log(`Session ${sessionId} is in state: ${state}. No immediate action required.`);
      return false;
    }
  } catch (err: any) {
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
  const params = parseArgs(process.argv.slice(2));
  const isAll = Boolean(params.all);
  const targetId = params.session ? String(params.session) : null;
  const customReply = params.reply ? String(params.reply) : undefined;

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

  const apiKey = getApiKey();
  if (!apiKey) {
    console.error('Error: JULES_API_KEY not found in environment or .env file.');
    process.exit(1);
  }

  const headers = { 'X-Goog-Api-Key': apiKey };
  const sessions = loadSessions();

  if (sessions.length === 0 && isAll) {
    console.log('No registered sessions found in .jules-companion/sessions.json');
    process.exit(0);
  }

  let targets: SessionRecord[] = [];
  if (isAll) {
    targets = sessions;
  } else if (targetId) {
    // Search for the requested session in our local tracking file.
    // If not found, we create a dummy 'mock' session record just to force an API call,
    // allowing users to process a session ID they created from another machine or environment.
    const found = sessions.find(s => s.id === targetId);
    if (found) {
      targets = [found];
    } else {
      targets = [{
        id: targetId,
        agent: 'unknown',
        mode: 'code',
        task: '',
        status: 'manual',
        timestamp: new Date().toISOString()
      }];
    }
  }

  const results = await Promise.all(targets.map(s => processSingleSession(s, headers, customReply)));
  const processedCount = results.filter(Boolean).length;

  saveSessions(sessions);
  console.log(`\nAuto-process completed: ${processedCount} session(s) updated.`);
}

if (require.main === module) {
  autoProcess();
}
