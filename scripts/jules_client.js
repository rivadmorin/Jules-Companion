#!/usr/bin/env node
/**
 * jules_client.js
 * Google Jules REST API Client Helper for jules-companion
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Helper to make HTTPS requests
function request(url, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const reqOptions = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };
    
    const req = https.request(url, reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            resolve(data);
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (e) => { reject(e); });
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

// Find API key in .env or .jules-companion/.env
function getApiKey() {
  const checkPaths = [
    path.join(process.cwd(), '.env'),
    path.join(process.cwd(), '.jules-companion', '.env'),
    path.join(__dirname, '..', '.env'),
    path.join(__dirname, '..', '.jules-companion', '.env')
  ];

  for (const p of checkPaths) {
    if (fs.existsSync(p)) {
      const content = fs.readFileSync(p, 'utf8');
      const match = content.match(/^JULES_API_KEY\s*=\s*(.+)$/m);
      if (match) {
        return match[1].trim();
      }
    }
  }
  return process.env.JULES_API_KEY || null;
}

// Find sessions.json
function getSessions() {
  const checkPaths = [
    path.join(process.cwd(), 'sessions.json'),
    path.join(process.cwd(), '.jules-companion', 'sessions.json'),
    path.join(__dirname, '..', 'sessions.json'),
    path.join(__dirname, '..', '.jules-companion', 'sessions.json')
  ];

  for (const p of checkPaths) {
    if (fs.existsSync(p)) {
      try {
        return JSON.parse(fs.readFileSync(p, 'utf8'));
      } catch (e) {
        console.error(`Error parsing ${p}:`, e.message);
      }
    }
  }
  return {};
}

const apiKey = getApiKey();
if (!apiKey) {
  console.error("Error: JULES_API_KEY not found in environment or .env file.");
  process.exit(1);
}

const args = process.argv.slice(2).filter(arg => arg !== '--json');
const isJson = process.argv.includes('--json');
const command = args[0];

if (require.main === module && (!command || command === 'help')) {
  console.log(`
Jules REST API Client Helper

Usage:
  node jules_client.js list [--json]
  node jules_client.js reply <sessionId> <message>
  node jules_client.js pull <sessionId> <outputPath>
  node jules_client.js status <sessionId>
`);
  process.exit(0);
}

const headers = { 'X-Goog-Api-Key': apiKey };

async function run() {
  try {
    if (command === 'list') {
      const sessions = getSessions();
      const rawSessions = sessions.sessions || sessions; // Handle different json shapes
      
      let sessionsList = [];
      if (Array.isArray(rawSessions)) {
        sessionsList = rawSessions.map(s => ({ name: s.agent, id: s.id }));
      } else {
        sessionsList = Object.entries(rawSessions).map(([name, id]) => ({ name, id }));
      }
      
      if (isJson) {
        const results = [];
        for (const s of sessionsList) {
          const url = `https://jules.googleapis.com/v1alpha/sessions/${s.id}`;
          try {
            const data = await request(url, { headers });
            results.push({ agent: s.name, id: s.id, state: data.state || "UNKNOWN" });
          } catch (e) {
            results.push({ agent: s.name, id: s.id, state: "ERROR", error: e.message });
          }
        }
        console.log(JSON.stringify(results));
        return;
      }
      
      console.log("\nChecking statuses of registered sessions...");
      console.log("==========================================================================");
      console.log(String("Agent").padEnd(15) + " | " + String("Session ID").padEnd(22) + " | " + String("State").padEnd(20));
      console.log("==========================================================================");
      
      for (const s of sessionsList) {
        const url = `https://jules.googleapis.com/v1alpha/sessions/${s.id}`;
        try {
          const data = await request(url, { headers });
          console.log(String(s.name).padEnd(15) + " | " + String(s.id).padEnd(22) + " | " + String(data.state || "UNKNOWN").padEnd(20));
        } catch (e) {
          console.log(String(s.name).padEnd(15) + " | " + String(s.id).padEnd(22) + " | " + `ERROR: ${e.message}`);
        }
      }
      console.log("==========================================================================\n");
    }
    
    else if (command === 'status') {
      const id = args[1];
      if (!id) {
        console.error("Error: Session ID is required.");
        process.exit(1);
      }
      const url = `https://jules.googleapis.com/v1alpha/sessions/${id}`;
      const data = await request(url, { headers });
      console.log(JSON.stringify(data, null, 2));
    }
    
    else if (command === 'reply') {
      const id = args[1];
      const message = args.slice(2).join(' ');
      if (!id || !message) {
        console.error("Error: Session ID and message are required.");
        process.exit(1);
      }
      
      const url = `https://jules.googleapis.com/v1alpha/sessions/${id}:sendMessage`;
      const body = { prompt: message };
      console.log(`Sending message to session ${id}...`);
      const response = await request(url, { method: 'POST', headers }, body);
      console.log("Response:", JSON.stringify(response, null, 2));
    }
    
    else if (command === 'pull') {
      const id = args[1];
      const outputPath = args[2];
      if (!id || !outputPath) {
        console.error("Error: Session ID and output path are required.");
        process.exit(1);
      }
      
      const url = `https://jules.googleapis.com/v1alpha/sessions/${id}/activities`;
      console.log(`Fetching activities for session ${id}...`);
      const data = await request(url, { headers });
      
      const activities = data.activities || [];
      let patchContent = null;
      
      // Find the latest activity with a git patch
      for (const act of activities) {
        if (act.artifacts) {
          for (const art of act.artifacts) {
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
        console.error("Error: No git patch found in the activities of this session.");
        process.exit(1);
      }
    }
    
    else {
      console.error(`Unknown command: ${command}`);
      process.exit(1);
    }
  } catch (error) {
    console.error("Execution failed:", error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  run();
}

module.exports = { request, headers, apiKey, getApiKey, getSessions };
