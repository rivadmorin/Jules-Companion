import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { getProjectDirs, loadSessions, saveSessions, runGit } from './utils';
import { runSetup } from './setup';
import { deploySession } from './deploy_session';
import { autoProcess } from './auto_process';
import { inspectSession, approveMerge, checkSafetyGate } from './merge_session';
import { getApiKey, request } from './jules_client';

// Type imports to avoid loading runtime code before FFI check
import type { CliRenderer as TuiRenderer, SelectRenderable as TuiSelect } from '@opentui/core';

let rl: readline.Interface | null = null;

function getRl(): readline.Interface {
  if (!rl) {
    rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }
  return rl;
}

function closeRl() {
  if (rl) {
    rl.close();
    rl = null;
  }
}

const PURPLE = '\x1b[1;35m';
const CYAN = '\x1b[1;36m';
const RESET = '\x1b[0m';
const GREEN = '\x1b[1;32m';
const YELLOW = '\x1b[1;33m';
const RED = '\x1b[1;31m';

const SPECIALIST_AGENTS = [
  { id: 1, name: 'palette', emoji: '🎨', desc: 'UI/UX & Tailwind CSS styling implementation.' },
  { id: 2, name: 'sentinel', emoji: '🛡️', desc: 'Security auditing, validation, crash prevention.' },
  { id: 3, name: 'bolt', emoji: '⚡', desc: 'Speed optimizations, CPU profiling, efficient loops.' },
  { id: 4, name: 'nomad', emoji: '🎒', desc: 'API endpoints routing, migration, integrations.' },
  { id: 5, name: 'packager', emoji: '💿', desc: 'NPM dependencies management and library upgrades.' },
  { id: 6, name: 'exterminator', emoji: '🐛', desc: 'Debugging logic bugs and syntax issues.' },
  { id: 7, name: 'builder', emoji: '🧱', desc: 'Automated build fixes and compiler issues resolution.' },
  { id: 8, name: 'conduit', emoji: '🔌', desc: 'REST API clients, networking protocols, WebSockets.' },
  { id: 9, name: 'alchemist', emoji: '🧪', desc: 'High-order functions, complex algorithms, data mapping.' },
  { id: 10, name: 'gatekeeper', emoji: '🔑', desc: 'Authentication systems (OAuth, JWT, session cookies).' },
  { id: 11, name: 'bridge', emoji: '🧲', desc: 'Database schema design, SQL/NoSQL ORM integrations.' },
  { id: 12, name: 'dockerist', emoji: '🐳', desc: 'Container settings, Dockerfiles, docker-compose configuration.' },
  { id: 13, name: 'modernizer', emoji: '⚙️', desc: 'Upgrades legacy APIs and deprecated syntax structures.' },
  { id: 14, name: 'inspector', emoji: '🔎', desc: 'Automated logs monitoring and error stack trace checking.' },
  { id: 15, name: 'janitor', emoji: '🧹', desc: 'Dead code cleanup, refactoring, code formatting.' },
  { id: 16, name: 'logger', emoji: '🪵', desc: 'Integrating custom loggers and metrics instrumentation.' },
  { id: 17, name: 'benchmarker', emoji: '⏱️', desc: 'Performance profiling and latency micro-benchmarks.' },
  { id: 18, name: 'watcher', emoji: '👁️', desc: 'Memory leak checking and memory footprint profiles.' },
  { id: 19, name: 'chameleon', emoji: '🦎', desc: 'Responsive design layouts (mobile/desktop).' },
  { id: 20, name: 'innovator', emoji: '💡', desc: 'Experimental algorithm prototyping and features.' },
  { id: 21, name: 'materialist', emoji: '🎴', desc: 'Material 3 Design component integration.' },
  { id: 22, name: 'partisan', emoji: '🛰️', desc: 'Cloud serverless API handler code deployment.' },
  { id: 23, name: 'netrunner', emoji: '🌐', desc: 'Web scraping, HTML extraction, and network client.' },
  { id: 24, name: 'adapter', emoji: '🔌', desc: 'Wrapper classes, design pattern interface adapters.' },
  { id: 25, name: 'scribe', emoji: '📝', desc: 'Creating API docs and project documentation guides.' },
  { id: 26, name: 'cartographer', emoji: '🗺️', desc: 'Drawing visual ASCII charts and workflow structures.' },
  { id: 27, name: 'grader', emoji: '📊', desc: 'Static code analyzer reports and score assessments.' },
  { id: 28, name: 'consultant', emoji: '🧠', desc: 'High-level design consultation and architectural suggestions.' },
  { id: 29, name: 'critic', emoji: '🗣️', desc: 'Code review comments and PR reviews.' },
  { id: 30, name: 'proteus', emoji: '🎭', desc: 'Multi-format file conversions and exports.' }
];

function question(query: string): Promise<string> {
  return new Promise((resolve) => {
    getRl().question(`${PURPLE}${query}${RESET}`, (ans) => {
      resolve(ans);
    });
  });
}

async function ensureApiKey(): Promise<string | null> {
  let key = getApiKey();
  if (key) return key;

  console.log(`${PURPLE}\n🔑 Jules API Key is missing!${RESET}`);
  console.log(`${PURPLE}To deploy or monitor cloud sessions, you need a Google Jules API Key.${RESET}`);
  const inputKey = await question('Please paste your JULES_API_KEY (or press Enter to skip):\n> ');

  if (inputKey.trim()) {
    const dirs = getProjectDirs();
    const envPath = path.join(dirs.julesDir, '.env');
    fs.writeFileSync(envPath, `JULES_API_KEY=${inputKey.trim()}\n`, 'utf8');
    console.log(`${PURPLE}✓ API Key saved to: ${envPath}${RESET}`);
    process.env.JULES_API_KEY = inputKey.trim();
    return inputKey.trim();
  }

  console.log(`${PURPLE}⚠️ Skipping API Key setup. Cloud deployments will be unavailable.${RESET}`);
  return null;
}

async function handleUpdateApiKey() {
  console.log(`${PURPLE}\n🔑 Configure / Update Jules API Key${RESET}`);
  const inputKey = await question('Please enter new JULES_API_KEY:\n> ');
  if (inputKey.trim()) {
    const dirs = getProjectDirs();
    const envPath = path.join(dirs.julesDir, '.env');
    fs.writeFileSync(envPath, `JULES_API_KEY=${inputKey.trim()}\n`, 'utf8');
    console.log(`${PURPLE}✓ API Key updated successfully at: ${envPath}${RESET}`);
    process.env.JULES_API_KEY = inputKey.trim();
  } else {
    console.log(`${PURPLE}No key entered. API Key unchanged.${RESET}`);
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

  console.log(`${PURPLE}\n📊 === Active Sessions Status (${active.length} active) ===${RESET}`);
  if (active.length === 0) {
    console.log(`${PURPLE}No active cloud sessions found.${RESET}`);
    return;
  }

  const apiKey = getApiKey();
  const headers: Record<string, string> = apiKey ? { 'X-Goog-Api-Key': apiKey } : {};

  console.log(`${PURPLE}------------------------------------------------------------------------------------------${RESET}`);
  console.log(`${PURPLE}[Agent]`.padEnd(12) + ' | ' + '[Session ID]'.padEnd(20) + ' | ' + '[Mode]'.padEnd(10) + ' | ' + '[Local Status]'.padEnd(15) + ' | ' + '[Live State]' + RESET);
  console.log(`${PURPLE}------------------------------------------------------------------------------------------${RESET}`);

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
    else if (liveState === 'RUNNING' || liveState === 'IN_PROGRESS') coloredState = `${YELLOW}${liveState}${RESET}`;
    else if (liveState === 'FAILED') coloredState = `${RED}FAILED${RESET}`;
    else if (liveState.includes('AWAITING')) coloredState = `${CYAN}${liveState}${RESET}`;

    console.log(`${s.agent.padEnd(12)} | ${s.id.slice(0, 18).padEnd(20)} | ${s.mode.toUpperCase().padEnd(10)} | ${s.status.padEnd(15)} | ${coloredState}`);
  }
  console.log(`${PURPLE}------------------------------------------------------------------------------------------${RESET}`);
  saveSessions(sessions);
}

async function handleSmartLaunch() {
  const dirs = getProjectDirs();
  const registryPath = path.join(dirs.agentsDir, 'registry.json');

  console.log(`${PURPLE}\n🤖 Smart Launch: Auto-Interpret Intent${RESET}`);
  const taskGoal = await question('Describe what you want to achieve in natural language:\n> ');
  if (!taskGoal.trim()) {
    console.log(`${PURPLE}Task goal cannot be empty.${RESET}`);
    return;
  }

  const { agents, mode } = inferAgentAndMode(taskGoal, registryPath);
  console.log(`${PURPLE}\n--------------------------------------------------${RESET}`);
  console.log(`${PURPLE}Suggested Agent(s) : ${agents.join(', ')}${RESET}`);
  console.log(`${PURPLE}Suggested Mode     : ${mode.toUpperCase()}${RESET}`);
  console.log(`${PURPLE}--------------------------------------------------${RESET}`);

  const confirm = await question('Deploy session now? (Y/n): ');
  if (confirm.toLowerCase() === 'n') {
    console.log(`${PURPLE}Launch aborted.${RESET}`);
    return;
  }

  console.log(`${PURPLE}Deploying session for ${agents.join(', ')} in ${mode.toUpperCase()} mode...${RESET}`);
  
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
    console.error(`${RED}Launch failed: ${err.message}${RESET}`);
  }
}

async function handleManualDeploy() {
  console.log(`${PURPLE}\n🚀 [ JULES ] Manual Session Deployment${RESET}`);
  const modeChoice = await question('Select Mode:\n[1] Code Mode (Direct Implementation)\n[2] Review Mode (Audit Only)\nChoice (1-2): ');
  const mode = modeChoice === '2' ? 'review' : 'code';

  console.log(`${PURPLE}\n=== Available Specialized Agents ===${RESET}`);
  console.log(`${PURPLE}Coding Group (Permitted to write/modify code):${RESET}`);
  SPECIALIST_AGENTS.filter(a => a.id <= 24).forEach(a => {
    console.log(`  [${String(a.id).padStart(2)}] ${a.emoji} ${a.name.padEnd(15)} - ${a.desc}`);
  });
  console.log(`${PURPLE}\nDocumentation & Advisory Group (Markdown/Audits only):${RESET}`);
  SPECIALIST_AGENTS.filter(a => a.id > 24).forEach(a => {
    console.log(`  [${String(a.id).padStart(2)}] ${a.emoji} ${a.name.padEnd(15)} - ${a.desc}`);
  });

  const selection = await question('\nSelect Agent(s) by numbers separated by commas (e.g. 1,2,4):\n> ');
  if (!selection.trim()) {
    console.log(`${PURPLE}Selection cannot be empty.${RESET}`);
    return;
  }

  const selectedAgents: string[] = [];
  const parts = selection.split(',');
  for (const part of parts) {
    const num = parseInt(part.trim());
    const matched = SPECIALIST_AGENTS.find(a => a.id === num);
    if (matched) {
      selectedAgents.push(matched.name);
    }
  }

  if (selectedAgents.length === 0) {
    console.log(`${PURPLE}No valid agents selected.${RESET}`);
    return;
  }

  const task = await question('\nEnter task description:\n> ');
  if (!task.trim()) {
    console.log(`${PURPLE}Task description cannot be empty.${RESET}`);
    return;
  }

  console.log(`${PURPLE}\nDeploying session for: ${selectedAgents.join(', ')}...${RESET}`);

  process.argv = [
    process.argv[0],
    process.argv[1],
    '--type', 'review',
    '--agents', selectedAgents.join(','),
    '--task', task,
    '--mode', mode
  ];

  try {
    await deploySession();
  } catch (err: any) {
    console.error(`${RED}Deployment failed: ${err.message}${RESET}`);
  }
}

async function handleAutoProcess() {
  console.log(`${PURPLE}\n⚡ [ JULES ] Auto-Processing Active Sessions...${RESET}`);
  process.argv = [process.argv[0], process.argv[1], '--all'];
  try {
    await autoProcess();
  } catch (err: any) {
    console.error(`${RED}Auto-processing failed: ${err.message}${RESET}`);
  }
}

async function handleInspect() {
  const sessions = loadSessions();
  const completed = sessions.filter(s => s.status === 'completed' || s.status === 'launched' || s.status === 'plan_approved');
  
  if (completed.length === 0) {
    console.log(`${PURPLE}\nNo completed sessions available for inspection.${RESET}`);
    return;
  }

  console.log(`${PURPLE}\n🔍 Available Completed Sessions to Inspect:${RESET}`);
  completed.forEach((s, idx) => {
    console.log(`  [${idx + 1}] ${s.agent} (${s.id.slice(0, 12)}...)`);
  });

  const choice = await question('Select Session Number to Inspect (or enter to cancel):\n> ');
  const idx = parseInt(choice) - 1;
  if (isNaN(idx) || idx < 0 || idx >= completed.length) return;

  const target = completed[idx];
  const targetBranchRes = runGit(['branch', '--show-current']);
  const targetBranch = targetBranchRes.stdout || 'main';

  const apiKey = getApiKey();
  if (!apiKey) {
    console.error(`${RED}Error: JULES_API_KEY not found.${RESET}`);
    return;
  }

  try {
    const ok = await checkSafetyGate({ 'X-Goog-Api-Key': apiKey });
    if (!ok) {
      console.error(`${RED}\n❌ Execution Blocked: Some active sessions are still in progress.${RESET}`);
      console.error(`${RED}Wait until ALL active sessions are COMPLETED to prevent code conflicts.${RESET}`);
      return;
    }

    await inspectSession(target.id, targetBranch, { 'X-Goog-Api-Key': apiKey }, targetBranch);
  } catch (err: any) {
    console.error(`${RED}Inspection failed: ${err.message}${RESET}`);
  }
}

async function handleApproveMerge() {
  const sessions = loadSessions();
  const inspected = sessions.filter(s => s.status === 'inspected');

  if (inspected.length === 0) {
    console.log(`${PURPLE}\nNo inspected sessions ready for final merge.${RESET}`);
    console.log(`${PURPLE}Run Option 5 (Inspect Completed Sessions) first.${RESET}`);
    return;
  }

  console.log(`${PURPLE}\n🌿 Inspected Sessions Ready for Final Merge:${RESET}`);
  inspected.forEach((s, idx) => {
    console.log(`  [${idx + 1}] ${s.agent} (${s.id.slice(0, 12)}...)`);
  });

  const choice = await question('Select Session Number to Merge (or enter to cancel):\n> ');
  const idx = parseInt(choice) - 1;
  if (isNaN(idx) || idx < 0 || idx >= inspected.length) return;

  const target = inspected[idx];
  const targetBranchRes = runGit(['branch', '--show-current']);
  const targetBranch = targetBranchRes.stdout || 'main';

  const apiKey = getApiKey();
  if (!apiKey) {
    console.error(`${RED}Error: JULES_API_KEY not found.${RESET}`);
    return;
  }

  try {
    const ok = await checkSafetyGate({ 'X-Goog-Api-Key': apiKey });
    if (!ok) {
      console.error(`${RED}\n❌ Execution Blocked: Active sessions are in progress.${RESET}`);
      return;
    }

    await approveMerge(target.id, targetBranch, targetBranch);
  } catch (err: any) {
    console.error(`${RED}Merge failed: ${err.message}${RESET}`);
  }
}

async function executeChoice(choice: string) {
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
    console.log(`${PURPLE}\nRunning Setup...${RESET}`);
    runSetup();
  }
}

async function runOpenTUIMenu(): Promise<void> {
  const opentui = await import('@opentui/core');

  const width = process.stdout.columns || 80;
  const height = process.stdout.rows || 24;

  closeRl(); // Ensure stdin is released for OpenTUI

  const renderer = new opentui.CliRenderer(process.stdin, process.stdout, width, height, {
    screenMode: 'main-screen',
    exitOnCtrlC: true
  });

  const select = new opentui.SelectRenderable(renderer, {
    options: [
      { name: '🚀 Deploy Specialist Session (Manual Selection List)', description: 'Select specialists and deploy' },
      { name: '🤖 Auto-Interpret Intent & Deploy (Smart Launch)', description: 'Deploy based on natural language goal' },
      { name: '📊 Check Active Sessions Status (Single-Shot)', description: 'Fetch live state of sessions' },
      { name: '⚡ Auto-Process Active Sessions (Approve & Reply)', description: 'Automatically process plan approval/replies' },
      { name: '🔍 Inspect Completed Sessions (Generate Reports)', description: 'Examine completed session changes' },
      { name: '✅ Approve & Finalize Merge (Integrate Patch)', description: 'Merge completed and inspected session branch' },
      { name: '🔑 Configure / Update API Key', description: 'Configure Google Jules API Key' },
      { name: '⚙️  Workspace Setup / Self-Healing', description: 'Prepare folders and registry index' },
      { name: '🚪 Exit', description: 'Exit console' }
    ],
    width: '100%',
    height: '100%',
    backgroundColor: '#1a1025',
    textColor: '#e0c0ff',
    focusedBackgroundColor: '#502090',
    focusedTextColor: '#ffffff',
    descriptionColor: '#a080d0',
    selectedDescriptionColor: '#ffffff'
  });

  renderer.root.add(select);
  select.focus();

  renderer.keyInput.on('keypress', (keyEvent) => {
    if (keyEvent.ctrl && keyEvent.name === 'c') {
      renderer.destroy();
      process.exit(0);
    }
    select.handleKeyPress(keyEvent);
    renderer.requestRender();
  });

  select.on('itemSelected', async () => {
    const opt = select.getSelectedOption();
    if (!opt) return;

    renderer.destroy();

    const choiceText = opt.name;
    let choice = '9';
    if (choiceText.includes('Deploy Specialist')) choice = '1';
    else if (choiceText.includes('Auto-Interpret')) choice = '2';
    else if (choiceText.includes('Check Active')) choice = '3';
    else if (choiceText.includes('Auto-Process')) choice = '4';
    else if (choiceText.includes('Inspect Completed')) choice = '5';
    else if (choiceText.includes('Approve & Finalize')) choice = '6';
    else if (choiceText.includes('Configure / Update')) choice = '7';
    else if (choiceText.includes('Workspace Setup')) choice = '8';

    await executeChoice(choice);

    if (choice !== '9') {
      setTimeout(() => {
        runOpenTUIMenu().catch((err) => {
          console.warn(`${YELLOW}[ JULES ] OpenTUI error during reload: ${err.message}. Switching to Fallback menu.${RESET}`);
          runFallbackMenu();
        });
      }, 500);
    } else {
      console.log(`${PURPLE}Goodbye!${RESET}`);
      process.exit(0);
    }
  });

  renderer.requestRender();
}

async function runFallbackMenu() {
  while (true) {
    console.log(`${PURPLE}
 ╔═════════════════════════════════════════════════════════════════════════╗
 ║                        SELECT INTERACTIVE ACTION                        ║
 ╠═════════════════════════════════════════════════════════════════════════╣
 ║  [ 1 ] 🚀 Deploy Specialist Session (Manual Selection List)             ║
 ║  [ 2 ] 🤖 Auto-Interpret Intent & Deploy (Smart Launch)                 ║
 ║  [ 3 ] 📊 Check Active Sessions Status (Single-Shot)                    ║
 ║  [ 4 ] ⚡ Auto-Process Active Sessions (Approve & Reply)                ║
 ║  [ 5 ] 🔍 Inspect Completed Sessions (Generate Reports)                 ║
 ║  [ 6 ] ✅ Approve & Finalize Merge (Integrate Patch)                    ║
 ║  [ 7 ] 🔑 Configure / Update API Key                                    ║
 ║  [ 8 ] ⚙️  Workspace Setup / Self-Healing                               ║
 ║  [ 9 ] 🚪 Exit                                                          ║
 ╚═════════════════════════════════════════════════════════════════════════╝${RESET}`);

    const choice = await question('Enter Option (1-9): ');
    if (choice === '9') {
      console.log(`${PURPLE}Goodbye!${RESET}`);
      closeRl();
      process.exit(0);
    } else if (['1', '2', '3', '4', '5', '6', '7', '8'].includes(choice)) {
      await executeChoice(choice);
    } else {
      console.log(`${PURPLE}Invalid option. Please choose 1-9.${RESET}`);
    }
  }
}

export async function main() {
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

  // Try to load OpenTUI; fallback to ANSI box-drawing loop if FFI or module fails
  try {
    await runOpenTUIMenu();
  } catch (err: any) {
    console.log(`${YELLOW}\n[ JULES ] OpenTUI native engine not supported on this platform: ${err.message}.${RESET}`);
    console.log(`${PURPLE}[ JULES ] Falling back to premium ANSI CLI engine.${RESET}`);
    await runFallbackMenu();
  }
}

if (require.main === module) {
  main();
}
