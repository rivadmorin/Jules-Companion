/**
 * Low-level HTTP transport and authentication engine for Google Jules API.
 * @module client/http
 */

import * as https from 'https';
import * as path from 'path';
import * as fs from 'fs';

// Network requests to the Google Jules API are optimized using a shared https.Agent
// to prevent TLS handshake overhead on batch CLI operations.
const sharedAgent = new https.Agent({ keepAlive: true });

let cachedApiKey: string | null = null;

/**
 * Retrieves the Google Jules API key from either the system environment variables
 * or local .env fallback files in standard locations.
 * Uses a caching mechanism so filesystem isn't hit repeatedly during the same process execution.
 *
 * @param targetDir - Optional directory to check first for `.env` files.
 * @returns The raw API key string if found, otherwise null.
 */
export function getApiKey(targetDir?: string): string | null {
  if (process.env.JULES_API_KEY === '') return null;
  if (cachedApiKey) return cachedApiKey;

  // 1. Check system-level environment variable first
  if (process.env.JULES_API_KEY && !process.env.JULES_API_KEY.includes('your_jules_api_key_here')) {
    cachedApiKey = process.env.JULES_API_KEY;
    return cachedApiKey;
  }

  // 2. Define fallback paths where a `.env` file might be stored locally
  const envPaths: string[] = [];
  if (targetDir) {
    envPaths.push(
      path.join(targetDir, '.jules-companion', '.env'),
      path.join(targetDir, '.env')
    );
  }
  envPaths.push(
    path.join(process.cwd(), '.jules-companion', '.env'),
    path.join(process.cwd(), '.env'),
    path.join(__dirname, '..', '.jules-companion', '.env'),
    path.join(__dirname, '..', '.env')
  );

  // 3. Sequentially search paths and parse the .env structure if found
  for (const p of envPaths) {
    if (fs.existsSync(p)) {
      try {
        const content = fs.readFileSync(p, 'utf8');
        const match = content.match(/JULES_API_KEY\s*=\s*(.+)/);
        if (match && match[1]) {
          const parsedKey = match[1].trim().replace(/^['"]|['"]$/g, '');
          if (parsedKey && !parsedKey.includes('your_jules_api_key_here')) {
            cachedApiKey = parsedKey;
            return cachedApiKey;
          }
        }
      } catch (_e) {
        // Skip unreadable .env file
      }
    }
  }

  cachedApiKey = (process.env.JULES_API_KEY && !process.env.JULES_API_KEY.includes('your_jules_api_key_here'))
    ? process.env.JULES_API_KEY
    : null;
  return cachedApiKey;
}

/**
 * Resets the in-memory cached API key, useful during testing and credential refreshes.
 */
export function resetApiKeyCache(): void {
  cachedApiKey = null;
}

/**
 * Low-level promise-based HTTPS request client tailored for Google REST APIs.
 *
 * @param url - The full URL for the request.
 * @param options - Request options configuring method and headers.
 * @param body - The request body payload. If it's an object, it will be JSON stringified.
 * @returns A promise that resolves to the parsed response data.
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
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch (_e) {
            resolve(data as unknown as T);
          }
        } else {
          let errMsg = `HTTP ${res.statusCode}: ${res.statusMessage}`;
          try {
            const errObj = JSON.parse(data);
            if (errObj.error && errObj.error.message) {
              errMsg = `HTTP ${res.statusCode} (${errObj.error.status || 'ERROR'}): ${errObj.error.message}`;
            }
          } catch (_) {
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
