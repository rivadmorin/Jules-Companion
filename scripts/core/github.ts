/**
 * GitHub API integration and CLI primitives for Jules Companion.
 * @module core/github
 * @description Provides zero-dependency GitHub REST API operations and gh CLI fallbacks.
 */

import * as fs from 'fs';
import * as path from 'path';
import { spawnSync } from 'child_process';
import { GitExecutionResult } from './git';

/**
 * Options for creating a GitHub Pull Request.
 */
export interface GitHubPRCreateOptions {
  /** Repository owner or organization account */
  owner: string;
  /** Repository name */
  repo: string;
  /** Pull request title */
  title: string;
  /** Pull request markdown description */
  body: string;
  /** The branch containing changes (e.g. jules/session-id) */
  head: string;
  /** The target branch to merge into (e.g. main) */
  base: string;
}

/**
 * Result returned by createGitHubPullRequest.
 */
export interface GitHubPRResult {
  /** True if PR creation was successful */
  success: boolean;
  /** Web URL of the created PR */
  url?: string;
  /** PR issue number */
  number?: number;
  /** Error message if creation failed */
  error?: string;
}

/**
 * Authenticated GitHub user information.
 */
export interface GitHubUserInfo {
  /** GitHub username handle */
  login: string;
  /** Display name if available */
  name?: string;
  /** Avatar image URL */
  avatarUrl?: string;
}

/**
 * Executes a GitHub CLI (gh) command synchronously and returns structured output.
 * Preserves cross-platform Windows command boundaries safely.
 *
 * @param args - Array of CLI arguments (e.g., ['pr', 'create', ...]).
 * @param cwd - Working directory for the process.
 * @returns Execution result with success boolean, stdout, and stderr.
 */
export function runGh(
  args: string[],
  cwd: string = process.cwd()
): GitExecutionResult {
  const resolvedCwd = path.resolve(cwd);
  let res = spawnSync('gh', args, { encoding: 'utf8', cwd: resolvedCwd });
  if (res.error && (res.error as any).code === 'ENOENT' && process.platform === 'win32') {
    const commonPaths = [
      'C:\\Program Files\\GitHub CLI\\gh.exe',
      path.join(process.env.LOCALAPPDATA || '', 'Programs\\GitHub CLI\\gh.exe')
    ];
    for (const binPath of commonPaths) {
      if (fs.existsSync(binPath)) {
        res = spawnSync(binPath, args, { encoding: 'utf8', cwd: resolvedCwd });
        break;
      }
    }
  }
  return {
    success: res.status === 0,
    stdout: res.stdout ? res.stdout.trim() : '',
    stderr: res.stderr ? res.stderr.trim() : ''
  };
}

/**
 * Retrieves the cached auth token from GitHub CLI (gh) if authenticated.
 *
 * @param cwd - Working directory context.
 * @returns Access token string or undefined if not authenticated in gh CLI.
 */
export function getGhCliToken(cwd: string = process.cwd()): string | undefined {
  const res = runGh(['auth', 'token'], cwd);
  if (res.success && res.stdout && !res.stdout.includes('error')) {
    return res.stdout.trim();
  }
  return undefined;
}

/**
 * Creates a GitHub Pull Request using the official GitHub REST API.
 * Uses native Node 18+ fetch without external dependencies.
 *
 * @param token - GitHub access token (OAuth or PAT).
 * @param options - Pull request configuration options.
 * @returns Result object with success flag and PR web URL.
 */
export async function createGitHubPullRequest(
  token: string,
  options: GitHubPRCreateOptions
): Promise<GitHubPRResult> {
  if (!token || !token.trim()) {
    return { success: false, error: 'GitHub access token is required.' };
  }

  const endpoint = `https://api.github.com/repos/${encodeURIComponent(options.owner)}/${encodeURIComponent(options.repo)}/pulls`;

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token.trim()}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'User-Agent': 'Jules-Companion'
      },
      body: JSON.stringify({
        title: options.title,
        body: options.body,
        head: options.head,
        base: options.base
      })
    });

    const data = await res.json() as any;

    if (res.ok && data?.html_url) {
      return {
        success: true,
        url: data.html_url,
        number: data.number
      };
    }

    const errorMsg = data?.message || (data?.errors && data.errors[0]?.message) || `HTTP ${res.status}`;
    return {
      success: false,
      error: errorMsg
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Network request failed'
    };
  }
}

/**
 * Queries GitHub REST API for an existing Pull Request associated with a branch.
 *
 * @param token - GitHub access token.
 * @param owner - Repository owner.
 * @param repo - Repository name.
 * @param headBranch - The branch to look up (e.g. jules/12345678).
 * @returns Found status, web URL, PR number, and PR state ('open' | 'closed' | 'merged').
 */
export async function getGitHubPullRequestForBranch(
  token: string,
  owner: string,
  repo: string,
  headBranch: string
): Promise<{ exists: boolean; url?: string; number?: number; state?: 'open' | 'closed' | 'merged' }> {
  if (!token) return { exists: false };

  const endpoint = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls?head=${encodeURIComponent(owner)}:${encodeURIComponent(headBranch)}&state=all`;

  try {
    const res = await fetch(endpoint, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token.trim()}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'Jules-Companion'
      }
    });

    if (!res.ok) return { exists: false };

    const pulls = await res.json() as any[];
    if (Array.isArray(pulls) && pulls.length > 0) {
      const pr = pulls[0];
      const state = pr.merged_at ? 'merged' : pr.state;
      return {
        exists: true,
        url: pr.html_url,
        number: pr.number,
        state
      };
    }
  } catch {
    // Ignore network error in background lookup
  }

  return { exists: false };
}

/**
 * Fetches authenticated user details from GitHub REST API.
 *
 * @param token - GitHub access token.
 * @returns User profile details or null if invalid token.
 */
export async function getGitHubUserInfo(token: string): Promise<GitHubUserInfo | null> {
  if (!token || !token.trim()) return null;

  try {
    const res = await fetch('https://api.github.com/user', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token.trim()}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'Jules-Companion'
      }
    });

    if (!res.ok) return null;

    const data = await res.json() as any;
    if (data?.login) {
      return {
        login: data.login,
        name: data.name,
        avatarUrl: data.avatar_url
      };
    }
  } catch {
    // Return null on failure
  }

  return null;
}
