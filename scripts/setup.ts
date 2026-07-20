import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { spawnSync } from 'child_process';

interface SetupResult {
  os: string;
  dependencies: Record<string, boolean>;
  ghAuth: boolean;
  gitIdentityOk: boolean;
  copiedFiles: string[];
  gitignoreUpdated: boolean;
  status: 'SUCCESS' | 'WARNING' | 'ERROR';
}

function checkCommand(cmd: string, osType: string): boolean {
  const checkCmd = osType === 'win32' ? 'where' : 'which';
  try {
    const res = spawnSync(checkCmd, [cmd], { encoding: 'utf8' });
    return res.status === 0;
  } catch {
    return false;
  }
}

function checkGhAuth(): boolean {
  try {
    const res = spawnSync('gh', ['auth', 'status'], { encoding: 'utf8' });
    return res.status === 0;
  } catch {
    return false;
  }
}

function ensureGitIdentity(): boolean {
  try {
    const gitCheck = spawnSync('git', ['rev-parse', '--is-inside-work-tree'], { encoding: 'utf8' });
    if (gitCheck.status !== 0) {
      console.log('  - Git Identity: Skipped (Not inside a Git repository)');
      return true;
    }

    const nameRes = spawnSync('git', ['config', 'user.name'], { encoding: 'utf8' });
    const emailRes = spawnSync('git', ['config', 'user.email'], { encoding: 'utf8' });

    if (nameRes.status !== 0 || !nameRes.stdout.trim() || emailRes.status !== 0 || !emailRes.stdout.trim()) {
      console.log('  - Git Identity: Configuring local fallback identity...');
      const setLocalName = spawnSync('git', ['config', '--local', 'user.name', 'Jules Companion'], { encoding: 'utf8' });
      const setLocalEmail = spawnSync('git', ['config', '--local', 'user.email', 'agent@jules.local'], { encoding: 'utf8' });
      return setLocalName.status === 0 && setLocalEmail.status === 0;
    }
    
    console.log('  - Git Identity: Verified ✓');
    return true;
  } catch (err: any) {
    console.warn(`  - Git Identity: Failed to check/set: ${err.message}`);
    return false;
  }
}

export function runSetup(targetDir: string = process.cwd()): SetupResult {
  console.log('=== Jules-Companion Self-Healing Environment Setup ===');
  
  const osType = process.platform;
  console.log(`OS Detected: ${osType} (${process.arch})`);

  // 1. Dependency checks
  const deps = ['git', 'gh', 'node', 'jules'];
  const depStatus: Record<string, boolean> = {};

  for (const dep of deps) {
    depStatus[dep] = checkCommand(dep, osType);
    const icon = depStatus[dep] ? '✓' : '⚠️ Missing';
    console.log(`  - ${dep.padEnd(10)}: ${icon}`);
  }

  // 2. Auth & Identity checks
  console.log('Checking Authentication & Git Identity...');
  const ghAuth = checkGhAuth();
  console.log(`  - GitHub Auth : ${ghAuth ? 'Logged In ✓' : '⚠️ Not Logged In'}`);
  
  const gitIdentityOk = ensureGitIdentity();

  // 3. Directory structure creation
  const julesLocalDir = path.join(targetDir, '.jules-companion');
  const refLocalDir = path.join(julesLocalDir, 'references');
  const agentsLocalDir = path.join(refLocalDir, 'agents');
  const scratchLocalDir = path.join(julesLocalDir, 'scratch');
  const docsReviewsDir = path.join(targetDir, 'docs', 'jules-reviews');

  [julesLocalDir, refLocalDir, agentsLocalDir, scratchLocalDir, docsReviewsDir].forEach(dir => {
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
      const dest = path.join(refLocalDir, file);
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
        const dest = path.join(agentsLocalDir, af);
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

  // 6. Initialize config.json & sessions.json if missing
  const configPath = path.join(julesLocalDir, 'config.json');
  if (!fs.existsSync(configPath)) {
    fs.writeFileSync(configPath, JSON.stringify({
      os: osType,
      created: new Date().toISOString(),
      version: "1.0.0"
    }, null, 2), 'utf8');
  }

  const sessionsPath = path.join(julesLocalDir, 'sessions.json');
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
  runSetup();
}
