#!/usr/bin/env node
/**
 * auto_process.js
 * Automatically process sessions awaiting user input or plan approval.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

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
          try { resolve(JSON.parse(data)); } catch (e) { resolve(data); }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (e) => { reject(e); });
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

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
      if (match) return match[1].trim();
    }
  }
  return process.env.JULES_API_KEY || null;
}

function getSessions() {
  const checkPaths = [
    path.join(process.cwd(), 'sessions.json'),
    path.join(process.cwd(), '.jules-companion', 'sessions.json'),
    path.join(__dirname, '..', 'sessions.json'),
    path.join(__dirname, '..', '.jules-companion', 'sessions.json')
  ];
  for (const p of checkPaths) {
    if (fs.existsSync(p)) {
      try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) {}
    }
  }
  return {};
}

const apiKey = getApiKey();
if (!apiKey) {
  console.error("Error: JULES_API_KEY not found.");
  process.exit(1);
}

const sessions = getSessions();
const rawSessions = sessions.sessions || sessions;

let sessionsList = [];
if (Array.isArray(rawSessions)) {
  sessionsList = rawSessions.map(s => ({ name: s.agent, id: s.id }));
} else {
  sessionsList = Object.entries(rawSessions).map(([name, id]) => ({ name, id }));
}

const headers = { 'X-Goog-Api-Key': apiKey };

async function main() {
  console.log("=== AUTO-PROCESSING JULES SESSIONS ===");
  for (const s of sessionsList) {
    const url = `https://jules.googleapis.com/v1alpha/sessions/${s.id}`;
    try {
      const data = await request(url, { headers });
      if (data.state === 'AWAITING_USER_INPUT') {
        console.log(`\nSession ${s.name} (${s.id}) is AWAITING_USER_INPUT.`);
        
        // Fetch last activity to see what it wants (plan or message)
        const actUrl = `https://jules.googleapis.com/v1alpha/sessions/${s.id}/activities`;
        const actData = await request(actUrl, { headers });
        const activities = actData.activities || [];
        const lastAct = activities[0]; // Newest first
        
        let message = "Please proceed autonomously with the implementation.";
        if (lastAct && lastAct.progressUpdated) {
          message = "Plan approved. Please proceed with the implementation.";
        }
        
        console.log(`Sending response: "${message}"`);
        const replyUrl = `https://jules.googleapis.com/v1alpha/sessions/${s.id}:sendMessage`;
        await request(replyUrl, { method: 'POST', headers }, { prompt: message });
        console.log(`Approved/replied to session ${s.name}.`);
      }
    } catch (e) {
      console.error(`Error processing ${s.name} (${s.id}): ${e.message}`);
    }
  }
  console.log("\nAuto-processing complete.");
}

main();
