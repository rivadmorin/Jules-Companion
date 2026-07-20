import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { getProjectDirs, loadSessions, saveSessions, runGit, SessionRecord } from './utils';
import { runSetup } from './setup';
import { deploySession } from './deploy_session';
import { autoProcess } from './auto_process';
import { inspectSession, approveMerge, checkSafetyGate } from './merge_session';
import { getApiKey } from './jules_client';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query: string): Promise<string> {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function ensureApiKey(): Promise<string | null> {
  let key = getApiKey();
  if (key) return key;

  console.log('\n🔑 Jules API Key is missing!');
  console.log('To deploy or monitor cloud sessions, you need a Google Jules API Key.');
  const inputKey = await question('Please paste your JULES_API_KEY (or press Enter to skip):\n> ');

  if (inputKey.trim()) {
    const dirs = getProjectDirs();
    const envPath = path.join(dirs.julesDir, '.env');
    fs.writeFileSync(envPath, `JULES_API_KEY=${inputKey.trim()}\n`, 'utf8');
    console.log(`✓ API Key saved to: ${envPath}`);
    process.env.JULES_API_KEY = inputKey.trim();
    return inputKey.trim();
  }

  console.log('⚠️ Skipping API Key setup. Cloud deployments will be unavailable.');
  return null;
}

async function handleUpdateApiKey() {
  console.log('\n🔑 Configure / Update Jules API Key');
  const inputKey = await question('Please enter new JULES_API_KEY:\n> ');
  if (inputKey.trim()) {
    const dirs = getProjectDirs();
    const envPath = path.join(dirs.julesDir, '.env');
    fs.writeFileSync(envPath, `JULES_API_KEY=${inputKey.trim()}\n`, 'utf8');
    console.log(`✓ API Key updated successfully at: ${envPath}`);
    process.env.JULES_API_KEY = inputKey.trim();
  } else {
    console.log('No key entered. API Key unchanged.');
  }
}

function inferAgentAndMode(text: string, registryPath: string): { agents: string[], mode: 'code' | 'review' } {
  const normalized = text.toLowerCase();
  let mode: 'code' | 'review' = 'code';
  const reviewKeywords = ['audit', 'review', 'analyze', 'check', 'inspect', 'security scan', 'report'];
  if (reviewKeywords.some(k => normalized.includes(k))) {
    mode = 'review';
  }

  const matchedAgents = new Set<string>();
  const keywordMap: Record<string, string[]> = {
    bolt: ['optimize', 'performance', 'speed', 'fast', 'loop', 'allocate', 'allocation', 'cpu'],
    sentinel: ['security', 'vuln', 'vulnerability', 'input', 'sanitize', 'validation', 'error', 'safe', 'crash'],
    janitor: ['clean', 'refactor', 'remove', 'dead', 'stale', 'tidy', 'simpl', 'structure'],
    watcher: ['leak', 'memory', 'leakage', 'profile', 'heap'],
    packager: ['dep', 'dependency', 'npm', 'package', 'version', 'install'],
    modernizer: ['modern', 'upgrade', 'legacy', 'deprecated'],
    dockerist: ['docker', 'container', 'compose', 'k8s'],
    benchmarker: ['benchmark', 'test', 'run', 'time', 'ms']
  };

  for (const [agent, keywords] of Object.entries(keywordMap)) {
    if (keywords.some(k => normalized.includes(k))) {
      matchedAgents.add(agent);
    }
  }

  if (fs.existsSync(registryPath)) {
    try {
      const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
      for (const [agent, meta] of Object.entries(registry.agents) as any) {
        if (normalized.includes(agent)) {
          matchedAgents.add(agent);
        }
      }
    } catch (_) {}
  }

  if (matchedAgents.size === 0) {
    matchedAgents.add('bolt');
  }

  return {
    agents: Array.from(matchedAgents),
    mode
  };
}

async function showActiveSessions() {
  const sessions = loadSessions();
  const active = sessions.filter(s => s.status !== 'merged' && s.status !== 'failed');

  console.log(`\n📊 === Active Sessions Status (${active.length} active) ===`);
  if (active.length === 0) {
    console.log('No active cloud sessions found.');
    return;
  }

  const apiKey = getApiKey();
  const headers = apiKey ? { 'X-Goog-Api-Key': apiKey } : {};

  console.log('------------------------------------------------------------------------------------------');
  console.log('[Agent]'.padEnd(12) + ' | ' + '[Session ID]'.padEnd(20) + ' | ' + '[Mode]'.padEnd(10) + ' | ' + '[Local Status]'.padEnd(15) + ' | ' + '[Live State]');
  console.log('------------------------------------------------------------------------------------------');

  const GREEN = '\x1b[1;32m';
  const YELLOW = '\x1b[1;33m';
  const RED = '\x1b[1;31m';
  const CYAN = '\x1b[1;36m';
  const RESET = '\x1b[0m';

  for (const s of active) {
    let liveState = 'UNKNOWN';
    if (apiKey) {
      try {
        const res = await request(`https://jules.googleapis.com/v1alpha/sessions/${s.id}`, { headers });
        liveState = res.state || 'UNKNOWN';
        if (liveState === 'COMPLETED') s.status = 'completed';
        else if (liveState === 'FAILED') s.status = 'failed';
      } catch {
        liveState = 'FETCH_FAILED';
      }
    }

    let coloredState = liveState;
    if (liveState === 'COMPLETED') coloredState = `${GREEN}COMPLETED${RESET}`;
    else if (liveState === 'RUNNING') coloredState = `${YELLOW}RUNNING${RESET}`;
    else if (liveState === 'FAILED') coloredState = `${RED}FAILED${RESET}`;
    else if (liveState.includes('AWAITING')) coloredState = `${CYAN}${liveState}${RESET}`;

    console.log(`${s.agent.padEnd(12)} | ${s.id.slice(0, 18).padEnd(20)} | ${s.mode.toUpperCase().padEnd(10)} | ${s.status.padEnd(15)} | ${coloredState}`);
  }
  console.log('------------------------------------------------------------------------------------------');
  saveSessions(sessions);
}

// Request wrapper helper
async function request(url: string, options: any): Promise<any> {
  const fetch = require('node-fetch');
  const res = await fetch(url, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  return res.json();
}

async function handleSmartLaunch() {
  const dirs = getProjectDirs();
  const registryPath = path.join(dirs.agentsDir, 'registry.json');

  console.log('\n🤖 Smart Launch: Auto-Interpret Intent');
  const taskGoal = await question('Describe what you want to achieve in natural language:\n> ');
  if (!taskGoal.trim()) {
    console.log('Task goal cannot be empty.');
    return;
  }

  const { agents, mode } = inferAgentAndMode(taskGoal, registryPath);
  console.log('\n--------------------------------------------------');
  console.log(`Suggested Agent(s) : ${agents.join(', ')}`);
  console.log(`Suggested Mode     : ${mode.toUpperCase()}`);
  console.log('--------------------------------------------------');

  const confirm = await question('Deploy session now? (Y/n): ');
  if (confirm.toLowerCase() === 'n') {
    console.log('Launch aborted.');
    return;
  }

  console.log(`Deploying session for ${agents.join(', ')} in ${mode.toUpperCase()} mode...`);
  
  process.argv = [
    process.argv[0],
    process.argv[1],
    '--type', 'review',
    '--agents', agents.join(','),
    '--task', taskGoal,
    '--mode', mode
  ];

  try {
    await deploySession();
  } catch (err: any) {
    console.error(`Launch failed: ${err.message}`);
  }
}

async function handleManualDeploy() {
  console.log('\n🚀 Manual Sesi Deployment');
  const modeChoice = await question('Select Mode:\n[1] Code Mode (Direct Implementation)\n[2] Review Mode (Audit Only)\nChoice (1-2): ');
  const mode = modeChoice === '2' ? 'review' : 'code';

  const agents = await question('Enter Agent Name(s) (comma-separated, e.g. bolt,sentinel):\n> ');
  if (!agents.trim()) {
    console.log('Agent names cannot be empty.');
    return;
  }

  const task = await question('Enter task description:\n> ');
  if (!task.trim()) {
    console.log('Task description cannot be empty.');
    return;
  }

  process.argv = [
    process.argv[0],
    process.argv[1],
    '--type', 'review',
    '--agents', agents,
    '--task', task,
    '--mode', mode
  ];

  try {
    await deploySession();
  } catch (err: any) {
    console.error(`Deployment failed: ${err.message}`);
  }
}

async function handleAutoProcess() {
  console.log('\n⚡ Auto-Processing Active Sessions...');
  process.argv = [process.argv[0], process.argv[1], '--all'];
  try {
    await autoProcess();
  } catch (err: any) {
    console.error(`Auto-processing failed: ${err.message}`);
  }
}

async function handleInspect() {
  const sessions = loadSessions();
  const completed = sessions.filter(s => s.status === 'completed' || s.status === 'launched' || s.status === 'plan_approved');
  
  if (completed.length === 0) {
    console.log('\nNo completed sessions available for inspection.');
    return;
  }

  console.log('\n🔍 Available Completed Sessions to Inspect:');
  completed.forEach((s, idx) => {
    console.log(`[${idx + 1}] ${s.agent} (${s.id.slice(0, 12)}...)`);
  });

  const choice = await question('Select Session Number to Inspect (or enter to cancel):\n> ');
  const idx = parseInt(choice) - 1;
  if (isNaN(idx) || idx < 0 || idx >= completed.length) return;

  const target = completed[idx];
  const targetBranchRes = runGit(['branch', '--show-current']);
  const targetBranch = targetBranchRes.stdout || 'main';

  const apiKey = getApiKey();
  if (!apiKey) {
    console.error('Error: JULES_API_KEY not found.');
    return;
  }

  try {
    const ok = await checkSafetyGate({ 'X-Goog-Api-Key': apiKey });
    if (!ok) {
      console.error('\n❌ Execution Blocked: Some active sessions are still in progress.');
      console.error('Wait until ALL active sessions are COMPLETED to prevent code conflicts.');
      return;
    }

    await inspectSession(target.id, targetBranch, { 'X-Goog-Api-Key': apiKey }, targetBranch);
  } catch (err: any) {
    console.error(`Inspection failed: ${err.message}`);
  }
}

async function handleApproveMerge() {
  const sessions = loadSessions();
  const inspected = sessions.filter(s => s.status === 'inspected');

  if (inspected.length === 0) {
    console.log('\nNo inspected sessions ready for final merge.');
    console.log('Run Option 5 (Inspect Completed Sessions) first.');
    return;
  }

  console.log('\n🌿 Inspected Sessions Ready for Final Merge:');
  inspected.forEach((s, idx) => {
    console.log(`[${idx + 1}] ${s.agent} (${s.id.slice(0, 12)}...)`);
  });

  const choice = await question('Select Session Number to Merge (or enter to cancel):\n> ');
  const idx = parseInt(choice) - 1;
  if (isNaN(idx) || idx < 0 || idx >= inspected.length) return;

  const target = inspected[idx];
  const targetBranchRes = runGit(['branch', '--show-current']);
  const targetBranch = targetBranchRes.stdout || 'main';

  const apiKey = getApiKey();
  if (!apiKey) {
    console.error('Error: JULES_API_KEY not found.');
    return;
  }

  try {
    const ok = await checkSafetyGate({ 'X-Goog-Api-Key': apiKey });
    if (!ok) {
      console.error('\n❌ Execution Blocked: Active sessions are in progress.');
      return;
    }

    await approveMerge(target.id, targetBranch, targetBranch);
  } catch (err: any) {
    console.error(`Merge failed: ${err.message}`);
  }
}

export async function main() {
  const PURPLE = '\x1b[1;35m';
  const CYAN = '\x1b[1;36m';
  const RESET = '\x1b[0m';

  // 1. Output Bold Purple JULES COMPANION Block ASCII Art Banner
  console.log(`${PURPLE}
 ██████  ██    ██  ██      ███████  ███████ 
    ██   ██    ██  ██      ██       ██      
    ██   ██    ██  ██      █████    ███████ 
 ██  ██  ██    ██  ██      ██            ██ 
  ████    ██████   ███████ ███████  ███████ 

  ██████  ██████  ███    ███ ██████   █████  ███    ██  ██  ██████  ███    ██ 
 ██      ██    ██ ████  ████ ██   ██ ██   ██ ████   ██  ██ ██    ██ ████   ██ 
 ██      ██    ██ ██ ████ ██ ██████  ███████ ██ ██  ██  ██ ██    ██ ██ ██  ██ 
 ██      ██    ██ ██  ██  ██ ██      ██   ██ ██  ██ ██  ██ ██    ██ ██  ██ ██ 
  ██████  ██████  ██      ██ ██      ██   ██ ██   ████  ██  ██████  ██   ████ 
${RESET}`);

  // 2. Output Detailed ASCII Workflow Diagram
  console.log(`${CYAN}
  ⚙️  JULES WORKFLOW LIFE-CYCLE:
  [1. Deploy] ──► [2. Smart Launch] ──► [3. Monitor] ──► [4. Auto-Process]
                                                                │
                                                                ▼
  [6. Merge]  ◄── [docs/reports/]   ◄── [5. Inspect] ◄── [Safety Gate]
${RESET}`);

  // 3. Ensure API Key before menu load
  await ensureApiKey();

  while (true) {
    console.log(`
 ╔═════════════════════════════════════════════════════════╗
 ║                SELECT INTERACTIVE ACTION                ║
 ╠═════════════════════════════════════════════════════════╣
 ║  [ 1 ] 🚀 Deploy Specialist Session (Manual)            ║
 ║  [ 2 ] 🤖 Auto-Interpret Intent & Deploy (Smart Launch) ║
 ║  [ 3 ] 📊 Check Active Sessions Status (Single-Shot)    ║
 ║  [ 4 ] ⚡ Auto-Process Active Sessions (Approve & Reply) ║
 ║  [ 5 ] 🔍 Inspect Completed Sessions (Generate Reports) ║
 ║  [ 6 ] ✅ Approve & Finalize Merge (Integrate Patch)     ║
 ║  [ 7 ] 🔑 Configure / Update API Key                    ║
 ║  [ 8 ] ⚙️  Workspace Setup / Self-Healing                ║
 ║  [ 9 ] 🚪 Exit                                          ║
 ╚═════════════════════════════════════════════════════════╝`);

    const choice = await question('Enter Option (1-9): ');
    if (choice === '1') {
      await handleManualDeploy();
    } else if (choice === '2') {
      await handleSmartLaunch();
    } else if (choice === '3') {
      await showActiveSessions();
    } else if (choice === '4') {
      await handleAutoProcess();
    } else if (choice === '5') {
      await handleInspect();
    } else if (choice === '6') {
      await handleApproveMerge();
    } else if (choice === '7') {
      await handleUpdateApiKey();
    } else if (choice === '8') {
      console.log('\nRunning Setup...');
      runSetup();
    } else if (choice === '9') {
      console.log('Goodbye!');
      rl.close();
      process.exit(0);
    } else {
      console.log('Invalid option. Please choose 1-9.');
    }
  }
}

if (require.main === module) {
  main();
}
