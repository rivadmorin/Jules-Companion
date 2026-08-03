import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';

const sharedAgent = new https.Agent({ keepAlive: true });

export interface SessionRecord {
  id: string;
  agent: string;
  task?: string;
  status?: string;
  timestamp?: string;
}

export interface JulesSource {
  name: string;
  id?: string;
  [key: string]: any;
}

let cachedApiKey: string | null = null;

/**
 * Locates and retrieves the Jules API Key.
 *
 * First checks the cached value, then attempts to parse `.env` files in
 * the current working directory or the package directory. Finally, falls
 * back to the system environment variables.
 *
 * @returns {string | null} The API key if found, otherwise null.
 */
export function getApiKey(): string | null {
  // Return early if the key is already loaded in memory
  if (cachedApiKey !== null) return cachedApiKey;

  const checkPaths = [
    path.join(process.cwd(), '.env'),
    path.join(process.cwd(), '.jules-companion', '.env'),
    path.join(__dirname, '..', '.env'),
    path.join(__dirname, '..', '.jules-companion', '.env')
  ];

  for (const p of checkPaths) {
    if (fs.existsSync(p)) {
      try {
        const content = fs.readFileSync(p, 'utf8');
        const match = content.match(/^JULES_API_KEY\s*=\s*(.+)$/m);
        if (match && match[1]) {
          cachedApiKey = match[1].trim().replace(/^["']|["']$/g, '');
          return cachedApiKey;
        }
      } catch (e) {
        // Skip unreadable .env file
      }
    }
  }

  cachedApiKey = process.env.JULES_API_KEY || null;
  return cachedApiKey;
}

/**
 * Retrieves a list of active sessions from local storage.
 *
 * It attempts to locate `sessions.json` in various standard directories
 * and robustly parses the content, handling both array and object structures
 * from legacy formats.
 *
 * @returns {SessionRecord[]} An array of session records, or an empty array if none found or parsing fails.
 */
export function getSessions(): SessionRecord[] {
  const checkPaths = [
    path.join(process.cwd(), '.jules-companion', 'sessions.json'),
    path.join(process.cwd(), 'sessions.json'),
    path.join(__dirname, '..', '.jules-companion', 'sessions.json')
  ];

  for (const p of checkPaths) {
    if (fs.existsSync(p)) {
      try {
        const content = fs.readFileSync(p, 'utf8');
        const parsed = JSON.parse(content);
        // Happy path: The file is a direct array of session records
        if (Array.isArray(parsed)) return parsed;
        // Fallback handling for nested or legacy object structures
        if (typeof parsed === 'object' && parsed !== null) {
          const sessionsObj = parsed.sessions || parsed;
          if (Array.isArray(sessionsObj)) return sessionsObj;
          // Legacy format: { "agentName": "sessionId" }
          return Object.entries(sessionsObj).map(([agent, id]) => ({
            id: String(id),
            agent
          }));
        }
      } catch (e: any) {
        console.error(`Warning: Failed to parse sessions file at ${p}:`, e.message);
      }
    }
  }
  return [];
}

/**
 * Makes an HTTPS request to the Google Jules API.
 *
 * @template T - The expected return type of the parsed JSON response.
 * @param {string} url - The full URL for the request.
 * @param {Object} options - Request options.
 * @param {string} [options.method='GET'] - HTTP method.
 * @param {Record<string, string>} [options.headers] - Custom HTTP headers.
 * @param {any} [body=null] - The request body payload. If it's an object, it will be JSON stringified.
 * @returns {Promise<T>} A promise that resolves to the parsed response data.
 */
export function request<T = any>(
  url: string,
  options: { method?: string; headers?: Record<string, string> } = {},
  body: any = null
): Promise<T> {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const reqOptions: https.RequestOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 443,
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Jules-Companion-TS/1.0',
        ...options.headers
      },
      agent: sharedAgent
    };

    const req = https.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        // Successful response range
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          try {
            // Attempt to parse JSON response. If it fails, fallback to raw string (e.g., empty responses).
            resolve(JSON.parse(data));
          } catch (e) {
            resolve(data as unknown as T);
          }
        } else {
          // Base error message covering status code and standard HTTP status message
          let errMsg = `HTTP ${res.statusCode}: ${res.statusMessage}`;
          try {
            // Attempt to parse structured error payload from Jules API
            const errObj = JSON.parse(data);
            if (errObj.error && errObj.error.message) {
              errMsg = `HTTP ${res.statusCode} (${errObj.error.status || 'ERROR'}): ${errObj.error.message}`;
            }
          } catch (_) {
            // If the error response is not valid JSON (e.g., proxy error), append the raw truncated body
            if (data) errMsg += ` - ${data.slice(0, 200)}`;
          }
          reject(new Error(errMsg));
        }
      });
    });

    req.on('error', (e) => {
      reject(new Error(`Network error connecting to Google Jules API: ${e.message}`));
    });

    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

/**
 * Main CLI entry point for testing and executing Jules API operations directly.
 *
 * Handled commands: list, sources, status, reply, and pull.
 * This acts as a low-level bridge utility directly interfacing with the API, bypassing
 * the higher-level orchestrations in deploy/merge when raw operations are needed.
 */
async function main() {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.error('Error: JULES_API_KEY not found in environment or .env file.');
    console.error('Please create a .env file with JULES_API_KEY=<your-key>');
    process.exit(1);
  }

  const headers = { 'X-Goog-Api-Key': apiKey };
  const args = process.argv.slice(2).filter(arg => arg !== '--json');
  const isJson = process.argv.includes('--json');
  const command = args[0];

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
    process.exit(0);
  }

  try {
    if (command === 'sources') {
      const data = await request('https://jules.googleapis.com/v1alpha/sources', { headers });
      console.log(JSON.stringify(data, null, 2));
    } else if (command === 'list') {
      const sessionsList = getSessions();
      if (sessionsList.length === 0) {
        console.log('No registered sessions found in .jules-companion/sessions.json');
        return;
      }

      if (isJson) {
        const results = await Promise.all(
          sessionsList.map(async (s) => {
            try {
              const data = await request(`https://jules.googleapis.com/v1alpha/sessions/${s.id}`, { headers });
              return { agent: s.agent, id: s.id, state: data.state || 'UNKNOWN' };
            } catch (e: any) {
              return { agent: s.agent, id: s.id, state: 'ERROR', error: e.message };
            }
          })
        );
        console.log(JSON.stringify(results, null, 2));
        return;
      }

      console.log('\nChecking statuses of registered sessions...');
      console.log('==========================================================================');
      console.log(String('Agent').padEnd(15) + ' | ' + String('Session ID').padEnd(22) + ' | ' + String('State').padEnd(20));
      console.log('==========================================================================');

      const textResults = await Promise.all(
        sessionsList.map(async (s) => {
          try {
            const data = await request(`https://jules.googleapis.com/v1alpha/sessions/${s.id}`, { headers });
            return String(s.agent).padEnd(15) + ' | ' + String(s.id).padEnd(22) + ' | ' + String(data.state || 'UNKNOWN').padEnd(20);
          } catch (e: any) {
            return String(s.agent).padEnd(15) + ' | ' + String(s.id).padEnd(22) + ' | ' + `ERROR: ${e.message}`;
          }
        })
      );

      for (const result of textResults) {
        console.log(result);
      }
      console.log('==========================================================================\n');
    } else if (command === 'status') {
      const id = args[1];
      if (!id) throw new Error('Session ID required for status');
      const data = await request(`https://jules.googleapis.com/v1alpha/sessions/${id}`, { headers });
      console.log(JSON.stringify(data, null, 2));
    } else if (command === 'reply') {
      const id = args[1];
      const message = args.slice(2).join(' ');
      if (!id || !message) throw new Error('Session ID and message required for reply');
      const response = await request(`https://jules.googleapis.com/v1alpha/sessions/${id}:sendMessage`, {
        method: 'POST',
        headers
      }, { prompt: message });
      console.log('Response:', JSON.stringify(response, null, 2));
    } else if (command === 'pull') {
      const id = args[1];
      const outputPath = args[2];
      if (!id || !outputPath) throw new Error('Session ID and output path required for pull');

      console.log(`Fetching activities for session ${id}...`);
      const data = await request(`https://jules.googleapis.com/v1alpha/sessions/${id}/activities`, { headers });
      // Activities contain the chronological history of the session, including patches
      const activities = data.activities || [];
      let patchContent: string | null = null;

      for (const act of activities) {
        if (act.artifacts) {
          for (const art of act.artifacts) {
            // Look for a generated git patch within the changeset artifacts
            if (art.changeSet && art.changeSet.gitPatch && art.changeSet.gitPatch.unidiffPatch) {
              patchContent = art.changeSet.gitPatch.unidiffPatch;
              break;
            }
          }
        }
        if (patchContent) break;
      }

      if (patchContent) {
        const fullPath = path.resolve(outputPath);
        fs.mkdirSync(path.dirname(fullPath), { recursive: true });
        fs.writeFileSync(fullPath, patchContent, 'utf8');
        console.log(`Successfully pulled patch and wrote to ${fullPath}`);
      } else {
        throw new Error(`No git patch found in activities for session ${id}`);
      }
    } else {
      console.error(`Unknown command: ${command}`);
      process.exit(1);
    }
  } catch (err: any) {
    console.error('Execution failed:', err.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
