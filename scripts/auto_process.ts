/**
 * Jules API client utilities for executing authenticated network requests.
 * @module jules_client
 */
import { request, getApiKey } from './jules_client';

/**
 * Utility functions and type definitions for parsing CLI arguments and managing local session state.
 * @module utils
 */
import { parseArgs, loadSessions, saveSessions, SessionRecord } from './utils';

/**
 * Processes a single Jules session by checking its status against the cloud API and taking automatic
 * actions based on its current state (e.g., auto-approving execution plans, auto-replying to user prompts).
 * This function handles network failures gracefully to prevent disruption of batch processing.
 *
 * @param {SessionRecord} sessionRecord - The local record of the session to process, containing ID and metadata.
 * @param {Record<string, string>} headers - API headers including authentication credentials (API key).
 * @param {string} [customReply] - Optional custom message to send if the session is blocked awaiting user input.
 * @returns {Promise<boolean>} Resolves to `true` if a state-changing action was taken or the session is newly marked as complete, `false` if no action was needed or an error occurred.
 */
async function processSingleSession(
  sessionRecord: SessionRecord,
  headers: Record<string, string>,
  customReply?: string
): Promise<boolean> {
  // Extract the unique identifier for the target session from the provided record
  const sessionId = sessionRecord.id;
  // Log the initiation of the status check, including agent context and execution mode for debugging
  console.log(`\nChecking status for session ${sessionId} (${sessionRecord.agent} - ${sessionRecord.mode.toUpperCase()})...`);

  try {
    // Fetch the current session state directly from the Google Jules API using the authenticated request utility
    const sessionData = await request(`https://jules.googleapis.com/v1alpha/sessions/${sessionId}`, { headers });
    // Default to UNKNOWN if state is missing from the response payload to ensure safe downstream comparisons
    const state = sessionData.state || 'UNKNOWN';
    // Log the retrieved session state to provide visibility into the agent's current progress
    console.log(`Current state: ${state}`);

    // Evaluate the retrieved state to determine if autonomous intervention is required
    // Handle state machine transitions automatically to unblock stalled autonomous agents
    if (state === 'AWAITING_PLAN_APPROVAL') {
      // The cloud agent has proposed an execution plan and halted, awaiting human approval.
      // We automatically send the 'approvePlan' API request to unblock the agent immediately.
      console.log(`⚡ Session ${sessionId} is awaiting plan approval. Sending auto-approval request...`);
      // Execute the POST request to the custom :approvePlan method endpoint
      await request(`https://jules.googleapis.com/v1alpha/sessions/${sessionId}:approvePlan`, {
        method: 'POST',
        headers
      }, {}); // An empty object is passed as the body payload since no additional parameters are required
      // Confirm the successful dispatch of the approval request
      console.log(`✅ Plan approved automatically for session ${sessionId}!`);

      // Update local state so subsequent processes know this phase is complete and don't re-trigger
      sessionRecord.status = 'plan_approved';
      // Return true to indicate that a state-mutating action was successfully performed
      return true;

    } else if (state === 'AWAITING_USER_INPUT') {
      // The cloud agent has requested clarification or input before proceeding.
      // We send a generic authorization to continue (or custom user flag) to prevent it from stalling indefinitely.
      // Determine the payload message: fallback to the default directive if no custom reply was supplied via CLI
      const message = customReply || 'Proceed with task execution and implementation.';
      // Log the intended auto-reply message to console for user visibility
      console.log(`⚡ Session ${sessionId} is awaiting user input. Sending auto-reply: "${message}"...`);
      // Execute the POST request to the custom :sendMessage method endpoint with the prompt payload
      await request(`https://jules.googleapis.com/v1alpha/sessions/${sessionId}:sendMessage`, {
        method: 'POST',
        headers
      }, { prompt: message });
      // Confirm the successful dispatch of the message payload
      console.log(`✅ Message sent successfully to session ${sessionId}!`);

      // Mark state as replied so we track our interactions locally and prevent duplicate messaging
      sessionRecord.status = 'replied';
      // Return true to indicate that a state-mutating action was successfully performed
      return true;

    } else if (state === 'COMPLETED') {
      // The agent has successfully completed all tasks and is ready for the patch review and merge phase.
      // Inform the user that the session has reached its terminal success state
      console.log(`✓ Session ${sessionId} is COMPLETED. Ready for patch merge.`);
      // Update the local tracker to mirror the completed cloud state
      sessionRecord.status = 'completed';
      // Return true so the orchestrator knows this session's status was actively updated during this poll
      return true;
    } else {
      // Handle transitional states like IN_PROGRESS or terminal states like ERROR where no autonomous input action is possible currently
      // Inform the user that the engine is skipping this session for now
      console.log(`Session ${sessionId} is in state: ${state}. No immediate action required.`);
      // Return false to indicate no mutations or completions occurred for this session
      return false;
    }
  } catch (err: any) {
    // Graceful error logging to ensure one failing session network call doesn't crash the entire auto-process concurrent batch
    console.error(`❌ Failed to auto-process session ${sessionId}: ${err.message}`);
    // Return false so the orchestrator is aware this specific session check failed
    return false;
  }
}

/**
 * Main orchestrator for the Jules Session Auto-Approval & Auto-Reply Engine.
 *
 * This async CLI entry point initializes the execution context by parsing command-line arguments
 * to determine the operational scope: whether to bulk-process all locally tracked sessions or target
 * a specific session ID. It handles API credential validation, loads the local sessions tracking registry,
 * provisions mock records for un-tracked sessions, and delegates processing to `processSingleSession`
 * concurrently using `Promise.all` to minimize total network wait time blockages. Finally, it persists
 * any mutated session states back to the local tracking storage.
 *
 * @returns {Promise<void>} Resolves when all targeted sessions have been processed and state is saved.
 */
/**
 * Options for programmatic auto_process execution.
 */
export interface AutoProcessOptions {
  all?: boolean;
  sessionId?: string;
  reply?: string;
  targetDir?: string;
}

/**
 * Result returned by programmatic auto_process execution.
 */
export interface AutoProcessResult {
  success: boolean;
  output: string;
  updatedCount?: number;
  error?: string;
}

/**
 * Programmatically processes active sessions, auto-approving plans or sending replies.
 *
 * @param options - Execution configuration parameters.
 * @returns Result object indicating success and updated session count.
 */
export async function autoProcessCore(options: AutoProcessOptions): Promise<AutoProcessResult> {
  const isAll = Boolean(options.all);
  const targetId = options.sessionId ? String(options.sessionId).trim() : null;
  const customReply = options.reply ? String(options.reply) : undefined;
  const targetDir = options.targetDir || process.cwd();

  if (!isAll && !targetId) {
    return {
      success: false,
      output: '',
      error: 'Must specify all or sessionId option.'
    };
  }

  const apiKey = getApiKey(targetDir);
  if (!apiKey) {
    return {
      success: false,
      output: '',
      error: 'JULES_API_KEY not found in environment or .env file.'
    };
  }

  const headers = { 'X-Goog-Api-Key': apiKey };
  const sessions = loadSessions(targetDir);

  if (sessions.length === 0 && isAll) {
    return {
      success: true,
      output: 'No registered sessions found in .jules-companion/sessions.json',
      updatedCount: 0
    };
  }

  let targets: SessionRecord[] = [];
  if (isAll) {
    targets = sessions;
  } else if (targetId) {
    const found = sessions.find(s => s.id === targetId);
    if (found) {
      targets = [found];
    } else {
      const newRecord: SessionRecord = {
        id: targetId,
        agent: 'unknown',
        mode: 'code',
        task: '',
        status: 'manual',
        timestamp: new Date().toISOString()
      };
      sessions.push(newRecord);
      targets = [newRecord];
    }
  }

  const results = await Promise.all(targets.map(s => processSingleSession(s, headers, customReply)));
  const processedCount = results.filter(Boolean).length;
  saveSessions(sessions, targetDir);

  return {
    success: true,
    output: `Auto-process completed: ${processedCount} session(s) updated.`,
    updatedCount: processedCount
  };
}

/**
 * CLI command entrypoint for auto-processing registered Jules sessions.
 *
 * @returns A promise that resolves when processing is complete.
 */
export async function autoProcess(): Promise<void> {
  const params = parseArgs(process.argv.slice(2));
  const isAll = Boolean(params.all);
  const targetId = params.session ? String(params.session) : null;
  const customReply = params.reply ? String(params.reply) : undefined;
  const targetDir = params.target ? String(params.target) : process.cwd();

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

  const res = await autoProcessCore({
    all: isAll,
    sessionId: targetId || undefined,
    reply: customReply,
    targetDir
  });

  if (res.output) {
    console.log(res.output);
  }
  if (!res.success) {
    console.error(`Error: ${res.error}`);
    process.exit(1);
  }
}

// Bootstrap execution: invoke the async CLI entrypoint only if the module is being run directly as a script
if (require.main === module) {
  autoProcess();
}
