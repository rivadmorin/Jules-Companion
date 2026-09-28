/**
 * Common utility and shared orchestration functions for Jules Companion.
 * @module utils
 */

import * as fs from 'fs';
import * as path from 'path';
import { spawnSync } from 'child_process';
import { runGit, GitExecutionResult } from './core/git';
import { getProjectDirs, loadSessions, saveSessions } from './core/storage';
import { ProjectDirs, SessionRecord } from './core/types';

export {
  ProjectDirs,
  SessionRecord,
  GitExecutionResult,
  runGit,
  getProjectDirs,
  loadSessions,
  saveSessions
};

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

      if (value && !value.startsWith('--')) {
        params[key] = value;
        i++;
      } else {
        params[key] = true;
      }
    }
  }
  return params;
}

/**
 * Returns the provided date (or current date) formatted as DD-MM-YYYY.
 * e.g., 03-08-2026
 *
 * @param date - Optional Date object (defaults to current system date)
 * @returns Formatted date string in DD-MM-YYYY format
 */
export function getFormattedDateDDMMYYYY(date: Date = new Date()): string {
  return `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`;
}

/**
 * Determines whether a session status represents an active/running/in-progress task.
 *
 * @param status - The raw session status string.
 * @returns True if the session is currently active or queued.
 */
export function isSessionActive(status?: string): boolean {
  if (!status) return false;
  const s = status.trim().toLowerCase();
  return (
    s === 'active' ||
    s === 'running' ||
    s === 'pending' ||
    s === 'in_progress' ||
    s === 'in-progress' ||
    s === 'queued' ||
    s === 'starting' ||
    s === 'planning' ||
    s === 'launched' ||
    s === 'awaiting_plan_approval' ||
    s.includes('awaiting')
  );
}

/**
 * Determines whether a session status represents a successful completion terminal state.
 *
 * @param status - The raw session status string.
 * @returns True if the session is completed or succeeded.
 */
export function isSessionCompleted(status?: string): boolean {
  if (!status) return false;
  const s = status.trim().toLowerCase();
  return s === 'completed' || s === 'succeeded' || s === 'merged' || s === 'success' || s === 'done';
}

/**
 * Determines whether a session status represents a failed, error, or cancelled terminal state.
 *
 * @param status - The raw session status string.
 * @returns True if the session failed or was cancelled.
 */
export function isSessionFailed(status?: string): boolean {
  if (!status) return false;
  const s = status.trim().toLowerCase();
  return s === 'failed' || s === 'error' || s === 'rejected' || s === 'cancelled' || s === 'canceled';
}

/**
 * Determines whether a session is currently awaiting user plan authorization.
 *
 * @param status - The raw session status string.
 * @returns True if the session is awaiting plan approval.
 */
export function isSessionAwaitingApproval(status?: string): boolean {
  if (!status) return false;
  const s = status.trim().toLowerCase();
  return s.includes('awaiting') || s.includes('plan');
}

/**
 * Archives a session locally, moving it to the archived sessions collection.
 *
 * @param sessionId - Unique identifier of the session to archive.
 * @param targetDir - Optional workspace root directory path.
 * @returns Object indicating success and notification message.
 */
export function archiveSession(
  sessionId: string,
  targetDir: string = process.cwd()
): { success: boolean; message: string } {
  const sessions = loadSessions(targetDir);
  let found = false;
  const updated = sessions.map(s => {
    if (s.id === sessionId) {
      found = true;
      return { ...s, archived: true };
    }
    return s;
  });
  if (found) {
    saveSessions(updated, targetDir);
  }
  return {
    success: found,
    message: found ? `Session #${sessionId} archived.` : `Session #${sessionId} not found.`
  };
}

/**
 * Restores an archived session back to the active sessions collection.
 *
 * @param sessionId - Unique identifier of the session to unarchive.
 * @param targetDir - Optional workspace root directory path.
 * @returns Object indicating success and notification message.
 */
export function unarchiveSession(
  sessionId: string,
  targetDir: string = process.cwd()
): { success: boolean; message: string } {
  const sessions = loadSessions(targetDir);
  let found = false;
  const updated = sessions.map(s => {
    if (s.id === sessionId) {
      found = true;
      return { ...s, archived: false };
    }
    return s;
  });
  if (found) {
    saveSessions(updated, targetDir);
  }
  return {
    success: found,
    message: found ? `Session #${sessionId} restored from archive.` : `Session #${sessionId} not found.`
  };
}


/**
 * Runs comprehensive diagnostic environment integrity checks.
 *
 * @param targetDir - Target project directory path (defaults to current working directory).
 * @returns Diagnostic check results mapping status strings.
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
 * @param agentName - The specialized agent identifier (e.g. 'annotator').
 * @param targetDir - Target project directory path (defaults to current working directory).
 * @returns The raw markdown contents of the agent journal.
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
 * @param targetDir - Target project directory path (defaults to current working directory).
 * @returns List of review report metadata.
 */
export function getReviewReports(
  targetDir: string = process.cwd()
): Array<{ fileName: string; path: string; sizeBytes: number }> {
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
 * @param name - The lowercase unique identifier for the custom agent.
 * @param role - The human-readable title/role description.
 * @param directives - The core directives and execution instructions.
 * @param boundariesDo - List of allowed actions (Always do).
 * @param boundariesDont - List of forbidden actions (Never do).
 * @param targetDir - Target project directory path (defaults to current working directory).
 * @returns Object containing the path to the newly created agent template.
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
