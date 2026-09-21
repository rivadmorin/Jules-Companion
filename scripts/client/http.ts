/**
 * Low-level HTTP transport and authentication engine for Google Jules API.
 * @module client/http
 */

import * as path from 'path';
import * as fs from 'fs';

let cachedApiKey: string | null = null;

/**
 * Retrieves the Google Jules API key from system environment variables
 * or local .env fallback files in standard locations with in-memory caching.
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
 * High-performance promise-based HTTP request client utilizing native globalThis.fetch().
 *
 * @param url - The full URL for the request.
 * @param options - Request options configuring method and headers.
 * @param body - The request body payload. If it's an object, it will be JSON stringified.
 * @returns A promise that resolves to the parsed response data.
 */
export async function request<T = any>(
  url: string,
  options: { method?: string; headers?: Record<string, string> } = {},
  body: any = null
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': 'Jules-Companion-TS/1.0',
    ...options.headers
  };

  const init: RequestInit = {
    method: options.method || 'GET',
    headers
  };

  if (body) {
    init.body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  try {
    const res = await fetch(url, init);
    const text = await res.text();

    if (res.ok) {
      try {
        return JSON.parse(text) as T;
      } catch (_e) {
        return text as unknown as T;
      }
    }

    let errMsg = `HTTP ${res.status}: ${res.statusText}`;
    try {
      const errObj = JSON.parse(text);
      if (errObj.error && errObj.error.message) {
        errMsg = `HTTP ${res.status} (${errObj.error.status || 'ERROR'}): ${errObj.error.message}`;
      }
    } catch (_) {
      if (text) errMsg += ` - ${text.slice(0, 200)}`;
    }
    throw new Error(errMsg);
  } catch (e: any) {
    if (e.message?.startsWith('HTTP ')) throw e;
    throw new Error(`Network error connecting to Google Jules API: ${e.message}`);
  }
}
