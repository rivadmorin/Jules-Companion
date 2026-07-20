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

export function getProjectDirs(targetDir: string = process.cwd()): ProjectDirs {
  const julesDir = path.join(targetDir, '.jules-companion');
  return {
    targetDir,
    julesDir,
    refDir: path.join(julesDir, 'references'),
    agentsDir: path.join(julesDir, 'references', 'agents'),
    scratchDir: path.join(julesDir, 'scratch'),
    docsReviewsDir: path.join(targetDir, 'docs', 'jules-reviews')
  };
}

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

export function saveSessions(sessions: SessionRecord[], targetDir: string = process.cwd()): void {
  const dirs = getProjectDirs(targetDir);
  const sessionsPath = path.join(dirs.julesDir, 'sessions.json');
  fs.mkdirSync(dirs.julesDir, { recursive: true });
  fs.writeFileSync(sessionsPath, JSON.stringify(sessions, null, 2), 'utf8');
}
