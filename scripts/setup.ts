import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { spawnSync, exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);
import { getProjectDirs } from './utils';
import { generateRegistry } from './generate_registry';

interface SetupResult {
  os: string;
  dependencies: Record<string, boolean>;
  ghAuth: boolean;
  gitIdentityOk: boolean;
  copiedFiles: string[];
  gitignoreUpdated: boolean;
  status: 'SUCCESS' | 'WARNING' | 'ERROR';
}

/**
 * Checks if a specific CLI command exists and is executable in the current environment.
 *
 * @param {string} cmd - The command to check (e.g., 'git', 'gh').
 * @param {string} osType - The operating system platform identifier (e.g., 'win32', 'linux').
 * @returns {Promise<boolean>} True if the command is available, false otherwise.
 */
async function checkCommand(cmd: string, osType: string): Promise<boolean> {
  const checkCmd = osType === 'win32' ? 'where' : 'which';
  try {
    await execAsync(`${checkCmd} ${cmd}`);
    return true;
  } catch {
    return false;
  }
}

/**
 * Verifies if the GitHub CLI (gh) is authenticated.
 *
 * @returns {Promise<boolean>} True if authenticated, false otherwise.
 */
async function checkGhAuth(): Promise<boolean> {
  try {
    await execAsync('gh auth status');
    return true;
  } catch {
    return false;
  }
}

/**
 * Ensures that a Git user identity (name and email) is configured.
 * Sets a local fallback identity if missing and the context is within a Git repository.
 *
 * @returns {Promise<boolean>} True if identity is verified or successfully configured, false on failure.
 */
async function ensureGitIdentity(): Promise<boolean> {
  try {
    try { await execAsync('git rev-parse --is-inside-work-tree'); } catch {
      console.log('  - Git Identity: Skipped (Not inside a Git repository)');
      return true;
    }

    const checkName = execAsync('git config user.name').catch(() => null);
    const checkEmail = execAsync('git config user.email').catch(() => null);
    const [nameRes, emailRes] = await Promise.all([checkName, checkEmail]);

    if (!nameRes || !nameRes.stdout.trim() || !emailRes || !emailRes.stdout.trim()) {
      console.log('  - Git Identity: Configuring local fallback identity...');
      const setLocalName = execAsync('git config --local user.name "Jules Companion"');
      const setLocalEmail = execAsync('git config --local user.email "agent@jules.local"');
      await Promise.all([setLocalName, setLocalEmail]);
      return true;
    }

    console.log('  - Git Identity: Verified ✓');
    return true;
  } catch (err: any) {
    console.warn(`  - Git Identity: Failed to check/set: ${err.message}`);
    return false;
  }
}

/**
 * Executes the self-healing environment setup process for Jules Companion.
 * Validates dependencies, ensures directory structures, syncs reference files, and generates the agent registry.
 *
 * @param {string} targetDir - The root project directory to set up (defaults to process.cwd()).
 * @returns {Promise<SetupResult>} An object containing the setup status and verification results.
 */
export async function runSetup(targetDir: string = process.cwd()): Promise<SetupResult> {
  console.log('=== Jules-Companion Self-Healing Environment Setup ===');

  const osType = process.platform;
  console.log(`OS Detected: ${osType} (${process.arch})`);

  // 1. Dependency checks
  const deps = ['git', 'gh', 'node', 'jules'];
  const depStatus: Record<string, boolean> = {};

  const depChecks = deps.map(async (dep) => {
    const ok = await checkCommand(dep, osType);
    return { dep, ok };
  });
  const results = await Promise.all(depChecks);

  for (const { dep, ok } of results) {
    depStatus[dep] = ok;
    const icon = ok ? '✓' : '⚠️ Missing';
    console.log(`  - ${dep.padEnd(10)}: ${icon}`);
  }

  // 2. Auth & Identity checks
  console.log('Checking Authentication & Git Identity...');
  const [ghAuth, gitIdentityOk] = await Promise.all([checkGhAuth(), ensureGitIdentity()]);
  console.log(`  - GitHub Auth : ${ghAuth ? 'Logged In ✓' : '⚠️ Not Logged In'}`);


  // 3. Project directories setup via utils
  const dirs = getProjectDirs(targetDir);
  const docsReportsDir = path.join(targetDir, 'docs', 'jules-reports');
  [dirs.julesDir, dirs.refDir, dirs.agentsDir, dirs.scratchDir, dirs.docsReviewsDir, docsReportsDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  // 4. Find source references directory (Global or Local Package root)
  const homeDir = os.homedir();
  const candidateGlobalRoots = [
    path.join(homeDir, '.gemini', 'config', 'skills', 'jules-companion'),
    path.join(__dirname, '..')
  ];

  let sourceRefDir: string | null = null;
  for (const root of candidateGlobalRoots) {
    const p = path.join(root, 'references');
    if (fs.existsSync(p)) {
      sourceRefDir = p;
      break;
    }
  }

  const copiedFiles: string[] = [];

  if (sourceRefDir) {
    // Copy top-level reference files
    const filesToCopy = ['jules-cli.md', 'jules-api.md', 'prompt-templates.md'];
    for (const file of filesToCopy) {
      const src = path.join(sourceRefDir, file);
      const dest = path.join(dirs.refDir, file);
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
        copiedFiles.push(file);
      }
    }

    // Copy agent templates & registry
    const sourceAgentsDir = path.join(sourceRefDir, 'agents');
    if (fs.existsSync(sourceAgentsDir)) {
      const agentFiles = fs.readdirSync(sourceAgentsDir);
      for (const af of agentFiles) {
        const src = path.join(sourceAgentsDir, af);
        const dest = path.join(dirs.agentsDir, af);
        if (fs.statSync(src).isFile()) {
          fs.copyFileSync(src, dest);
          copiedFiles.push(`agents/${af}`);
        }
      }
    }
    console.log(`Self-healing copy completed: ${copiedFiles.length} reference files synchronized.`);
  } else {
    console.warn('Warning: Global reference templates not found for self-healing copy.');
  }

  // 5. Update .gitignore
  let gitignoreUpdated = false;
  const gitignorePath = path.join(targetDir, '.gitignore');
  const entry = '.jules-companion/';

  let gitignoreContent = '';
  if (fs.existsSync(gitignorePath)) {
    gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
  }

  if (!gitignoreContent.includes(entry)) {
    const prefix = gitignoreContent && !gitignoreContent.endsWith('\n') ? '\n' : '';
    fs.writeFileSync(gitignorePath, `${gitignoreContent}${prefix}${entry}\n`, 'utf8');
    gitignoreUpdated = true;
    console.log('Added .jules-companion/ to .gitignore.');
  } else {
    console.log('.jules-companion/ is already present in .gitignore.');
  }

  // 6. Synchronize/Generate Registry
  try {
    await generateRegistry();
  } catch (err: any) {
    console.warn(`Warning: Could not auto-generate registry during setup: ${err.message}`);
  }

  // 7. Initialize config.json & sessions.json if missing
  const configPath = path.join(dirs.julesDir, 'config.json');
  if (!fs.existsSync(configPath)) {
    fs.writeFileSync(configPath, JSON.stringify({
      os: osType,
      created: new Date().toISOString(),
      version: "1.0.0"
    }, null, 2), 'utf8');
  }

  const sessionsPath = path.join(dirs.julesDir, 'sessions.json');
  if (!fs.existsSync(sessionsPath)) {
    fs.writeFileSync(sessionsPath, JSON.stringify([], null, 2), 'utf8');
  }

  const allCriticalDepsOk = depStatus['git'] && depStatus['gh'] && gitIdentityOk;
  const status: SetupResult['status'] = allCriticalDepsOk ? 'SUCCESS' : 'WARNING';

  console.log(`\nSetup completed with status: [${status}]`);
  return {
    os: osType,
    dependencies: depStatus,
    ghAuth,
    gitIdentityOk,
    copiedFiles,
    gitignoreUpdated,
    status
  };
}

if (require.main === module) {
  runSetup().catch(err => console.error(err));
}
