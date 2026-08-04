import * as fs from 'fs';
import * as path from 'path';
import { spawnSync } from 'child_process';

/**
 * Defines the standard directory structure required by the jules-companion ecosystem.
 * All paths are represented as absolute string paths.
 */
export interface ProjectDirs {
  /** The root directory of the user's target project. */
  targetDir: string;
  /** The root companion directory, typically `.jules-companion` within the target project. */
  julesDir: string;
  /** Directory containing general reference materials and guidelines. */
  refDir: string;
  /** Directory containing specialized agent definitions and prompt templates. */
  agentsDir: string;
  /** Temporary scratchpad directory for agent execution artifacts. */
  scratchDir: string;
  /** Directory for storing generated reviews within the target project's documentation folder. */
  docsReviewsDir: string;
}

/**
 * Global memory cache for resolved project directories to avoid redundant path calculations.
 * Keyed by the absolute target directory path.
 *
 * @type {Map<string, ProjectDirs>}
 */
const projectDirsCache = new Map<string, ProjectDirs>();

/**
 * Resolves and caches standard directory paths used by the jules-companion ecosystem.
 * This centralizes path management to ensure consistency across different scripts.
 *
 * @param targetDir - The root directory of the user's project (defaults to current working directory).
 * @returns An object containing absolute paths for various internal companion directories.
 */
export function getProjectDirs(targetDir: string = process.cwd()): ProjectDirs {
  if (projectDirsCache.has(targetDir)) {
    return projectDirsCache.get(targetDir)!;
  }
  const julesDir = path.join(targetDir, '.jules-companion');
  const dirs: ProjectDirs = {
    targetDir,
    julesDir,
    refDir: path.join(julesDir, 'references'),
    agentsDir: path.join(julesDir, 'references', 'agents'),
    scratchDir: path.join(julesDir, 'scratch'),
    docsReviewsDir: path.join(targetDir, 'docs', 'jules-reviews')
  };
  projectDirsCache.set(targetDir, dirs);
  return dirs;
}

/**
 * Parses command-line arguments into a key-value dictionary.
 * Supports boolean flags (e.g., `--all`) and key-value pairs (e.g., `--session 123`).
 *
 * @param args - An array of raw string arguments (typically process.argv.slice(2)).
 * @returns A dictionary where keys are argument names (without '--') and values are either strings or booleans.
 */
export function parseArgs(args: string[]): Record<string, string | boolean> {
  const params: Record<string, string | boolean> = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      const value = args[i + 1];

      // If the next argument exists and is not another flag, treat it as the value for the current key.
      if (value && !value.startsWith('--')) {
        params[key] = value;
        // Skip the next argument in the loop since it was consumed as a value.
        i++;
      } else {
        // If there is no next argument, or the next argument is another flag, treat the current key as a boolean flag.
        params[key] = true;
      }
    }
  }
  return params;
}

/**
 * Executes a Git command synchronously and returns the structured output.
 *
 * @param args - An array of git command arguments (e.g., ['branch', '--show-current']).
 * @param cwd - The working directory to execute the command in (defaults to current working directory).
 * @returns An object containing the success status, standard output, and standard error.
 */
export function runGit(args: string[], cwd: string = process.cwd()): { success: boolean; stdout: string; stderr: string } {
  const resolvedCwd = path.resolve(cwd);
  const res = spawnSync('git', args, { encoding: 'utf8', cwd: resolvedCwd });
  return {
    success: res.status === 0,
    stdout: res.stdout ? res.stdout.trim() : '',
    stderr: res.stderr ? res.stderr.trim() : ''
  };
}

/**
 * Represents a stored session record tracking agent operational metadata and status.
 */
export interface SessionRecord {
  id: string;
  agent: string;
  mode: 'code' | 'review';
  task: string;
  status: string;
  timestamp: string;
}

/**
 * Loads the active and historical Jules session records from the local state file.
 * Fails gracefully by returning an empty array if the file doesn't exist or is corrupted.
 *
 * @param targetDir - The root project directory containing the `.jules-companion` folder.
 * @returns An array of parsed SessionRecord objects.
 */
export function loadSessions(targetDir: string = process.cwd()): SessionRecord[] {
  const dirs = getProjectDirs(targetDir);
  const sessionsPath = path.join(dirs.julesDir, 'sessions.json');
  if (!fs.existsSync(sessionsPath)) return [];
  try {
    const data = JSON.parse(fs.readFileSync(sessionsPath, 'utf8'));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

/**
 * Persists an array of session records to the local state file.
 * Creates the `.jules-companion` directory if it does not already exist.
 *
 * @param sessions - The array of SessionRecord objects to save.
 * @param targetDir - The root project directory containing the `.jules-companion` folder.
 */
export function saveSessions(sessions: SessionRecord[], targetDir: string = process.cwd()): void {
  const dirs = getProjectDirs(targetDir);
  const sessionsPath = path.join(dirs.julesDir, 'sessions.json');
  fs.mkdirSync(dirs.julesDir, { recursive: true });
  fs.writeFileSync(sessionsPath, JSON.stringify(sessions, null, 2), 'utf8');
}

/**
 * Returns the provided date (or current date) formatted as DD-MM-YYYY.
 * e.g., 03-08-2026
 *
 * @param date - Optional Date object (defaults to current system date)
 * @returns Formatted date string in DD-MM-YYYY format
 */
export function getFormattedDateDDMMYYYY(date: Date = new Date()): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

/**
 * Runs comprehensive diagnostic environment integrity checks.
 *
 * @param {string} [targetDir=process.cwd()] - Target project directory path.
 * @returns {{ ok: boolean; checks: Record<string, string> }} Diagnostic check results mapping status strings.
 */
export function runDoctorChecks(targetDir: string = process.cwd()): { ok: boolean; checks: Record<string, string> } {
  const checks: Record<string, string> = {};
  let ok = true;

  // 1. Check Git remote origin configuration
  const gitRes = runGit(['config', '--get', 'remote.origin.url'], targetDir);
  if (gitRes.success && gitRes.stdout) {
    checks['git_remote'] = `OK: ${gitRes.stdout}`;
  } else {
    checks['git_remote'] = 'FAIL: No git remote origin URL configured';
    ok = false;
  }

  // 2. Check GitHub CLI (gh) availability
  const ghRes = spawnSync('gh', ['--version'], { encoding: 'utf8' });
  if (ghRes.status === 0) {
    checks['gh_cli'] = `OK: ${ghRes.stdout.split('\n')[0]}`;
  } else {
    checks['gh_cli'] = 'WARN: GitHub CLI (gh) not installed or not in PATH';
  }

  // 3. Check Node.js version
  checks['node_version'] = `OK: ${process.version}`;

  // 4. Check JULES_API_KEY presence in environment or local .env
  const envPath = path.join(targetDir, '.env');
  const companionEnvPath = path.join(targetDir, '.jules-companion', '.env');
  const hasEnvKey = !!process.env.JULES_API_KEY || fs.existsSync(envPath) || fs.existsSync(companionEnvPath);
  if (hasEnvKey) {
    checks['api_key'] = 'OK: JULES_API_KEY configured';
  } else {
    checks['api_key'] = 'FAIL: JULES_API_KEY missing in environment or .env file';
    ok = false;
  }

  return { ok, checks };
}

/**
 * Reads critical learnings logged in `.jules/<agentName>.md`.
 *
 * @param {string} agentName - The specialized agent identifier (e.g. 'annotator').
 * @param {string} [targetDir=process.cwd()] - Target project directory path.
 * @returns {string} The raw markdown contents of the agent journal.
 */
export function readAgentJournal(agentName: string, targetDir: string = process.cwd()): string {
  const journalPath = path.join(targetDir, '.jules', `${agentName.toLowerCase()}.md`);
  if (!fs.existsSync(journalPath)) {
    return `# ${agentName} Journal\n\nNo critical learnings logged yet.`;
  }
  return fs.readFileSync(journalPath, 'utf8');
}

/**
 * Scans `docs/jules-reviews/` for markdown review reports generated by agents in review mode.
 *
 * @param {string} [targetDir=process.cwd()] - Target project directory path.
 * @returns {Array<{ fileName: string; path: string; sizeBytes: number }>} List of review report metadata.
 */
export function getReviewReports(targetDir: string = process.cwd()): Array<{ fileName: string; path: string; sizeBytes: number }> {
  const reviewsDir = path.join(targetDir, 'docs', 'jules-reviews');
  if (!fs.existsSync(reviewsDir)) return [];
  const files = fs.readdirSync(reviewsDir);
  return files
    .filter(f => f.endsWith('.md'))
    .map(f => {
      const fullPath = path.join(reviewsDir, f);
      const stat = fs.statSync(fullPath);
      return {
        fileName: f,
        path: fullPath,
        sizeBytes: stat.size
      };
    });
}

/**
 * Programmatically scaffolds a new custom specialized agent template file and updates `registry.json`.
 *
 * @param {string} name - The lowercase unique identifier for the custom agent.
 * @param {string} role - The human-readable title/role description.
 * @param {string} directives - The core directives and execution instructions.
 * @param {string[]} boundariesDo - List of allowed actions (Always do).
 * @param {string[]} boundariesDont - List of forbidden actions (Never do).
 * @param {string} [targetDir=process.cwd()] - Target project directory path.
 * @returns {{ agentFile: string }} Object containing the path to the newly created agent template.
 */
export function createCustomAgentScaffold(
  name: string,
  role: string,
  directives: string,
  boundariesDo: string[],
  boundariesDont: string[],
  targetDir: string = process.cwd()
): { agentFile: string } {
  const dirs = getProjectDirs(targetDir);
  const normalizedName = name.toLowerCase().trim();
  const agentFilePath = path.join(dirs.agentsDir, `${normalizedName}.md`);
  fs.mkdirSync(dirs.agentsDir, { recursive: true });

  const dosText = boundariesDo.map(d => `- ${d}`).join('\n');
  const dontsText = boundariesDont.map(d => `- ${d}`).join('\n');

  const content = `You are "${role}" 🤖 - a specialized agent for Jules Companion.

## Core Directives
${directives}

## Boundaries

✅ **Always do:**
${dosText}

🚫 **Never do:**
${dontsText}

## Daily Process
1. Analyze target source files.
2. Execute instructions cleanly.
3. Validate output before presentation.
`;

  fs.writeFileSync(agentFilePath, content, 'utf8');

  // Update local registry.json if exists
  const registryPath = path.join(dirs.agentsDir, 'registry.json');
  if (fs.existsSync(registryPath)) {
    try {
      const reg = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
      if (!reg.agents) reg.agents = {};
      reg.agents[normalizedName] = {
        name: role,
        group: 'Coding',
        description: directives.slice(0, 100)
      };
      fs.writeFileSync(registryPath, JSON.stringify(reg, null, 2), 'utf8');
    } catch (_) {}
  }

  return { agentFile: agentFilePath };
}

