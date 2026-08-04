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
export async function autoProcess() {
  // Extract key-value dictionaries from raw command line arguments (excluding node runtime and script paths)
  const params = parseArgs(process.argv.slice(2));
  // Cast the 'all' parameter to a strict boolean flag for global processing scope
  const isAll = Boolean(params.all);
  // Extract the specific target session ID if provided, otherwise default to null
  const targetId = params.session ? String(params.session) : null;
  // Extract an optional custom reply string to be used for state unblocking, if provided
  const customReply = params.reply ? String(params.reply) : undefined;

  // Enforce required usage constraints: execution must define a target scope (either --all or --session)
  if (!isAll && !targetId) {
    // Print the application header and help documentation to guide the user on proper syntax
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
    // Exit with a non-zero status code to indicate the process was aborted due to invalid arguments
    process.exit(1);
  }

  // Ensure necessary credentials (API Key) are setup in the environment before triggering requests
  const apiKey = getApiKey();
  // Validate presence of API key to avoid dispatching unauthorized API calls that will fail
  if (!apiKey) {
    // Log a fatal error indicating the absence of required authentication
    console.error('Error: JULES_API_KEY not found in environment or .env file.');
    // Abort execution and exit with an error code
    process.exit(1);
  }

  // Pre-construct the shared HTTP headers payload, securely injecting the retrieved API key
  const headers = { 'X-Goog-Api-Key': apiKey };
  // Load the local sessions cache database to determine which sessions are actively tracked
  const sessions = loadSessions();

  // Fast-fail exit branch: if the global '--all' flag was requested but the local session registry is empty
  if (sessions.length === 0 && isAll) {
    // Inform the user gracefully that the operation was essentially a no-op
    console.log('No registered sessions found in .jules-companion/sessions.json');
    // Exit cleanly with success code since this is a valid operational state
    process.exit(0);
  }

  // Initialize an empty array to collect all SessionRecord objects designated for API processing
  let targets: SessionRecord[] = [];
  
  // Resolve the targets based on the determined operational scope flags
  if (isAll) {
    // Under bulk scope, alias the loaded sessions collection directly into the targets list
    targets = sessions;
  } else if (targetId) {
    // Under targeted scope, perform a linear search against the local tracking file
    const found = sessions.find(s => s.id === targetId);
    
    // Evaluate if the requested target ID is already tracked locally
    if (found) {
      // If a match is found, append the existing record to our processing list
      targets = [found];
    } else {
      // If not found locally, we dynamically create a dummy 'mock' session record.
      // This forces an API call, allowing users to process a session ID they created remotely on another machine.
      const newRecord: SessionRecord = {
        id: targetId,
        agent: 'unknown', // Default fallback value since origin metadata is unavailable
        mode: 'code', // Fallback default execution mode
        task: '', // Initialize with an empty task description 
        status: 'manual', // Set initial status reflecting manual external injection
        timestamp: new Date().toISOString() // Generate a fresh ISO 8601 timestamp for the mock record
      };
      // Append the mock record to the persistent sessions list so it is tracked moving forward
      sessions.push(newRecord);
      // Ensure the mock record is immediately staged for API processing
      targets = [newRecord];
    }
  }

  // Concurrently process all targeted sessions using Promise.all to map the asynchronous check function
  // This approach minimizes O(N) network latency blockages that occur in sequential polling loops
  const results = await Promise.all(targets.map(s => processSingleSession(s, headers, customReply)));
  
  // Evaluate the parallel execution results: filter the returned booleans to log the exact number of sessions modified
  const processedCount = results.filter(Boolean).length;

  // Ensure our mutated local status markers (e.g., 'plan_approved', 'replied') are persisted synchronously back to file storage
  saveSessions(sessions);
  // Log a final summary report of the orchestration run
  console.log(`\nAuto-process completed: ${processedCount} session(s) updated.`);
}

// Bootstrap execution: invoke the async CLI entrypoint only if the module is being run directly as a script
if (require.main === module) {
  autoProcess();
}
