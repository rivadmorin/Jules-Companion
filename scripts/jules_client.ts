import * as https from 'https';
import * as path from 'path';
import * as fs from 'fs';
import { loadSessions } from './utils';

// Network requests to the Google Jules API are optimized using a shared https.Agent
// to prevent TLS handshake overhead on batch CLI operations.
const sharedAgent = new https.Agent({ keepAlive: true });

/**
 * Represents a stored session configuration and state within the companion.
 * Tracks essential metadata required to restore or continue previous interactions
 * with a specific agent without requiring re-initialization.
 */
export interface SessionRecord {
  /** The unique identifier assigned to this specific session. */
  id: string;
  /** The identifier for the agent operating within this session. */
  agent: string;
  /** The operational mode of the session, dictating how the agent interacts. */
  mode?: 'code' | 'review';
  /** The high-level description or prompt of the task this session is addressing. */
  task?: string;
  /** The current execution status or state of the session. */
  status?: string;
  /** The timestamp when this session was created or last updated. */
  timestamp?: string;
}

/**
 * Retrieves the Google Jules API key from either the system environment variables
 * or local .env fallback files in standard locations.
 * Uses a caching mechanism so filesystem isn't hit repeatedly during the same process execution.
 *
 * @param {string} [targetDir] - Optional directory to check first for `.env` files.
 * @returns {string | null} The raw API key string if found, otherwise null.
 */
let cachedApiKey: string | null = null;
export function getApiKey(targetDir?: string): string | null {
  // Return null immediately if the environment variable is explicitly set to an empty string.
  if (process.env.JULES_API_KEY === '') return null;
  // Return the cached API key if it has already been loaded and validated in this execution.
  if (cachedApiKey) return cachedApiKey;

  // 1. Check system-level environment variable first
  // Verify the environment variable exists and isn't the default placeholder string.
  if (process.env.JULES_API_KEY && !process.env.JULES_API_KEY.includes('your_jules_api_key_here')) {
    // Cache the valid API key for subsequent calls.
    cachedApiKey = process.env.JULES_API_KEY;
    // Return the successfully retrieved key from the environment.
    return cachedApiKey;
  }

  // 2. Define fallback paths where a `.env` file might be stored locally
  // Initialize an array to hold all potential paths to `.env` files.
  const envPaths: string[] = [];
  // If a target directory was provided, prioritize paths within it.
  if (targetDir) {
    // Add the `.jules-companion` specific `.env` file in the target directory.
    envPaths.push(
      path.join(targetDir, '.jules-companion', '.env'),
      // Add the general `.env` file in the target directory.
      path.join(targetDir, '.env')
    );
  }
  // Append standard fallback locations to search for the `.env` file.
  envPaths.push(
    // Check the current working directory's companion folder.
    path.join(process.cwd(), '.jules-companion', '.env'),
    // Check the current working directory.
    path.join(process.cwd(), '.env'),
    // Check the parent directory of this script's companion folder.
    path.join(__dirname, '..', '.jules-companion', '.env'),
    // Check the parent directory of this script.
    path.join(__dirname, '..', '.env')
  );

  // 3. Sequentially search paths and parse the .env structure if found
  // Iterate through all constructed paths to find a valid configuration.
  for (const p of envPaths) {
    // Check if a file actually exists at the current path in the array.
    if (fs.existsSync(p)) {
      try {
        // Read the file contents as a UTF-8 string.
        const content = fs.readFileSync(p, 'utf8');
        // Match standard KEY=VALUE formats, ignoring whitespace
        // Extract the value part of the JULES_API_KEY declaration.
        const match = content.match(/JULES_API_KEY\s*=\s*(.+)/);
        // Proceed if the key was found and a value was captured.
        if (match && match[1]) {
           // Clean out any trailing carriage returns from windows files or end quotes
           // Sanitize the extracted value by stripping surrounding whitespace and quotation marks.
          const parsedKey = match[1].trim().replace(/^['"]|['"]$/g, '');
          // Validate that the extracted string isn't empty or the default placeholder.
          if (parsedKey && !parsedKey.includes('your_jules_api_key_here')) {
            // Cache the validated key found in the file.
            cachedApiKey = parsedKey;
            // Return the key and exit the search loop early.
            return cachedApiKey;
          }
        }
      } catch (e) {
        // Skip unreadable .env file and try the next path
        // Continue to the next path if there are permission issues or read errors.
      }
    }
  }

  // Fallback assignment: check the environment variable again just in case, otherwise set to null.
  cachedApiKey = (process.env.JULES_API_KEY && !process.env.JULES_API_KEY.includes('your_jules_api_key_here')) ? process.env.JULES_API_KEY : null;
  // Return whatever was determined as the final cached result (which may be null).
  return cachedApiKey;
}

/**
 * Retrieves a list of active sessions from local storage.
 *
 * @param {string} [targetDir=process.cwd()] - Optional target directory to read sessions from.
 * @returns {SessionRecord[]} An array of session records, or an empty array if none found.
 */
export function getSessions(targetDir: string = process.cwd()): SessionRecord[] {
  // Delegate the actual file system loading and parsing logic to the imported utility function.
  return loadSessions(targetDir);
}

/**
 * Makes an HTTPS request to the Google Jules API.
 * This is a lightweight internal HTTP client built directly on node:https to avoid
 * heavyweight external dependencies like Axios or Node Fetch polyfills.
 *
 * @template T - The expected return type of the parsed JSON response.
 * @param {string} url - The full URL for the request.
 * @param {Object} [options={}] - Request options configuring method and headers.
 * @param {string} [options.method='GET'] - HTTP method for the request.
 * @param {Record<string, string>} [options.headers] - Custom HTTP headers to merge with defaults.
 * @param {any} [body=null] - The request body payload. If it's an object, it will be JSON stringified.
 * @returns {Promise<T>} A promise that resolves to the parsed response data.
 */
export function request<T = any>(
  url: string,
  options: { method?: string; headers?: Record<string, string> } = {},
  body: any = null
): Promise<T> {
  // Return a promise to wrap the event-based node:https asynchronous request lifecycle.
  return new Promise((resolve, reject) => {
    // Parse the input URL string into an object to extract connection properties.
    const parsedUrl = new URL(url);
    // Construct the options payload required by the internal https.request module.
    const reqOptions: https.RequestOptions = {
      // Set the domain name to connect to.
      hostname: parsedUrl.hostname,
      // Default to standard HTTPS port 443 if not specified in the URL.
      port: parsedUrl.port || 443,
      // Construct the full path including the base path and any query parameters.
      path: parsedUrl.pathname + parsedUrl.search,
      // Use the provided HTTP method or default to a standard 'GET'.
      method: options.method || 'GET',
      // Construct the HTTP headers payload.
      headers: {
        // Enforce JSON payloads to communicate properly with standard REST APIs.
        'Content-Type': 'application/json',
        // Set a custom user agent to help identify API traffic origins.
        'User-Agent': 'Jules-Companion-TS/1.0', // Custom User-Agent for Google API telemetry
        // Merge in any custom headers provided by the caller (like Authorization).
        ...options.headers
      },
      // Assign the shared agent defined at the top of the file to reuse connections.
      agent: sharedAgent // Reuse KeepAlive agent to optimize rapid subsequent API requests
    };

    // Initiate the HTTPS request object with the configured options.
    const req = https.request(reqOptions, (res) => {
      // Initialize an empty string buffer to hold the incoming data chunks.
      let data = '';
      // Accumulate stream chunks into a single raw response string
      // Append each incoming data chunk to the buffer string.
      res.on('data', (chunk) => { data += chunk; });

      // Handle the completion of the incoming response stream.
      res.on('end', () => {
        // Successful response range (HTTP 200 - 299)
        // Check if the HTTP status code indicates a successful request.
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          try {
            // Attempt to parse JSON response payload.
            // If the parse is successful, resolve the promise with the constructed object.
            resolve(JSON.parse(data));
          } catch (e) {
            // If it fails (e.g. empty response strings or raw text), fallback to returning the raw string.
            // Cast the raw string to the expected type parameter to fulfill the Promise contract.
            resolve(data as unknown as T);
          }
        } else {
          // Construct base error message covering the standard HTTP status line
          // Build a default error string based on the standard Node.js HTTP response objects.
          let errMsg = `HTTP ${res.statusCode}: ${res.statusMessage}`;
          try {
            // Attempt to parse structured Google API error payload
            // Parse the response body hoping it matches standard Google JSON error structures.
            const errObj = JSON.parse(data);
            // If a nested error message exists, update the error message to be more descriptive.
            if (errObj.error && errObj.error.message) {
              // Construct a detailed error string extracting status strings and nested messages.
              errMsg = `HTTP ${res.statusCode} (${errObj.error.status || 'ERROR'}): ${errObj.error.message}`;
            }
          } catch (_) {
            // If the error response is not valid JSON (e.g., standard proxy HTML error page), append truncated raw body
            // Fallback: append a slice of the raw text so the developer can inspect the HTML error payload.
            if (data) errMsg += ` - ${data.slice(0, 200)}`;
          }
          // Reject the promise with a new Error object containing the best-effort compiled message.
          reject(new Error(errMsg));
        }
      });
    });

    // Handle fundamental networking/DNS resolution errors
    // Listen for connection-level errors (like DNS lookup failures or connection timeouts).
    req.on('error', (e) => {
      // Reject the promise if the request could not be established at all.
      reject(new Error(`Network error connecting to Google Jules API: ${e.message}`));
    });

    // If body exists, stringify it and flush down the network stream
    // Check if a request payload was provided to be sent to the server.
    if (body) {
      // Write the payload to the network socket, stringifying it if it is an object.
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }

    // Explicitly conclude request pipeline
    // Signal the end of the request stream, sending any pending data.
    req.end();
  });
}

/**
 * Main CLI entry point for testing and executing Jules API operations directly.
 *
 * Handled commands: list, sources, status, reply, and pull.
 * This acts as a low-level bridge utility directly interfacing with the API, bypassing
 * the higher-level orchestrations in deploy/merge when raw operations are needed.
 * 
 * Note: Input arguments (process.argv) may be dynamically marshaled and mutated by 
 * upstream callers (e.g., jules_menu.ts, mcp_server.ts) prior to execution.
 */
async function main() {
  // Attempt to load the required Google Jules API key.
  const apiKey = getApiKey();
  // Halt execution if the API key cannot be resolved from the environment or local files.
  if (!apiKey) {
    console.error('Error: JULES_API_KEY not found in environment or .env file.');
    console.error('Please create a .env file with JULES_API_KEY=<your-key>');
    // Exit with a non-zero status code to indicate failure.
    process.exit(1);
  }

  // Construct standard authentication headers required for Google Cloud endpoints.
  const headers = { 'X-Goog-Api-Key': apiKey };
  // Strip out JSON flags from command payload parsing
  // Isolate positional arguments by removing standard Node binary paths and the `--json` flag.
  const args = process.argv.slice(2).filter(arg => arg !== '--json');
  // Determine if output should be formatted as raw JSON instead of human-readable text.
  const isJson = process.argv.includes('--json');
  // Extract the primary sub-command from the sanitized argument list.
  const command = args[0];

  // Display help text if no command is provided or if help is explicitly requested.
  if (!command || command === 'help') {
    console.log(`
Jules REST API Client Helper (TypeScript)

Usage:
  npx tsx scripts/jules_client.ts list [--json]
  npx tsx scripts/jules_client.ts sources
  npx tsx scripts/jules_client.ts status <sessionId>
  npx tsx scripts/jules_client.ts reply <sessionId> <message>
  npx tsx scripts/jules_client.ts pull <sessionId> <outputPath>
`);
    // Exit successfully after displaying usage instructions.
    process.exit(0);
  }

  try {
    // Handle the 'sources' command to fetch available code context sources.
    if (command === 'sources') {
      // Execute a GET request to the sources endpoint.
      const data = await request('https://jules.googleapis.com/v1alpha/sources', { headers });
      // Output the response to stdout.
      console.log(JSON.stringify(data, null, 2));
    // Handle the 'list' command to view local session states.
    } else if (command === 'list') {
      // Retrieve the local session cache.
      const sessionsList = getSessions();
      // Handle the case where no local sessions exist yet.
      if (sessionsList.length === 0) {
        if (isJson) {
          // Output an empty array for JSON parsers.
          console.log(JSON.stringify([]));
        } else {
          // Output a human-readable message.
          console.log('No registered sessions found in .jules-companion/sessions.json');
        }
        // Exit the command block early.
        return;
      }

      // Handle raw JSON output formatting for programmatic parsers (like MCP).
      if (isJson) {
        // Output raw JSON map of current session states
        // Map over all sessions and resolve their current statuses from the cloud concurrently.
        const results = await Promise.all(
          sessionsList.map(async (s) => {
            try {
              // Query the specific session ID against the Google Jules API.
              const data = await request(`https://jules.googleapis.com/v1alpha/sessions/${s.id}`, { headers });
              // Return a structured object with the session metadata and current cloud state.
              return { agent: s.agent, id: s.id, state: data.state || 'UNKNOWN' };
            } catch (e: any) {
              // Gracefully handle individual session fetch errors by embedding the error in the result.
              return { agent: s.agent, id: s.id, state: 'ERROR', error: e.message };
            }
          })
        );
        // Dump the constructed JSON array to stdout.
        console.log(JSON.stringify(results, null, 2));
        // Exit the command block early.
        return;
      }

      // Handle human-readable table rendering.
      console.log('\nChecking statuses of registered sessions...');
      console.log('==========================================================================');
      // Render the table header row.
      console.log(String('Agent').padEnd(15) + ' | ' + String('Session ID').padEnd(22) + ' | ' + String('State').padEnd(20));
      console.log('==========================================================================');

      // Concurrent fetch to prevent hanging sequentially if list is long
      // Map over all sessions and format their states into padded strings concurrently.
      const textResults = await Promise.all(
        sessionsList.map(async (s) => {
          try {
            // Query the specific session ID against the Google Jules API.
            const data = await request(`https://jules.googleapis.com/v1alpha/sessions/${s.id}`, { headers });
            // Format the successful result row.
            return String(s.agent).padEnd(15) + ' | ' + String(s.id).padEnd(22) + ' | ' + String(data.state || 'UNKNOWN').padEnd(20);
          } catch (e: any) {
            // Format the errored result row.
            return String(s.agent).padEnd(15) + ' | ' + String(s.id).padEnd(22) + ' | ' + `ERROR: ${e.message}`;
          }
        })
      );

      // Iterate through the resolved table rows and print them sequentially.
      for (const result of textResults) {
        console.log(result);
      }
      console.log('==========================================================================\n');
    // Handle the 'status' command to retrieve detailed metadata for a single session.
    } else if (command === 'status') {
      // Extract the target session ID from the positional arguments.
      const id = args[1];
      // Validate that a session ID was provided.
      if (!id) throw new Error('Session ID required for status');
      // Execute a GET request to the specific session endpoint.
      const data = await request(`https://jules.googleapis.com/v1alpha/sessions/${id}`, { headers });
      // Dump the raw JSON payload to stdout.
      console.log(JSON.stringify(data, null, 2));
    // Handle the 'reply' command to post new prompts to an active session.
    } else if (command === 'reply') {
      // Extract the target session ID from the positional arguments.
      const id = args[1];
      // Reconstruct the message string by joining all remaining arguments.
      const message = args.slice(2).join(' ');
      // Validate that both ID and message were provided.
      if (!id || !message) throw new Error('Session ID and message required for reply');

      // Execute a POST request targeting the sendMessage method on the session resource.
      const response = await request(`https://jules.googleapis.com/v1alpha/sessions/${id}:sendMessage`, {
        method: 'POST',
        headers
      }, { prompt: message }); // Embed the prompt in the JSON body payload.
      // Print the API response block.
      console.log('Response:', JSON.stringify(response, null, 2));
    // Handle the 'pull' command to extract the final generated git patch from a completed session.
    } else if (command === 'pull') {
      // Extract the target session ID from the positional arguments.
      const id = args[1];
      // Extract the target output file path.
      const outputPath = args[2];
      // Validate that both ID and path were provided.
      if (!id || !outputPath) throw new Error('Session ID and output path required for pull');

      console.log(`Fetching activities for session ${id}...`);
      // Request the complete chronological activity history for the session.
      const data = await request(`https://jules.googleapis.com/v1alpha/sessions/${id}/activities`, { headers });
      // Activities contain the chronological history of the session, including patches and generated artifacts.
      // Fallback to an empty array if the activities field is missing in the response.
      const activities = data.activities || [];
      // Initialize a variable to hold the extracted git patch string if found.
      let patchContent: string | null = null;

      // Iteratively dig into nested artifact structures to locate the final Git patch generated by the cloud.
      for (const act of activities) {
        // Check if the current activity log contains attached artifacts.
        if (act.artifacts) {
          // Iterate through the array of attached artifacts.
          for (const art of act.artifacts) {
            // Look for a generated git patch within the changeset artifacts
            // Deeply check the nested structure to avoid null reference exceptions.
            if (art.changeSet && art.changeSet.gitPatch && art.changeSet.gitPatch.unidiffPatch) {
              // Extract the unified diff patch string.
              patchContent = art.changeSet.gitPatch.unidiffPatch;
              // Break out of the inner loop once the patch is found.
              break;
            }
          }
        }
        if (patchContent) break; // Optimization: stop parsing early once patch is extracted
      }

      // Check if a valid patch was found during the activity traversal.
      if (patchContent) {
        // Resolve the output path to an absolute system path.
        const fullPath = path.resolve(outputPath);
        // Ensure destination folder tree exists before dumping content
        // Synchronously create any missing directories in the target path hierarchy.
        fs.mkdirSync(path.dirname(fullPath), { recursive: true });
        // Write the extracted patch string to the target file location.
        fs.writeFileSync(fullPath, patchContent, 'utf8');
        // Notify the user of successful completion.
        console.log(`Successfully pulled patch and wrote to ${fullPath}`);
      } else {
        // Throw an error to be caught by the outer try-catch block if the patch is missing.
        throw new Error(`No git patch found in activities for session ${id}`);
      }
    } else {
      // Handle unrecognized sub-commands gracefully.
      console.error(`Unknown command: ${command}`);
      // Exit with failure code.
      process.exit(1);
    }
  } catch (err: any) {
    // Catch any unexpected exceptions during API interactions or execution logic.
    console.error('Execution failed:', err.message);
    // Exit with failure code.
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

/**
 * Represents a reference to a source repository or directory 
 * tracked by the Google Jules API.
 */
export interface JulesSource {
  /** The unique name or path identifier of the source. */
  name: string;
}
