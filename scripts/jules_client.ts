/**
 * CLI interface and API client bridge for Google Jules.
 * @module jules_client
 */

import * as fs from 'fs';
import * as path from 'path';
import { getApiKey, resetApiKeyCache, request } from './client/http';
import {
  getSessions,
  cancelSessionApi,
  sendMessageApi,
  listSourcesApi,
  pullDiffApi
} from './client/jules_api';
import { JulesSource, SessionRecord } from './core/types';

export {
  JulesSource,
  SessionRecord,
  getApiKey,
  resetApiKeyCache,
  request,
  getSessions,
  cancelSessionApi,
  sendMessageApi,
  listSourcesApi,
  pullDiffApi
};

/**
 * Main CLI entry point for testing and executing Jules API operations directly.
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
        if (isJson) {
          console.log(JSON.stringify([]));
        } else {
          console.log('No registered sessions found in .jules-companion/sessions.json');
        }
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

      const response = await request(
        `https://jules.googleapis.com/v1alpha/sessions/${id}:sendMessage`,
        {
          method: 'POST',
          headers
        },
        { prompt: message }
      );
      console.log('Response:', JSON.stringify(response, null, 2));
    } else if (command === 'pull') {
      const id = args[1];
      const outputPath = args[2];
      if (!id || !outputPath) throw new Error('Session ID and output path required for pull');

      console.log(`Fetching activities for session ${id}...`);
      const patchContent = await pullDiffApi(id);
      const fullPath = path.resolve(outputPath);
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, patchContent, 'utf8');
      console.log(`Successfully pulled patch and wrote to ${fullPath}`);
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
