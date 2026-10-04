/**
 * Low-level HTTP transport and authentication engine for Google Jules API.
 * @module client/http
 */

import * as path from 'path';
import * as fs from 'fs';
import * as https from 'https';
import * as http from 'http';

let globalCachedApiKey: string | null = null;
const directoryApiKeyCache = new Map<string, string | null>();

/**
 * Retrieves the Google Jules API key from system environment variables
 * or local .env fallback files in standard locations with in-memory caching.
 *
 * @param targetDir - Optional directory to check first for `.env` files.
 * @returns The raw API key string if found, otherwise null.
 */
export function getApiKey(targetDir?: string): string | null {
  // Step 1: Check explicitly cleared environment variable
  if (process.env.JULES_API_KEY === '') return null;

  // Step 2: System environment variable takes top precedence
  if (process.env.JULES_API_KEY && !process.env.JULES_API_KEY.includes('your_jules_api_key_here')) {
    globalCachedApiKey = process.env.JULES_API_KEY;
    return globalCachedApiKey;
  }

  // Step 3: Check directory-specific cache if targetDir is provided
  const dirKey = targetDir ? path.resolve(targetDir) : process.cwd();
  if (directoryApiKeyCache.has(dirKey)) {
    return directoryApiKeyCache.get(dirKey) || null;
  }

  // Step 4: Define fallback paths where a `.env` file might be stored locally
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

  // Step 5: Sequentially search paths and parse the .env structure if found
  for (const p of envPaths) {
    if (fs.existsSync(p)) {
      try {
        const content = fs.readFileSync(p, 'utf8');
        const match = content.match(/JULES_API_KEY\s*=\s*(.+)/);
        if (match && match[1]) {
          const parsedKey = match[1].trim().replace(/^['"]|['"]$/g, '');
          if (parsedKey && !parsedKey.includes('your_jules_api_key_here')) {
            directoryApiKeyCache.set(dirKey, parsedKey);
            return parsedKey;
          }
        }
      } catch (_e) {
        // Skip unreadable .env file
      }
    }
  }

  const fallbackKey = (process.env.JULES_API_KEY && !process.env.JULES_API_KEY.includes('your_jules_api_key_here'))
    ? process.env.JULES_API_KEY
    : null;
  directoryApiKeyCache.set(dirKey, fallbackKey);
  return fallbackKey;
}

/**
 * Resets the in-memory cached API key, useful during testing and credential refreshes.
 */
export function resetApiKeyCache(): void {
  globalCachedApiKey = null;
  directoryApiKeyCache.clear();
}

/**
 * Shared keep-alive HTTPS agent to prevent repetitive TLS handshake overhead on batch CLI operations.
 */
const sharedHttpsAgent = new https.Agent({ keepAlive: true });

/**
 * High-performance promise-based HTTP request client utilizing native https/http with keepAlive.
 *
 * @param url - The full URL for the request.
 * @param options - Request options configuring method and headers.
 * @param body - The request body payload. If it's an object, it will be JSON stringified.
 * @returns A promise that resolves to the parsed response data.
 */
export async function request<T = any>(
  url: string,
  options: { method?: string; headers?: Record<string, string>; timeoutMs?: number } = {},
  body: any = null
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const payload = body ? (typeof body === 'string' ? body : JSON.stringify(body)) : null;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'Jules-Companion-TS/1.0',
      ...options.headers
    };
    if (payload) {
      headers['Content-Length'] = Buffer.byteLength(payload).toString();
    }

    const timeoutMs = options.timeoutMs ?? 15000;
    
    // Determine the correct transport and agent based on the protocol
    const isHttps = url.startsWith('https:');
    const transport = isHttps ? https : http;
    const agent = isHttps ? sharedHttpsAgent : undefined;
    
    const reqOptions: http.RequestOptions | https.RequestOptions = {
      method: options.method || 'GET',
      headers,
      agent,
      timeout: timeoutMs
    };

    const req = transport.request(url, reqOptions, (res) => {
      res.setEncoding('utf8');
      let text = '';
      res.on('data', chunk => text += chunk);
      res.on('error', (err) => reject(new Error(`Response stream error: ${err.message}`)));
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(text) as T);
          } catch (_e) {
            resolve(text as unknown as T);
          }
        } else {
          let errMsg = `HTTP ${res.statusCode}: ${res.statusMessage}`;
          try {
            const errObj = JSON.parse(text);
            if (errObj.error && errObj.error.message) {
              errMsg = `HTTP ${res.statusCode} (${errObj.error.status || 'ERROR'}): ${errObj.error.message}`;
            }
          } catch (_) {
            if (text) errMsg += ` - ${text.slice(0, 200)}`;
          }
          reject(new Error(errMsg));
        }
      });
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Request timed out after ${timeoutMs}ms connecting to Google Jules API (${url})`));
    });

    req.on('error', (e: any) => {
      if (e.message?.startsWith('HTTP ')) {
        reject(e);
      } else {
        reject(new Error(`Network error connecting to Google Jules API: ${e.message}`));
      }
    });

    if (payload) {
      req.write(payload);
    }
    
    req.end();
  });
}
