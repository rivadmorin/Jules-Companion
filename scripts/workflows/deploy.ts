/**
 * Core deployment workflow for launching Google Jules sessions.
 * @module workflows/deploy
 */

import * as fs from 'fs';
import * as path from 'path';
import { request, getApiKey } from '../client/http';
import { JulesSource, SessionRecord } from '../core/types';
import { getProjectDirs, runGit, loadSessions, saveSessions, getFormattedDateDDMMYYYY } from '../utils';

/**
 * Options required to execute a session deployment.
 */
export interface DeployOptions {
  /** Session execution type */
  type: 'interactive' | 'review' | 'start';
  /** Comma-separated or array of agent names */
  agents: string | string[];
  /** Detailed task prompt or instructions */
  task: string;
  /** Execution mode: code implementation vs review-only */
  mode?: 'code' | 'review';
  /** Git branch to branch from */
  branch?: string;
  /** Root project directory */
  targetDir?: string;
}

/**
 * Validates a list of agent names against the registry.
 *
 * @param agentsStr - Comma-separated string of agent names.
 * @param registryPath - Path to registry.json.
 * @returns Array of invalid agent names found.
 */
export function validateAgents(agentsStr: string, registryPath: string): string[] {
  if (!fs.existsSync(registryPath)) return [];
  try {
    const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
    const inputAgents = agentsStr.split(',').map(a => a.trim().toLowerCase());
    return inputAgents.filter(a => !registry.agents[a]);
  } catch {
    return [];
  }
}

/**
 * Determines the currently active local Git branch name.
 *
 * @param targetDir - Directory path to execute git within.
 * @returns Active branch name or 'main' fallback.
 */
export function getCurrentBranch(targetDir?: string): string {
  const res = runGit(['branch', '--show-current'], targetDir);
  return res.success && res.stdout ? res.stdout : 'main';
}

/**
 * Extracts the `owner/repository` GitHub slug from remote origin URL.
 *
 * @param targetDir - Directory path to execute git within.
 * @returns Repository slug or null.
 */
export function getGitRemoteRepo(targetDir?: string): string | null {
  const res = runGit(['config', '--get', 'remote.origin.url'], targetDir);
  if (!res.success) return null;
  const url = res.stdout;
  const match = url.match(/github\.com[/:]([^/]+)\/([^.]+)/);
  if (match) {
    return `${match[1]}/${match[2]}`.replace(/\.git$/, '');
  }
  return null;
}
