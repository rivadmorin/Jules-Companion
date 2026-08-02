import * as fs from 'fs';
import * as path from 'path';
import { spawnSync } from 'child_process';

export interface ProjectDirs {
  targetDir: string;
  julesDir: string;
  refDir: string;
  agentsDir: string;
  scratchDir: string;
  docsReviewsDir: string;
}

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
  const res = spawnSync('git', args, { encoding: 'utf8', cwd });
  return {
    success: res.status === 0,
    stdout: res.stdout ? res.stdout.trim() : '',
    stderr: res.stderr ? res.stderr.trim() : ''
  };
}

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
