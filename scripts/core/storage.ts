/**
 * Storage and directory resolution primitives for Jules Companion.
 * @module core/storage
 */

import * as fs from 'fs';
import * as path from 'path';
import { ProjectDirs, SessionRecord } from './types';

/**
 * Global memory cache for resolved project directories to avoid redundant path calculations.
 */
const projectDirsCache = new Map<string, ProjectDirs>();

/**
 * Resolves standard directory paths used by the jules-companion ecosystem.
 * Centralizes path management to ensure consistency across different scripts.
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
    companionDir: julesDir,
    refDir: path.join(julesDir, 'references'),
    agentsDir: path.join(julesDir, 'references', 'agents'),
    scratchDir: path.join(julesDir, 'scratch'),
    docsReviewsDir: path.join(targetDir, 'docs', 'jules-reviews'),
    reviewsDir: path.join(targetDir, 'docs', 'jules-reviews'),
    sessionsFile: path.join(julesDir, 'sessions.json'),
    configFile: path.join(julesDir, 'config.json')
  };
  projectDirsCache.set(targetDir, dirs);
  return dirs;
}

/**
 * Loads the active and historical Jules session records from the local state file.
 *
 * @param targetDir - The root project directory containing the `.jules-companion` folder.
 * @returns An array of parsed SessionRecord objects.
 */
export function loadSessions(targetDir: string = process.cwd()): SessionRecord[] {
  const dirs = getProjectDirs(targetDir);
  const sessionFile = path.join(dirs.julesDir, 'sessions.json');
  if (!fs.existsSync(sessionFile)) {
    return [];
  }
  try {
    const content = fs.readFileSync(sessionFile, 'utf8');
    return JSON.parse(content) as SessionRecord[];
  } catch (_err) {
    return [];
  }
}

/**
 * Atomically writes an updated array of session records to the local state file.
 *
 * @param sessions - An array of updated SessionRecord objects to persist.
 * @param targetDir - The root project directory containing the `.jules-companion` folder.
 */
export function saveSessions(sessions: SessionRecord[], targetDir: string = process.cwd()): void {
  const dirs = getProjectDirs(targetDir);
  if (!fs.existsSync(dirs.julesDir)) {
    fs.mkdirSync(dirs.julesDir, { recursive: true });
  }
  const sessionFile = path.join(dirs.julesDir, 'sessions.json');
  const tempFile = `${sessionFile}.tmp.${Date.now()}`;
  fs.writeFileSync(tempFile, JSON.stringify(sessions, null, 2), 'utf8');
  try {
    fs.renameSync(tempFile, sessionFile);
  } catch (_e) {
    fs.writeFileSync(sessionFile, JSON.stringify(sessions, null, 2), 'utf8');
  }
}
