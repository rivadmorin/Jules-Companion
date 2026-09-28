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
    refDir: path.join(julesDir, 'references'),
    agentsDir: path.join(julesDir, 'references', 'agents'),
    scratchDir: path.join(julesDir, 'scratch'),
    docsReviewsDir: path.join(targetDir, 'docs', 'jules-reviews'),
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
  } finally {
    if (fs.existsSync(tempFile)) {
      try {
        fs.unlinkSync(tempFile);
      } catch (_ignored) {}
    }
  }
}

/**
 * Purges leftover scratch, diff, and patch files associated with a specific session ID.
 * Removes files from `.jules-companion/diffs/` and `.jules-companion/scratch/` to prevent repository clutter.
 *
 * @param sessionId - Unique identifier of the session whose scratch files should be purged.
 * @param targetDir - The root project directory containing the `.jules-companion` folder.
 * @returns An array of absolute file/directory paths that were deleted.
 */
export function cleanSessionScratch(sessionId: string, targetDir: string = process.cwd()): string[] {
  if (!sessionId || !sessionId.trim()) return [];
  const dirs = getProjectDirs(targetDir);
  const deleted: string[] = [];
  const cleanId = sessionId.trim();
  const shortId = cleanId.length >= 6 ? cleanId.slice(0, 8) : cleanId;

  const candidateDirs = [
    dirs.scratchDir,
    path.join(dirs.julesDir, 'diffs')
  ];

  for (const cDir of candidateDirs) {
    if (!fs.existsSync(cDir)) continue;

    try {
      const entries = fs.readdirSync(cDir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(cDir, entry.name);
        // Match exact or prefix/suffix patterns:
        // e.g. session-12345678.diff, 12345678.diff, 12345678.patch, or any file containing cleanId/shortId
        const matches = entry.name.includes(cleanId) || (shortId.length >= 6 && entry.name.includes(shortId));
        if (matches) {
          try {
            if (entry.isDirectory()) {
              fs.rmSync(fullPath, { recursive: true, force: true });
            } else {
              fs.unlinkSync(fullPath);
            }
            deleted.push(fullPath);
          } catch (_e) {}
        }
      }
    } catch (_e) {}
  }

  // Also clean visual_diff subfolder specifically: .jules-companion/scratch/visual_diff/<sessionId>
  const visualDiffDir = path.join(dirs.scratchDir, 'visual_diff');
  if (fs.existsSync(visualDiffDir)) {
    for (const id of [cleanId, shortId]) {
      const vSessionPath = path.join(visualDiffDir, id);
      if (fs.existsSync(vSessionPath)) {
        try {
          fs.rmSync(vSessionPath, { recursive: true, force: true });
          deleted.push(vSessionPath);
        } catch (_e) {}
      }
    }
    try {
      const remaining = fs.readdirSync(visualDiffDir);
      if (remaining.length === 0) {
        fs.rmdirSync(visualDiffDir);
      }
    } catch (_e) {}
  }

  // If diffs directory is now empty, remove it to keep workspace clean
  const diffsDir = path.join(dirs.julesDir, 'diffs');
  if (fs.existsSync(diffsDir)) {
    try {
      const remaining = fs.readdirSync(diffsDir);
      if (remaining.length === 0) {
        fs.rmdirSync(diffsDir);
      }
    } catch (_e) {}
  }

  return deleted;
}

